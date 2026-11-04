import { PromotionsModule } from '../promotions/promotions.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './service/orders.service';
import { OrdersController } from './controllers/orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PromotionsModule,
    PaymentsModule,
    TypeOrmModule.forFeature([Order, OrderItem, Product, Reservation]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
