import { PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ReservationStatus } from '../enums/reservations.enums';
import { Transform } from 'class-transformer';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @IsOptional()
  @IsEnum(ReservationStatus, {
    message: 'El estado proporcionado no es un estado de reserva válido.',
  })
  // 👇 Esto convierte "APPROVED" en "approved" automáticamente antes de ir a la BD
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  status?: ReservationStatus;
}