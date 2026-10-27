import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ToggleMaintenanceDto {
  @IsNotEmpty({ message: 'El estado enabled es obligatorio' })
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para confirmar el cambio de modo mantenimiento' })
  @IsString()
  superadminPassword!: string;
}
