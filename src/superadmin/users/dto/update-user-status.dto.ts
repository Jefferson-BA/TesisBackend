import { IsBoolean, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateUserStatusDto {
  @IsNotEmpty({ message: 'El estado isActive es obligatorio' })
  @IsBoolean()
  isActive!: boolean;

  @IsNotEmpty({ message: 'El motivo del cambio de estado es obligatorio' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason!: string;

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para confirmar esta acción' })
  @IsString()
  superadminPassword!: string;
}
