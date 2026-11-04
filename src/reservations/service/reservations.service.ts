import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { instanceToPlain } from 'class-transformer';
import { Reservation } from '../entities/reservation.entity';
import { ReservationItem } from '../entities/reservation-item.entity';
import { Product } from '../../products/entities/product.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationStatus } from '../enums/reservations.enums';
import { PromotionsService } from '../../promotions/services/promotions.service';
import { SettingsService } from '../../settings/settings.service';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order.enums';
import { PaymentAttempt } from '../../payments/entities/payment-attempt.entity';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly promotions: PromotionsService,
    private readonly settings: SettingsService,
  ) {}
  async createReservation(userId: number, dto: CreateReservationDto) {
    if (
      !dto.items.length ||
      dto.items.some((i) => !Number.isInteger(i.quantity) || i.quantity < 1) ||
      dto.guestsCount < 1
    )
      throw new BadRequestException('Cantidades invalidas');
    if (new Set(dto.items.map((i) => i.productId)).size !== dto.items.length)
      throw new BadRequestException('Agrupa los productos repetidos');
    return this.dataSource.transaction(async (manager) => {
      const products = await manager.find(Product, {
        where: { id: In(dto.items.map((i) => i.productId)) },
        relations: ['category'],
      });
      let subtotalCents = 0;
      const items: ReservationItem[] = [];
      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product || !product.isActive || !product.isAvailable)
          throw new BadRequestException('Producto no disponible');
        const promotion = await this.promotions.findActivePromotionForProduct(
          product.id,
          product.category?.id,
          manager,
        );
        const price = promotion
          ? this.promotions.calculateDiscountedPrice(
              Number(product.price),
              promotion,
              item.quantity,
            )
          : Number(product.price);
        subtotalCents += Math.round(price * 100) * item.quantity;
        items.push(
          manager.create(ReservationItem, {
            productId: product.id,
            quantity: item.quantity,
            price,
          }),
        );
      }
      const totals = await this.settings.totals(subtotalCents / 100, manager);
      if (totals.subtotal < totals.minimum)
        throw new BadRequestException('No se cumple el monto minimo');
      const reservation = manager.create(Reservation, {
        userId,
        eventDate: new Date(dto.eventDate),
        serviceStartTime: dto.serviceStartTime,
        guestsCount: dto.guestsCount,
        venueAddress: dto.venueAddress,
        city: dto.city,
        additionalNotes: dto.additionalNotes,
        totalAmount: totals.total,
        status: ReservationStatus.PENDING_REVIEW,
        items,
        termsAcceptedAt: dto.acceptedTerms ? new Date() : undefined,
        privacyAcceptedAt: dto.acceptedPrivacy ? new Date() : undefined,
      });
      return manager.save(reservation);
    });
  }
  findAll(userId: number): Promise<Reservation[]> {
    return this.dataSource.getRepository(Reservation).find({
      where: { userId },
      relations: ['items'],
      order: { id: 'DESC' },
      take: 100,
    });
  }
  async findAllAdmin(status?: string, page = 1, limit = 10) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new BadRequestException('Paginacion invalida');
    if (
      status &&
      status !== 'active' &&
      !Object.values(ReservationStatus).includes(status as ReservationStatus)
    )
      throw new BadRequestException('Estado invalido');
    const where =
      status === 'active'
        ? {
            status: In([
              ReservationStatus.PENDING_REVIEW,
              ReservationStatus.APPROVED,
              ReservationStatus.FULLY_PAID,
            ]),
          }
        : status
          ? { status: status as ReservationStatus }
          : {};
    const [reservations, total] = await this.dataSource
      .getRepository(Reservation)
      .findAndCount({
        where,
        relations: ['items', 'user', 'orders'],
        order: { id: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    const data = reservations.map((res) => ({
      ...instanceToPlain(res),
      phone:
        res.user?.phone ||
        res.orders?.find((order) => order.phone)?.phone ||
        null,
    }));
    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }
  async update(id: number, dto: UpdateReservationDto) {
    return this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!reservation) throw new NotFoundException('Reserva no encontrada');
      if (reservation.status === dto.status) return reservation;
      const transitions: Record<ReservationStatus, ReservationStatus[]> = {
        [ReservationStatus.PENDING_REVIEW]: [
          ReservationStatus.APPROVED,
          ReservationStatus.CANCELLED,
        ],
        [ReservationStatus.APPROVED]: [ReservationStatus.CANCELLED],
        [ReservationStatus.FULLY_PAID]: [ReservationStatus.COMPLETED],
        [ReservationStatus.COMPLETED]: [],
        [ReservationStatus.CANCELLED]: [],
      };
      if (!transitions[reservation.status].includes(dto.status))
        throw new BadRequestException(
          'Transicion de reserva no permitida. El pago se confirma desde la pasarela.',
        );
      const orders = await manager.find(Order, {
        where: { reservationId: id },
      });
      if (orders.length) {
        const pending = await manager.findOne(PaymentAttempt, {
          where: { orderId: In(orders.map((o) => o.id)), status: 'processing' },
        });
        if (pending)
          throw new BadRequestException(
            'Existe un pago pendiente de conciliacion',
          );
      }
      if (dto.status === ReservationStatus.CANCELLED) {
        if (
          orders.some((o) =>
            [
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
            ].includes(o.status),
          )
        )
          throw new BadRequestException(
            'La reserva pagada requiere un reembolso',
          );
        await manager.update(
          Order,
          {
            reservationId: id,
            status: In([OrderStatus.PENDING, OrderStatus.FAILED]),
          },
          { status: OrderStatus.CANCELLED },
        );
      }
      reservation.status = dto.status;
      return manager.save(reservation);
    });
  }
  async remove(id: number) {
    // Preserve reservation history rather than physically deleting financial records.
    await this.update(id, { status: ReservationStatus.CANCELLED });
    return { message: 'Reserva cancelada; historial conservado' };
  }
  approveReservation(id: number) {
    return this.update(id, { status: ReservationStatus.APPROVED });
  }
}
