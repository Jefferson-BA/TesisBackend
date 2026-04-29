import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber, IsPositive, IsInt, Min, IsUUID, IsUrl } from 'class-validator';

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

  @IsInt()
  @Min(0) // El stock no puede ser negativo
  stock!: number;

  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  // 👇 Para crear un producto, el admin DEBE enviar el ID de la categoría a la que pertenece
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string; 
}