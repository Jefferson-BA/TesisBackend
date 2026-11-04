import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PaymentMethod } from '../enums/order.enums';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  @IsOptional() // 👈 Ahora es opcional
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsInt()
  @Min(1)
  @IsOptional()
  reservationId?: number;

  @IsArray()
  @ArrayMaxSize(100)
  @IsOptional() // 👈 Ahora es opcional
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
