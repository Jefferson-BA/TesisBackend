import { IsOptional, IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name!: string; // 🟢 Se añade '!' para decirle a TS que se inicializará dinámicamente

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  password!: string;

  // 🟢 IMPORTANTE: Si falta este campo, NestJS lo borra antes de pasarlo al servicio
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  roleId?: number;
}
