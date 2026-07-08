import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignupDto {
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name!: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(32, { message: 'La contraseña no puede exceder los 32 caracteres' })
  password!: string;

  // 🟢 ¡LA SOLUCIÓN AQUÍ! Declaramos el teléfono para que NestJS NO lo elimine
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto válido' })
  phone?: string;

  // Siendo un e-commerce para empresas (restaurantes/parrillas),
  // podrías requerir un RUC o nombre de empresa desde el inicio:
  // @IsString()
  // @IsOptional()
  // companyName?: string;
}