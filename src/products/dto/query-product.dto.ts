import { IsOptional, IsPositive, Min, IsInt, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10; // Por defecto traerá 10 productos

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1; // Por defecto empezará en la página 1

  @IsOptional()
  @IsString()
  category?: string; // Para buscar por el ID de la categoría

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  maxPrice?: number;
}