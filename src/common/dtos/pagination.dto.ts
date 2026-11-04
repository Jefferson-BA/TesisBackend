import { IsOptional, IsPositive, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @IsInt()
  @Max(100)
  @Type(() => Number) // Convierte el string de la URL a número
  limit?: number = 10;

  @IsOptional()
  @Min(0)
  @IsInt()
  @Type(() => Number)
  offset?: number = 0;
}
