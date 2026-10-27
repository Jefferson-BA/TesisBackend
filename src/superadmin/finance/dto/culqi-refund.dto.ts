import { IsNotEmpty, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CulqiRefundDto {
  @IsOptional()
  @IsString()
  chargeId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1, { message: 'El monto mínimo de reembolso es S/ 0.10' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  reason?: string = 'solicitud_comprador';

  @IsNotEmpty({ message: 'Debes ingresar tu contraseña de superadmin para autorizar el reembolso' })
  @IsString()
  superadminPassword!: string;
}
