import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReservationStatus } from '../enums/reservations.enums';
export class UpdateReservationDto {
  @IsEnum(ReservationStatus)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  status!: ReservationStatus;
}
