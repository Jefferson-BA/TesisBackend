import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
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
  eventDate!: Date;

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
}