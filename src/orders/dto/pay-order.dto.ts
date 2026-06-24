import { IsString, IsNotEmpty, IsNumber, IsEmail, IsOptional } from 'class-validator';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'El tokenId es obligatorio' })
  tokenId!: string;

  @IsNumber()
  @IsNotEmpty({ message: 'El monto es obligatorio para validación' })
  amount!: number;

  @IsEmail()
  @IsOptional()
  email?: string;
}