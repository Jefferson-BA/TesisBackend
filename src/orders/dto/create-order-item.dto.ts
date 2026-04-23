import { IsInt, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Opcional: si usas Swagger

export class CreateOrderItemDto {
  
  @ApiProperty({ example: 1, description: 'ID del producto' }) 
  @IsInt()
  @IsPositive()
  productId!: number; 

  @ApiProperty({ example: 2, description: 'Cantidad de productos' })
  @IsInt()
  @Min(1)
  quantity!: number; 

  
}