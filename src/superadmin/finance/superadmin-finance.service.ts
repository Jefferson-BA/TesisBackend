import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Order } from '../../orders/entities/order.entity';
import { OrderStatus, PaymentMethod } from '../../orders/enums/order.enums';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ReservationStatus } from '../../reservations/enums/reservations.enums';
import { User } from '../../users/entities/user.entity';
import { CulqiService } from '../../payments/service/culqi.service';
import { SuperadminAuditService } from '../audit/superadmin-audit.service';
import { AuditAction } from '../entities/audit-log.entity';
import { ClientInfo } from '../common/utils/client-info.util';

import { ForceCancelOrderDto } from './dto/force-cancel-order.dto';
import { CulqiRefundDto } from './dto/culqi-refund.dto';
import { AdjustOrderAmountDto } from './dto/adjust-order-amount.dto';
import { FinancialReportQueryDto } from './dto/financial-report-query.dto';

@Injectable()
export class SuperadminFinanceService {
  private readonly logger = new Logger(SuperadminFinanceService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly culqiService: CulqiService,
    private readonly auditService: SuperadminAuditService,
  ) {}

  /**
   * 🔐 CONFIRMACIÓN DE CONTRASEÑA DE SUPERADMIN
   */
  private async verifySuperadminPassword(
    superadminId: number,
    providedPassword: string,
  ): Promise<User> {
    const superadmin = await this.userRepository.findOne({
      where: { id: superadminId },
      relations: ['role'],
    });

    if (!superadmin) {
      throw new NotFoundException('Superadmin no encontrado en el sistema.');
    }

    const isValid = await bcrypt.compare(providedPassword, superadmin.password);
    if (!isValid) {
      throw new ForbiddenException(
        'Contraseña de superadmin incorrecta. Operación financiera rechazada.',
      );
    }

    return superadmin;
  }

