import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
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
  private readonly logger = new Logger(OrdersService.name);

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
  ) {}

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
          throw new NotFoundException(
            `La reserva #${createOrderDto.reservationId} no existe o no te pertenece.`,
          );
        }

        if (reservation.status !== ReservationStatus.APPROVED) {
          throw new BadRequestException(
            'La reserva debe estar Aprobada para poder generar la orden de pago.',
          );
        }

        // Tomamos los datos de la reserva
        finalShippingAddress =
          finalShippingAddress ||
          reservation.venueAddress ||
          'Dirección no especificada';
        finalCity = finalCity || reservation.city || 'Ciudad no especificada';

        for (const resItem of reservation.items) {
          const product = resItem.product;

          if (product.isAvailable === false) {
            throw new BadRequestException(
              `El producto/servicio no está disponible actualmente: ${product.name}`,
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

        const productIds = createOrderDto.items.map((item) => item.productId);
        const products = await queryRunner.manager.find(Product, {
          where: { id: In(productIds) },
          lock: { mode: 'pessimistic_write' },
        });

        const productsMap = new Map(products.map((p) => [p.id, p]));

        for (const dtoItem of createOrderDto.items) {
          const product = productsMap.get(dtoItem.productId);

          if (!product) {
            throw new BadRequestException(
              `El producto con ID ${dtoItem.productId} no está disponible.`,
            );
          }
          if (product.isAvailable === false) {
            throw new BadRequestException(
              `El producto/servicio no está disponible actualmente: ${product.name}`,
            );
          }

          totalAmount += Number(product.price) * dtoItem.quantity;

          const orderItem = queryRunner.manager.create(OrderItem, {
            productId: product.id,
            quantity: dtoItem.quantity,
            price: product.price,
          });
          orderItems.push(orderItem);
        }
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

      const cart = await this.cartService.findOrCreateCart(userId);
      if (cart) {
        await queryRunner.manager.query(
          `DELETE FROM cart_items WHERE "cartId" = $1`,
          [cart.id],
        );
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        orderId: savedOrder.id,
        message: 'Orden generada. Pendiente de pago.',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al procesar la orden: ' + (error as Error).message,
      );
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
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(
        `La orden #${orderId} no existe o no te pertenece.`,
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Esta orden ya fue procesada. Estado actual: ${order.status}`,
      );
    }

    if (Number(order.totalAmount) !== Number(amount)) {
      throw new BadRequestException(
        'El monto enviado no coincide con el total de la orden.',
      );
    }

    const customerEmail = email || order.user.email;

    // ====================================================================
    // PASO 1: Cobro con Culqi (Único punto donde un fallo es HTTP 400 / FAILED)
    // ====================================================================
    let chargeId: string;
    try {
      chargeId = await this.culqiService.createCharge(
        Number(order.totalAmount),
        customerEmail,
        tokenId,
      );
    } catch (culqiError: any) {
      await this.orderRepository.update(order.id, {
        status: OrderStatus.FAILED,
      });
      throw new BadRequestException(
        culqiError.message || 'La pasarela de pagos rechazó la transacción.',
      );
    }

    // ====================================================================
    // PASO 2: Post-Procesamiento (El dinero YA fue cobrado en Culqi)
    // ====================================================================
    try {
      // 1. Actualización directa del estado en BD (evita problemas de cascadas/hooks de save)
      await this.orderRepository.update(order.id, {
        status: OrderStatus.PAID,
      });

      // 2. Si la orden provino de una reserva, actualizar estado a FULLY_PAID
      if (order.reservationId) {
        await this.reservationRepository.update(order.reservationId, {
          status: ReservationStatus.FULLY_PAID,
        });
      }

      // 3. Envío de correo protegido (no debe abortar la transacción si falla SMTP)
      try {
        await this.mailService.sendOrderConfirmation(
          customerEmail,
          order.id,
          order.totalAmount,
        );
      } catch (mailError: any) {
        this.logger.warn(
          `Pago procesado exitosamente pero falló el envío de correo para la orden #${order.id}: ${mailError?.message || mailError}`,
        );
      }

      return {
        success: true,
        message: 'Pago procesado exitosamente',
        chargeId,
        orderId: order.id,
        status: OrderStatus.PAID,
      };
    } catch (dbError: any) {
      this.logger.error(
        `ALERTA CRÍTICA: Cobro exitoso en Culqi (Charge ID: ${chargeId}) pero falló la actualización en BD para orden #${order.id}. Error: ${dbError.message}`,
        dbError.stack,
      );

      throw new InternalServerErrorException(
        `El pago fue procesado exitosamente por Culqi (ID: ${chargeId}), pero ocurrió un error al confirmar la orden en el sistema. Por favor contacte a soporte con este identificador.`,
      );
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
        fullName: user
          ? user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
          : 'No disponible',
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
              name: (item.product as any)?.name || 'Producto no disponible',
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
    const order = await this.orderRepository.preload({
      id,
      ...updateOrderDto,
    });

    if (!order) throw new NotFoundException(`La orden #${id} no existe.`);
    return await this.orderRepository.save(order);
  }
}
