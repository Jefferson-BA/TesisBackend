import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class PayOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'El tokenId es obligatorio' })
  tokenId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsNotEmpty({ message: 'El monto es obligatorio para validación' })
  amount!: number;

  @IsEmail()
  @IsOptional()
  email?: string;
}
