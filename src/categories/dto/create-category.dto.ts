import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  name!: string; // 👈 Usamos '!' porque class-validator se encargará de llenarlo con el Body de Postman

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  description?: string; // 👈 Usamos '?' porque el usuario puede decidir no enviarlo
}