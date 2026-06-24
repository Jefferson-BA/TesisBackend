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

import { MailService } from '../../mail/mail.service';
import { CartService } from '../../cart/service/cart.service';
import { OrderStatus, PaymentMethod } from '../enums/order.enums';
import { CulqiService } from '../../payments/service/culqi.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly cartService: CartService,
    private readonly culqiService: CulqiService,
  ) { }


  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      let finalShippingAddress = createOrderDto.shippingAddress;
      let finalCity = createOrderDto.city;

      // 🌟 ESCENARIO A: Creación desde una RESERVA (Single Source of Truth)
      if (createOrderDto.reservationId) {
        const reservation = await this.reservationRepository.findOne({
          where: { id: createOrderDto.reservationId, userId },
          relations: ['items', 'items.product'],
        });

        if (!reservation) {
          throw new NotFoundException(`La reserva #${createOrderDto.reservationId} no existe o no te pertenece.`);
        }

        if (reservation.status !== ReservationStatus.APPROVED) {
          throw new BadRequestException('La reserva debe estar Aprobada para poder generar la orden de pago.');
        }

        // Tomamos los datos de la reserva
        finalShippingAddress = finalShippingAddress || reservation.venueAddress || 'Dirección no especificada';
        finalCity = finalCity || reservation.city || 'Ciudad no especificada';

        for (const resItem of reservation.items) {
          const product = resItem.product;

          if (product.stock < resItem.quantity) {
            throw new BadRequestException(`No hay suficiente stock para: ${product.name}`);
          }

          product.stock -= resItem.quantity;
          await queryRunner.manager.save(Product, product);

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
          throw new BadRequestException('No se enviaron productos para crear la orden.');
        }
        if (!finalShippingAddress) {
          throw new BadRequestException('La dirección de envío es obligatoria para órdenes directas.');
        }

        const productIds = createOrderDto.items.map((item) => item.productId);
        const products = await queryRunner.manager.find(Product, {
          where: { id: In(productIds) },
          lock: { mode: 'pessimistic_write' },
        });

        const productsMap = new Map(products.map((p) => [p.id, p]));

        for (const dtoItem of createOrderDto.items) {
          const product = productsMap.get(dtoItem.productId);

          if (!product) {
            throw new BadRequestException(`El producto con ID ${dtoItem.productId} no está disponible.`);
          }
          if (product.stock < dtoItem.quantity) {
            throw new BadRequestException(`No hay suficiente stock para: ${product.name}`);
          }

          totalAmount += Number(product.price) * dtoItem.quantity;
          product.stock -= dtoItem.quantity;

          const orderItem = queryRunner.manager.create(OrderItem, {
            productId: product.id,
            quantity: dtoItem.quantity,
            price: product.price,
          });
          orderItems.push(orderItem);
        }
        await queryRunner.manager.save(Product, products);
      }

      const newOrder = queryRunner.manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: finalShippingAddress,
        city: finalCity,
        postalCode: createOrderDto.postalCode,
        phone: createOrderDto.phone,
        paymentMethod: createOrderDto.paymentMethod || ('card' as PaymentMethod),
        reservationId: createOrderDto.reservationId,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, newOrder);

      const cart = await this.cartService.findOrCreateCart(userId);
      if (cart) {
        await queryRunner.manager.query(`DELETE FROM cart_items WHERE "cartId" = $1`, [cart.id]);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        orderId: savedOrder.id,
        message: 'Orden generada. Pendiente de pago.',
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la orden: ' + (error as Error).message);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 💳 PASO 2: PROCESAR EL PAGO (Culqi)
   */
  async payOrder(orderId: number, userId: number, payOrderDto: PayOrderDto) {
    const { tokenId, amount, email } = payOrderDto;

    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['user']
    });

    if (!order) {
      throw new NotFoundException(`La orden #${orderId} no existe o no te pertenece.`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Esta orden ya fue procesada. Estado actual: ${order.status}`);
    }

    if (Number(order.totalAmount) !== Number(amount)) {
      throw new BadRequestException('El monto enviado no coincide con el total de la orden.');
    }

    const customerEmail = email || order.user.email;

    try {
      const chargeId = await this.culqiService.createCharge(
        Number(order.totalAmount), 
        customerEmail,
        tokenId
      );

      // 1. Guardamos la orden como pagada
      order.status = OrderStatus.PAID as any;
      await this.orderRepository.save(order);

      // 2. Enviamos el correo
      this.mailService.sendOrderConfirmation(
        customerEmail,
        order.id,
        order.totalAmount,
      );

      // 3. Actualizamos la Reserva asociada
      if (order.reservationId) {
        await this.reservationRepository.update(
          order.reservationId,
          { status: ReservationStatus.FULLY_PAID }
        );
      }

      return {
        success: true,
        message: 'Pago procesado exitosamente',
        chargeId,
        orderId: order.id,
        status: order.status
      };

    } catch (error: any) {
      order.status = OrderStatus.FAILED as any;
      await this.orderRepository.save(order);
      throw new BadRequestException(error.message || 'La pasarela de pagos rechazó la transacción.');
    }
  }

  async findAll(userId: number, reservationId?: number) {
    const whereClause: any = {};
    if (reservationId) {
      whereClause.reservationId = reservationId;
    } else {
      whereClause.userId = userId;
    }

    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['user', 'reservation', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    return orders.map((order) => {
      const user = order.user as any;
      const reservation = order.reservation as any;

      return {
        id: order.id,
        fullName: user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'No disponible',
        email: user?.email || 'No disponible',
        phone: user?.phone || 'No disponible',
        city: reservation?.city || order.city || 'No disponible',
        address: reservation?.venueAddress || order.shippingAddress || 'No disponible',
        postalCode: order.postalCode || 'No disponible',
        eventDate: reservation?.eventDate || 'No disponible',
        notes: reservation?.additionalNotes || 'Sin notas',
        total: Number(order.totalAmount || 0),
        paymentMethod: order.paymentMethod || 'No especificado',
        status: order.status || 'Pendiente',

        items: order.items ? order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: (item.product as any)?.name || 'Producto no disponible',
          price: Number(item.price || 0),
          quantity: item.quantity,
          subtotal: Number(item.price || 0) * item.quantity,
        })) : [],
      };
    });
  }

  async findOne(id: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`La orden #${id} no existe o no te pertenece.`);
    }
    return order;
  }

  async updateStatus(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderRepository.preload({
      id,
      ...updateOrderDto,
    });

    if (!order) throw new NotFoundException(`La orden #${id} no existe.`);
    return await this.orderRepository.save(order);
  }
}