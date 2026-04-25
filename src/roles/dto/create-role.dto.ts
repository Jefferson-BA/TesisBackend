import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RoleType } from '../enums/role-type.enum';

export class CreateRoleDto {
  @IsEnum(RoleType, { message: 'El rol debe ser superadmin, admin o user' })
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio' })
  name!: RoleType;

  @IsString()
  @IsOptional()
  description?: string;
}