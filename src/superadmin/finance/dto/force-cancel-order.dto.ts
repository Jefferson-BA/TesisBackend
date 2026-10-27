import { IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class ForceCancelOrderDto {
  @IsNotEmpty({ message: 'El motivo de la anulación forzada es obligatorio' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason!: string;

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para confirmar la anulación forzada' })
  @IsString()
  superadminPassword!: string;

  @IsOptional()
  @IsBoolean()
  refundWithCulqi?: boolean = false;
}
