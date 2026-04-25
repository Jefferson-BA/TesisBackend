import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { RolesModule } from './roles/roles.module';
import { AdvertisementsModule } from './advertisements/advertisements.module';


@Module({
  imports: [
    // 1. Cargamos las variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. Conexión a la base de datos
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST,
      port: +(process.env.DB_PORT || 5432), 
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      // 3. Carga automática de todas las entidades que creamos
      autoLoadEntities: true,

      // 4. MIGRACIÓN AUTOMÁTICA (Sincronización)
      // En desarrollo usamos 'synchronize: true' para que TypeORM
      // cree las tablas automáticamente al detectar tus entidades.
      synchronize: true,

      // En producción esto DEBE ser false y usarse migraciones manuales.
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    RolesModule,
    AdvertisementsModule,
  ],
})
export class AppModule { }