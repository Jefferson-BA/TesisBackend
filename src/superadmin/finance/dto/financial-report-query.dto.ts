import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { OrderStatus, PaymentMethod } from '../../../orders/enums/order.enums';

export class FinancialReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
