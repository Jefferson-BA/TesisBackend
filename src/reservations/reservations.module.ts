import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // 👈 AGREGADO
import { ReservationsService } from './service/reservations.service';
import { ReservationsController } from './controllers/reservations.controller';
import { Reservation } from './entities/reservation.entity'; // 👈 AGREGADO
import { ReservationItem } from './entities/reservation-item.entity'; // 👈 AGREGADO

@Module({
  imports: [
    // 🟢 Esto le dice a TypeORM que registre estas tablas en la Base de Datos
    TypeOrmModule.forFeature([Reservation, ReservationItem]),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService], // Lo exportamos por si lo necesitas en otro módulo en el futuro
})
export class ReservationsModule {}