import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { ReservationStatus } from '../../reservations/enums/reservations.enums';
import { RoleType } from '../../roles/enums/role-type.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboardStats() {
    const orderRepository = this.dataSource.getRepository(Order);
    const reservationRepository = this.dataSource.getRepository(Reservation);
    const userRepository = this.dataSource.getRepository(User);

    const currentYear = new Date().getFullYear();

    // 1. Consultas Rápidas en Paralelo
    const [totalOrders, totalReservations, totalCustomers] = await Promise.all([
      orderRepository.count(),
      reservationRepository.count(),
      // Solo contamos usuarios con rol 'user' (clientes finales)
      userRepository
        .createQueryBuilder('user')
        .leftJoin('user.role', 'role')
        .where('role.name = :roleName', { roleName: RoleType.USER })
        .getCount(),
    ]);

    // 2. Calcular Ingresos Reales con SQL (No traba la memoria del servidor)
    const { totalEarnings } = await orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'totalEarnings')
      // Opcional: .where('order.status != :status', { status: 'CANCELLED' }) 
      .getRawOne();

    // 3. DATOS REALES PARA EL GRÁFICO: Ventas agrupadas por mes del año actual
    const monthlySalesRaw = await orderRepository
      .createQueryBuilder('order')
      .select('EXTRACT(MONTH FROM order.createdAt)', 'month')
      .addSelect('SUM(order.totalAmount)', 'total')
      .where('EXTRACT(YEAR FROM order.createdAt) = :year', { year: currentYear })
      .groupBy('EXTRACT(MONTH FROM order.createdAt)')
      .getRawMany();

    // Mapeamos el resultado de SQL a un arreglo de 12 posiciones (Ene a Dic)
    const salesMonthly = new Array(12).fill(0);
    monthlySalesRaw.forEach((item) => {
      // item.month viene del 1 al 12, le restamos 1 para el índice del array
      salesMonthly[item.month - 1] = Number(item.total);
    });

    // 4. Conteo de los 5 estados de Reserva agrupados por status
    const statusCountsRaw: { status: string; count: string }[] =
      await reservationRepository
        .createQueryBuilder('reservation')
        .select('reservation.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('reservation.status')
        .getRawMany();

    // Convertimos el resultado a un mapa para acceso rápido
    const statusMap = new Map<string, number>(
      statusCountsRaw.map((row) => [row.status, Number(row.count)]),
    );

    // Si un estado no tiene registros devolvemos 0 (nunca null ni undefined)
    const reservationsStatus = {
      pending:    statusMap.get(ReservationStatus.PENDING_REVIEW) ?? 0,
      approved:   statusMap.get(ReservationStatus.APPROVED)       ?? 0,
      fully_paid: statusMap.get(ReservationStatus.FULLY_PAID)     ?? 0,
      completed:  statusMap.get(ReservationStatus.COMPLETED)      ?? 0,
      cancelled:  statusMap.get(ReservationStatus.CANCELLED)      ?? 0,
    };

    return {
      cards: {
        totalEarnings: Number(totalEarnings || 0),
        totalReservations,
        totalOrders,
        totalCustomers,
      },
      charts: {
        salesMonthly, // 👈 Ahora envía [0, 500, 120, ...] 100% basado en BD
        reservationsStatus,
      },
    };
  }
}