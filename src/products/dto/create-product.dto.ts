import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, IsPositive, IsInt, Min, IsUUID, IsUrl, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  // 👇 Permitimos configurar la visibilidad al crearlo
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsNotEmpty()
  categoryId!: string; 
}