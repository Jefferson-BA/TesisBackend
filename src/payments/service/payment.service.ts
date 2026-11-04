import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, In, LessThan } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order.enums';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ReservationStatus } from '../../reservations/enums/reservations.enums';
import { PayOrderDto } from '../../orders/dto/pay-order.dto';
import { PaymentAttempt } from '../entities/payment-attempt.entity';
import {
  CulqiCharge,
  CulqiDeclinedChargeException,
  CulqiService,
} from './culqi.service';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class PaymentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentService.name);
  private timer?: ReturnType<typeof setInterval>;
  private reconciling = false;
  constructor(
    private readonly dataSource: DataSource,
    private readonly culqi: CulqiService,
    private readonly mail: MailService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.reconcilePending();
    }, 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async status(orderId: number, userId: number) {
    const order = await this.dataSource
      .getRepository(Order)
      .findOneBy({ id: orderId, userId });
    if (!order) throw new NotFoundException('Orden no encontrada');
    const attempt = await this.dataSource
      .getRepository(PaymentAttempt)
      .findOne({ where: { orderId }, order: { createdAt: 'DESC' } });
    return {
      orderId,
      orderStatus: order.status,
      paymentStatus: attempt?.status || 'not_started',
      chargeId: order.chargeId || null,
    };
  }

  async pay(orderId: number, userId: number, dto: PayOrderDto) {
    await this.culqi.ensureConfigured();
    const claimed = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, userId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Orden no encontrada');
      if (![OrderStatus.PENDING, OrderStatus.FAILED].includes(order.status))
        throw new BadRequestException('La orden ya fue procesada');
      if (
        Math.round(Number(dto.amount) * 100) !==
        Math.round(Number(order.totalAmount) * 100)
      )
        throw new BadRequestException('El monto no coincide con la orden');
      const existing = await manager.findOne(PaymentAttempt, {
        where: { orderId, status: In(['processing', 'succeeded']) },
      });
      if (existing)
        throw new ConflictException(
          'El pago ya fue iniciado. Consulta su estado; no repitas el cobro.',
        );
      if (order.reservationId) {
        const reservation = await manager.findOne(Reservation, {
          where: { id: order.reservationId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!reservation || reservation.status !== ReservationStatus.APPROVED)
          throw new BadRequestException('La reserva no admite pagos');
      }
      const user = await manager.findOneOrFail(Order, {
        where: { id: orderId },
        relations: ['user'],
      });
      return manager.save(
        PaymentAttempt,
        manager.create(PaymentAttempt, {
          orderId,
          amountCents: Math.round(Number(order.totalAmount) * 100),
          email: dto.email || user.user.email,
          status: 'processing',
        }),
      );
    });
    let chargeId: string;
    try {
      chargeId = await this.culqi.createCharge(
        claimed.amountCents / 100,
        claimed.email,
        dto.tokenId,
        { order_id: String(orderId), payment_attempt_id: claimed.id },
      );
    } catch (error) {
      if (error instanceof CulqiDeclinedChargeException) {
        this.verifyCharge(claimed, error.charge);
        await this.dataSource.getRepository(PaymentAttempt).update(claimed.id, {
          status: 'failed',
          chargeId: error.charge.id,
        });
        throw error;
      }
      if (error instanceof BadRequestException) {
        await this.dataSource
          .getRepository(PaymentAttempt)
          .update(claimed.id, { status: 'failed' });
      }
      // Timeouts remain processing; another token must not create a second charge.
      throw error;
    }
    try {
      await this.dataSource
        .getRepository(PaymentAttempt)
        .update(claimed.id, { chargeId });
      await this.finalize(claimed.id, chargeId);
    } catch {
      this.logger.error(
        `Confirmacion pendiente de conciliacion: orden ${orderId}, cargo ${chargeId}`,
      );
      throw new ServiceUnavailableException(
        'El cobro requiere conciliacion. No vuelvas a pagar; consulta el estado de la orden.',
      );
    }
    return {
      success: true,
      orderId,
      chargeId,
      status: OrderStatus.PAID,
      message: 'Pago procesado exitosamente',
    };
  }
  private async finalize(attemptId: string, chargeId: string) {
    const result = await this.dataSource.transaction(async (manager) => {
      const initial = await manager.findOneByOrFail(PaymentAttempt, {
        id: attemptId,
      });
      const order = await manager.findOneOrFail(Order, {
        where: { id: initial.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      const attempt = await manager.findOneOrFail(PaymentAttempt, {
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });
      if (attempt.status === 'succeeded') return undefined;
      if (
        attempt.status !== 'processing' ||
        ![OrderStatus.PENDING, OrderStatus.FAILED].includes(order.status)
      )
        throw new ConflictException('La orden requiere revision financiera');
      if (Math.round(Number(order.totalAmount) * 100) !== attempt.amountCents)
        throw new ConflictException('El monto de la orden cambio');
      await manager.update(Order, order.id, {
        status: OrderStatus.PAID,
        chargeId,
      });
      if (order.reservationId)
        await manager.update(Reservation, order.reservationId, {
          status: ReservationStatus.FULLY_PAID,
        });
      await manager.update(PaymentAttempt, attempt.id, {
        status: 'succeeded',
        chargeId,
      });
      return {
        email: attempt.email,
        orderId: order.id,
        amount: attempt.amountCents / 100,
      };
    });
    if (result) {
      try {
        await this.mail.sendOrderConfirmation(
          result.email,
          result.orderId,
          result.amount,
        );
      } catch {
        this.logger.warn(`No se pudo enviar correo de orden ${result.orderId}`);
      }
    }
  }
  private async reconcileAttempt(attempt: PaymentAttempt) {
    let charge: CulqiCharge | undefined;
    try {
      charge = attempt.chargeId
        ? await this.culqi.getCharge(attempt.chargeId)
        : await this.culqi.findCharge(attempt.id, attempt.createdAt);
    } catch (error) {
      if (!(error instanceof CulqiDeclinedChargeException)) throw error;
      this.verifyCharge(attempt, error.charge);
      await this.dataSource.getRepository(PaymentAttempt).update(attempt.id, {
        status: 'failed',
        chargeId: error.charge.id,
      });
      return;
    }
    if (!charge) return;
    this.verifyCharge(attempt, charge);
    await this.finalize(attempt.id, charge.id);
  }
  private verifyCharge(attempt: PaymentAttempt, charge: CulqiCharge) {
    if (
      charge.metadata?.payment_attempt_id !== attempt.id ||
      charge.metadata?.order_id !== String(attempt.orderId) ||
      charge.amount !== attempt.amountCents ||
      charge.currency_code !== 'PEN'
    )
      throw new ConflictException('El cargo no corresponde al intento de pago');
  }
  async reconcilePending() {
    if (this.reconciling) return;
    this.reconciling = true;
    try {
      const attempts = await this.dataSource
        .getRepository(PaymentAttempt)
        .find({
          where: {
            status: 'processing',
            createdAt: LessThan(new Date(Date.now() - 60_000)),
          },
          take: 50,
          order: { updatedAt: 'ASC' },
        });
      for (const attempt of attempts) {
        try {
          await this.reconcileAttempt(attempt);
        } catch {
          this.logger.warn(
            `Conciliacion pendiente para orden ${attempt.orderId}`,
          );
        }
        await this.dataSource
          .getRepository(PaymentAttempt)
          .update(attempt.id, { updatedAt: new Date() });
      }
    } catch {
      this.logger.warn('No se pudo ejecutar conciliacion de pagos');
    } finally {
      this.reconciling = false;
    }
  }
}
