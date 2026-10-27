import { IsNotEmpty, IsNumber, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustOrderAmountDto {
  @IsNotEmpty({ message: 'El nuevo monto total es obligatorio' })
  @IsNumber()
  @Min(0, { message: 'El nuevo monto no puede ser negativo' })
  @Type(() => Number)
  newTotalAmount!: number;

  @IsNotEmpty({ message: 'El motivo del reajuste es obligatorio' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason!: string;

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para confirmar el reajuste' })
  @IsString()
  superadminPassword!: string;
}
