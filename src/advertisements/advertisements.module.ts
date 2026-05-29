import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertisementsService } from './services/advertisements.service';
import { AdvertisementsController } from './controller/advertisements.controller';
import { Advertisement } from './entities/advertisement.entity';

@Module({
  // 👇 ESTO ES LO QUE FALTABA: Registra la entidad en TypeORM
  imports: [TypeOrmModule.forFeature([Advertisement])],
  controllers: [AdvertisementsController],
  providers: [AdvertisementsService],
  exports: [AdvertisementsService], // Lo exportamos por si otro módulo necesita leer promociones
})
export class AdvertisementsModule {}