import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboardStats() {
    const orderRepository = this.dataSource.getRepository(Order);
    const reservationRepository = this.dataSource.getRepository(Reservation);
    const userRepository = this.dataSource.getRepository(User);

    // 1. Consultas en paralelo para máxima velocidad
    const [totalOrders, totalReservations, totalUsers] = await Promise.all([
      orderRepository.count(),
      reservationRepository.count(),
      userRepository.count(),
    ]);

    // 2. Calcular ingresos totales (ejemplo sumando órdenes completadas)
    const ordersData = await orderRepository.find();
    const totalEarnings = ordersData.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    return {
      cards: {
        totalEarnings,
        totalReservations,
        totalOrders,
        totalCustomers: totalUsers,
      },
      charts: {
        // Aquí puedes estructurar arreglos dummy por ahora para que el front pinte los gráficos
        salesMonthly: [1200, 1900, 3000, 5000, 4000, 6000],
        reservationsStatus: {
          pending: await reservationRepository.count({ where: { status: 'pending_review' as any } }),
          approved: await reservationRepository.count({ where: { status: 'approved' as any } }),
        }
      }
    };
  }
}