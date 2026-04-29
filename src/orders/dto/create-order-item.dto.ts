import { IsInt, Min, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del producto' }) 
  @IsUUID()      // 👈 Validamos que sea un UUID (texto)
  @IsNotEmpty()  // 👈 Nos aseguramos de que no venga vacío
  productId!: string; // 👈 Cambiamos el tipo de number a string

  @ApiProperty({ example: 2, description: 'Cantidad de productos' })
  @IsInt()
  @Min(1)
  quantity!: number; 

}