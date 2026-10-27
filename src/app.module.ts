import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { RolesModule } from './roles/roles.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SuperadminModule } from './superadmin/superadmin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        const isSync = (configService.get<string>('TYPEORM_SYNC') || '').toLowerCase() === 'true';

        // Conexión para Producción / Staging (Usa DATABASE_URL de Neon con SSL)
        if (dbUrl) {
          return {
            type: 'postgres',
            url: dbUrl,
            autoLoadEntities: true,
            synchronize: isSync,
            ssl: {
              rejectUnauthorized: false, // Obligatorio para Neon
            },
          };
        }

        // Conexión para Desarrollo Local (Usa variables individuales)
        const host = configService.get<string>('DB_HOST', 'localhost');
        const isNeonHost = host.includes('neon.tech');

        return {
          type: (configService.get<string>('DB_TYPE') || 'postgres') as any,
          host: host,
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize: isSync,
          ssl: isNeonHost ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    RolesModule,
    PromotionsModule,
    ReservationsModule,
    DashboardModule,
    ChatbotModule,
    SuperadminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}