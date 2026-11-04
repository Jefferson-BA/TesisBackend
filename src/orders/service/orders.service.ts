import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';

import { PayOrderDto } from '../dto/pay-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { Order } from '../entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ReservationStatus } from '../../reservations/enums/reservations.enums';

import { OrderStatus, PaymentMethod } from '../enums/order.enums';
import { PaymentService } from '../../payments/service/payment.service';
import { PromotionsService } from '../../promotions/services/promotions.service';
import { SettingsService } from '../../settings/settings.service';
import { PaymentAttempt } from '../../payments/entities/payment-attempt.entity';
import { Cart } from '../../cart/entities/cart.entity';
import { CartItem } from '../../cart/entities/cart-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly paymentService: PaymentService,
    private readonly promotionsService: PromotionsService,
    private readonly settings: SettingsService,
  ) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      let finalShippingAddress = createOrderDto.shippingAddress;
      let finalCity = createOrderDto.city;

      // 🌟 ESCENARIO A: Creación desde una RESERVA (Single Source of Truth)
      if (createOrderDto.reservationId) {
        const reservation = await queryRunner.manager.findOne(Reservation, {
          where: { id: createOrderDto.reservationId, userId },
          relations: ['items', 'items.product'],
          lock: { mode: 'pessimistic_write', tables: ['reservations'] },
        });

        if (!reservation) {
          throw new NotFoundException(
            `La reserva #${createOrderDto.reservationId} no existe o no te pertenece.`,
          );
        }

        if (reservation.status !== ReservationStatus.APPROVED) {
          throw new BadRequestException(
            'La reserva debe estar Aprobada para poder generar la orden de pago.',
          );
        }

        const existingOrder = await queryRunner.manager.findOne(Order, {
          where: {
            reservationId: reservation.id,
            status: In([
              OrderStatus.PENDING,
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ]),
          },
        });
        if (existingOrder)
          throw new BadRequestException(
            'La reserva ya tiene una orden vigente',
          );

        // Tomamos los datos de la reserva
        finalShippingAddress =
          finalShippingAddress ||
          reservation.venueAddress ||
          'Dirección no especificada';
        finalCity = finalCity || reservation.city || 'Ciudad no especificada';

        for (const resItem of reservation.items) {
          const product = resItem.product;

          if (!product || !product.isActive || product.isAvailable === false) {
            throw new BadRequestException(
              `El producto/servicio no está disponible actualmente: ${product?.name || 'no disponible'}`,
            );
          }

          totalAmount += Number(resItem.price) * resItem.quantity;

          const orderItem = queryRunner.manager.create(OrderItem, {
            productId: product.id,
            quantity: resItem.quantity,
            price: resItem.price,
          });
          orderItems.push(orderItem);
        }
      }
      // 🛒 ESCENARIO B: Creación desde el CARRITO normal (Sin reserva)
      else {
        if (!createOrderDto.items || createOrderDto.items.length === 0) {
          throw new BadRequestException(
            'No se enviaron productos para crear la orden.',
          );
        }
        if (!finalShippingAddress) {
          throw new BadRequestException(
            'La dirección de envío es obligatoria para órdenes directas.',
          );
        }

        if (
          new Set(createOrderDto.items.map((item) => item.productId)).size !==
          createOrderDto.items.length
        )
          throw new BadRequestException(
            'Agrupa los productos repetidos en una sola linea',
          );
        const productIds = createOrderDto.items.map((item) => item.productId);
        const products = await queryRunner.manager.find(Product, {
          where: { id: In(productIds) },
          relations: ['category'],
          lock: { mode: 'pessimistic_write', tables: ['products'] },
        });

        const productsMap = new Map(products.map((p) => [p.id, p]));

        for (const dtoItem of createOrderDto.items) {
          const product = productsMap.get(dtoItem.productId);

          if (!product) {
            throw new BadRequestException(
              `El producto con ID ${dtoItem.productId} no está disponible.`,
            );
          }
          if (!product || !product.isActive || product.isAvailable === false) {
            throw new BadRequestException(
              `El producto/servicio no está disponible actualmente: ${product?.name || 'no disponible'}`,
            );
          }

          const promotion =
            await this.promotionsService.findActivePromotionForProduct(
              product.id,
              product.category?.id,
              queryRunner.manager,
            );
          const price = promotion
            ? this.promotionsService.calculateDiscountedPrice(
                Number(product.price),
                promotion,
                dtoItem.quantity,
              )
            : Number(product.price);
          totalAmount += (Math.round(price * 100) * dtoItem.quantity) / 100;

          const orderItem = queryRunner.manager.create(OrderItem, {
            productId: product.id,
            quantity: dtoItem.quantity,
            price,
          });
          orderItems.push(orderItem);
        }
      }

      if (createOrderDto.reservationId) {
        const reservation = await queryRunner.manager.findOneByOrFail(
          Reservation,
          { id: createOrderDto.reservationId },
        );
        totalAmount = Number(reservation.totalAmount);
      } else {
        const totals = await this.settings.totals(
          totalAmount,
          queryRunner.manager,
        );
        if (totals.subtotal < totals.minimum)
          throw new BadRequestException(
            'No se cumple el monto minimo del pedido',
          );
        totalAmount = totals.total;
      }
      const newOrder = queryRunner.manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: finalShippingAddress,
        city: finalCity,
        postalCode: createOrderDto.postalCode,
        phone: createOrderDto.phone,
        paymentMethod:
          createOrderDto.paymentMethod || ('card' as PaymentMethod),
        reservationId: createOrderDto.reservationId,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, newOrder);

      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
      });
      if (cart && !createOrderDto.reservationId)
        await queryRunner.manager.delete(CartItem, { cart: { id: cart.id } });

      await queryRunner.commitTransaction();

      return {
        success: true,
        orderId: savedOrder.id,
        totalAmount: savedOrder.totalAmount,
        message: 'Orden generada. Pendiente de pago.',
      };
    } catch (error) {
      if (queryRunner.isTransactionActive)
        await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('No se pudo procesar la orden');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 💳 PASO 2: PROCESAR EL PAGO (Culqi)
   */
  async payOrder(orderId: number, userId: number, payOrderDto: PayOrderDto) {
    return this.paymentService.pay(orderId, userId, payOrderDto);
  }

  paymentStatus(orderId: number, userId: number) {
    return this.paymentService.status(orderId, userId);
  }

  async findAll(userId: number, reservationId?: number) {
    const whereClause: { userId: number; reservationId?: number } = { userId };
    if (reservationId) {
      whereClause.reservationId = reservationId;
    }

    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['user', 'reservation', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => {
      const user = order.user;
      const reservation = order.reservation;

      return {
        id: order.id,
        fullName: user?.name || 'No disponible',
        email: user?.email || 'No disponible',
        phone: user?.phone || 'No disponible',
        city: reservation?.city || order.city || 'No disponible',
        address:
          reservation?.venueAddress || order.shippingAddress || 'No disponible',
        postalCode: order.postalCode || 'No disponible',
        eventDate: reservation?.eventDate || 'No disponible',
        notes: reservation?.additionalNotes || 'Sin notas',
        total: Number(order.totalAmount || 0),
        paymentMethod: order.paymentMethod || 'No especificado',
        status: order.status || 'Pendiente',

        items: order.items
          ? order.items.map((item) => ({
              id: item.id,
              productId: item.productId,
              name: item.product?.name || 'Producto no disponible',
              price: Number(item.price || 0),
              quantity: item.quantity,
              subtotal: Number(item.price || 0) * item.quantity,
            }))
          : [],
      };
    });
  }

  async findOne(id: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(
        `La orden #${id} no existe o no te pertenece.`,
      );
    }
    return order;
  }

  async updateStatus(id: number, updateOrderDto: UpdateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Orden no encontrada');
      if (order.status === updateOrderDto.status) return order;
      const transitions: Record<OrderStatus, OrderStatus[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CANCELLED],
        [OrderStatus.FAILED]: [OrderStatus.CANCELLED],
        [OrderStatus.PAID]: [OrderStatus.SHIPPED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
      };
      if (!transitions[order.status].includes(updateOrderDto.status))
        throw new BadRequestException(
          'Transicion de estado no permitida. Los pagos y reembolsos usan su propio flujo.',
        );
      const payment = await manager.findOne(PaymentAttempt, {
        where: { orderId: id, status: 'processing' },
      });
      if (payment)
        throw new BadRequestException('Hay un pago en proceso de confirmacion');
      order.status = updateOrderDto.status;
      return manager.save(order);
    });
  }
}
