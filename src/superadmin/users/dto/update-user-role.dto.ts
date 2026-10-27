import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RoleType } from '../../../roles/enums/role-type.enum';

export class UpdateUserRoleDto {
  @IsNotEmpty({ message: 'El nuevo rol es obligatorio' })
  @IsEnum(RoleType, {
    message: 'El rol debe ser válido: superadmin, admin o user',
  })
  newRole!: RoleType;

  @IsNotEmpty({ message: 'El motivo del cambio de rol es obligatorio' })
  @IsString()
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason!: string;

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para confirmar esta acción' })
  @IsString()
  superadminPassword!: string;
}
