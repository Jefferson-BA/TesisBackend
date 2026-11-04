import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsNotEmpty,
  IsInt,
  Min,
  MinLength,
  MaxLength,
  IsDate,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string; // 🟢 Se añade '!' para decirle a TS que se inicializará dinámicamente

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password!: string;

  // 🟢 IMPORTANTE: Si falta este campo, NestJS lo borra antes de pasarlo al servicio
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  termsAcceptedAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  privacyAcceptedAt?: Date;
}
