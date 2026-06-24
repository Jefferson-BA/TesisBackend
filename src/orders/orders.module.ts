import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './service/orders.service'; 
import { OrdersController } from './controllers/orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Reservation } from '../reservations/entities/reservation.entity'; 
import { CartModule } from '../cart/cart.module';
import { MailModule } from '../mail/mail.module'; 
import { CulqiService } from '../payments/service/culqi.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, Reservation]),
    CartModule, 
    MailModule, 
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CulqiService],
})
export class OrdersModule {}