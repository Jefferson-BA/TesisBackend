import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name!: string;

  @IsEmail({}, { message: 'Formato de email inválido' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password! : string;

  // Para crear el usuario, solemos enviar el ID del rol que le corresponde
  @IsNotEmpty()
  roleId!: number; 

  @IsString()
  @IsOptional()
  profileImage?: string;
}