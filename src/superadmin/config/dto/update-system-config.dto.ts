import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsNotEmpty({ message: 'El valor de la configuración es obligatorio' })
  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  superadminPassword?: string;
}
