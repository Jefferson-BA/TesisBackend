import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  Equals,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';

import { Type } from 'class-transformer';

class ReservationItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
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
  @Min(1)
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
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReservationItemDto)
  items!: ReservationItemDto[];

  @Equals(true, { message: 'Debe aceptar los Términos y Condiciones' })
  acceptedTerms!: boolean;

  @Equals(true, { message: 'Debe aceptar la Política de Privacidad' })
  acceptedPrivacy!: boolean;
}
