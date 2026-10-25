import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  Equals,
} from 'class-validator';

import { Type } from 'class-transformer';

class ReservationItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @IsNotEmpty()
  quantity!: number;
}

export class CreateReservationDto {
  @IsDateString()
  @IsNotEmpty()
  eventDate!: string;

  @IsString()
  @IsNotEmpty()
  serviceStartTime!: string;

  @IsInt()
  @IsNotEmpty()
  guestsCount!: number;

  @IsString()
  @IsNotEmpty()
  venueAddress!: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  additionalNotes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  items!: ReservationItemDto[];

  @Equals(true, { message: 'Debe aceptar los Términos y Condiciones' })
  acceptedTerms!: boolean;

  @Equals(true, { message: 'Debe aceptar la Política de Privacidad' })
  acceptedPrivacy!: boolean;
}