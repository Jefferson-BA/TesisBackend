import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersService } from './service/orders.service'; 
import { OrdersController } from './controllers/orders.controller';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';

// 👇 1. IMPORTA LOS MÓDULOS AQUÍ ARRIBA
import { CartModule } from '../cart/cart.module';
import { MailModule } from '../mail/mail.module'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    // 👇 2. AGRÉGALOS AL ARREGLO DE IMPORTS
    CartModule, 
    MailModule, 
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}