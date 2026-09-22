import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionsService } from './services/promotions.service';
import { PromotionsController } from './controllers/promotions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  // Exportamos el service para que otros módulos (ej: orders, products)
  // puedan calcular precios con descuento sin exponer endpoints adicionales
  exports: [PromotionsService],
})
export class PromotionsModule {}