  /**
   * 🛑 ANULACIÓN FORZADA DE ÓRDENES PAGADAS
   */
  async forceCancelOrder(
    orderId: number,
    superadminId: number,
    dto: ForceCancelOrderDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.verifySuperadminPassword(
      superadminId,
      dto.superadminPassword,
    );

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'reservation'],
    });

    if (!order) {
      throw new NotFoundException(`La orden #${orderId} no existe.`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`La orden #${orderId} ya se encuentra anulada.`);
    }

    const previousStatus = order.status;
    let culqiRefundData: any = null;

    // Si se solicitó devolución automática con Culqi y existe chargeId
    if (dto.refundWithCulqi) {
      if (!order.chargeId) {
        throw new BadRequestException(
          `La orden #${orderId} no registra un ID de cobro de Culqi (chargeId). Por favor use la opción de reembolso manual indicando el chargeId.`,
        );
      }

      culqiRefundData = await this.culqiService.createRefund(
        order.chargeId,
        Number(order.totalAmount),
        dto.reason,
      );
    }

    // Actualizar estado de la orden
    order.status = OrderStatus.CANCELLED;
    const updatedOrder = await this.orderRepository.save(order);

    // Si la orden estaba vinculada a una reserva, anular también la reserva para liberar disponibilidad
    if (order.reservationId) {
      await this.reservationRepository.update(order.reservationId, {
        status: ReservationStatus.CANCELLED,
      });
    }

    // Registrar en auditoría
    await this.auditService.logAction({
      action: AuditAction.ORDER_FORCE_CANCELLED,
      entity: 'Order',
      entityId: order.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        orderId: order.id,
        orderTotal: order.totalAmount,
        customerEmail: order.user?.email,
        previousStatus,
        newStatus: OrderStatus.CANCELLED,
        reason: dto.reason,
        refundWithCulqi: !!dto.refundWithCulqi,
        culqiRefundData,
      },
    });

    return {
      success: true,
      message: `La orden #${orderId} ha sido anulada forzosamente por el superadmin.`,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        totalAmount: updatedOrder.totalAmount,
      },
      refund: culqiRefundData,
    };
  }

  /**
   * 💸 DEVOLUCIÓN INTEGRADA CON CULQI (Refund Total o Parcial)
   */
  async processCulqiRefund(
    orderId: number,
    superadminId: number,
    dto: CulqiRefundDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.verifySuperadminPassword(
      superadminId,
      dto.superadminPassword,
    );

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(`La orden #${orderId} no existe.`);
    }

    const chargeId = dto.chargeId || order.chargeId;
    if (!chargeId) {
      throw new BadRequestException(
        `No se encontró identificador de cargo Culqi (chargeId) en la orden #${orderId}. Debes especificar el 'chargeId' en la petición.`,
      );
    }

    const refundAmount = dto.amount !== undefined ? Number(dto.amount) : Number(order.totalAmount);

    if (refundAmount > Number(order.totalAmount)) {
      throw new BadRequestException(
        `El monto a reembolsar (S/ ${refundAmount}) no puede ser mayor al total de la orden (S/ ${order.totalAmount}).`,
      );
    }

    // Ejecutar llamada a API de Culqi v2
    const culqiResponse = await this.culqiService.createRefund(
      chargeId,
      refundAmount,
      dto.reason || 'solicitud_comprador',
    );

    // Si el reembolso es por el monto total, actualizar orden a CANCELLED
    const isFullRefund = refundAmount >= Number(order.totalAmount);
    if (isFullRefund) {
      order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(order);
    }

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.CULQI_REFUND_PROCESSED,
      entity: 'Order',
      entityId: order.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        orderId: order.id,
        chargeId: chargeId,
        refundId: culqiResponse?.id,
        refundAmount: refundAmount,
        orderTotal: order.totalAmount,
        isFullRefund,
        reason: dto.reason,
        culqiResponse,
      },
    });

    return {
      success: true,
      message: `Reembolso por S/ ${refundAmount.toFixed(2)} procesado exitosamente en Culqi.`,
      refundId: culqiResponse?.id,
      isFullRefund,
      orderStatus: order.status,
      culqiData: culqiResponse,
    };
  }

  /**
   * ⚖️ REAJUSTE DE MONTOS POR RECLAMOS
   */
  async adjustOrderAmount(
    orderId: number,
    superadminId: number,
    dto: AdjustOrderAmountDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.verifySuperadminPassword(
      superadminId,
      dto.superadminPassword,
    );

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user'],
    });

    if (!order) {
      throw new NotFoundException(`La orden #${orderId} no existe.`);
    }

    const previousAmount = Number(order.totalAmount);
    const newAmount = Number(dto.newTotalAmount);
    const difference = newAmount - previousAmount;

    order.totalAmount = newAmount;
    const updatedOrder = await this.orderRepository.save(order);

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.ORDER_AMOUNT_ADJUSTED,
      entity: 'Order',
      entityId: order.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        orderId: order.id,
        previousAmount,
        newAmount,
        difference,
        reason: dto.reason,
      },
    });

    return {
      success: true,
      message: `Monto de la orden #${orderId} reajustado de S/ ${previousAmount.toFixed(2)} a S/ ${newAmount.toFixed(2)}.`,
      order: {
        id: updatedOrder.id,
        previousAmount,
        newAmount,
        difference,
        reason: dto.reason,
      },
    };
  }

  /**
   * 📊 REPORTES FINANCIEROS GLOBALES
   */
  async getFinancialReports(queryDto: FinancialReportQueryDto) {
    const { startDate, endDate, status, paymentMethod } = queryDto;

    const qb = this.orderRepository.createQueryBuilder('order');

    if (startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('order.createdAt <= :endDate', { endDate: end });
    }

    if (status) {
      qb.andWhere('order.status = :status', { status });
    }

    if (paymentMethod) {
      qb.andWhere('order.paymentMethod = :paymentMethod', { paymentMethod });
    }

    const orders = await qb.getMany();

    let totalOrders = orders.length;
    let paidOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let totalRevenue = 0;

    const revenueByPaymentMethod: Record<string, number> = {
      card: 0,
      yape: 0,
      plin: 0,
      cash: 0,
    };

    const countByStatus: Record<string, number> = {
      pending: 0,
      paid: 0,
      cancelled: 0,
      failed: 0,
      shipped: 0,
      delivered: 0,
    };

    // Agrupación para línea de tiempo (por día YYYY-MM-DD)
    const timelineMap: Record<string, { date: string; revenue: number; ordersCount: number }> = {};

    orders.forEach((ord) => {
      const amount = Number(ord.totalAmount) || 0;
      const orderStatus = ord.status?.toLowerCase() || 'pending';
      const pMethod = ord.paymentMethod?.toLowerCase() || 'card';

      countByStatus[orderStatus] = (countByStatus[orderStatus] || 0) + 1;

      if (orderStatus === 'paid') {
        paidOrdersCount++;
        totalRevenue += amount;

        revenueByPaymentMethod[pMethod] = (revenueByPaymentMethod[pMethod] || 0) + amount;

        const dateKey = new Date(ord.createdAt).toISOString().split('T')[0];
        if (!timelineMap[dateKey]) {
          timelineMap[dateKey] = { date: dateKey, revenue: 0, ordersCount: 0 };
        }
        timelineMap[dateKey].revenue += amount;
        timelineMap[dateKey].ordersCount += 1;
      } else if (orderStatus === 'cancelled') {
        cancelledOrdersCount++;
      }
    });

    const averageTicket = paidOrdersCount > 0 ? totalRevenue / paidOrdersCount : 0;
    const timeline = Object.values(timelineMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    return {
      success: true,
      data: {
        summary: {
          totalOrders,
          paidOrdersCount,
          cancelledOrdersCount,
          totalRevenue: Number(totalRevenue.toFixed(2)),
          averageTicket: Number(averageTicket.toFixed(2)),
        },
        revenueByPaymentMethod,
        countByStatus,
        timeline,
      },
    };
  }
}
