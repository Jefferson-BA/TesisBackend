import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsPositive,
  IsUUID,
  Min,
  Max,
  ValidateIf,
  IsInt,
} from 'class-validator';
import { DiscountType, ApplyTo } from '../enums/promotion.enums';

export class CreatePromotionDto {
  // ── Datos del banner ─────────────────────────────────────────────────────
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  // ── Descuento ────────────────────────────────────────────────────────────
  @IsEnum(DiscountType)
  @IsNotEmpty()
  discountType!: DiscountType;

  /**
   * Para 'percentage' y 'buy_x_get_discount': valor entre 1 y 100.
   * Para 'fixed_amount': cualquier número positivo.
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  discountValue!: number;

  /**
   * Solo obligatorio si discountType = 'buy_x_get_discount'.
   * Mínimo 2 (no tiene sentido comprar 1 y obtener descuento en qty).
   */
  @ValidateIf((o) => o.discountType === DiscountType.BUY_X_GET_DISCOUNT)
  @IsInt()
  @Min(2)
  @IsNotEmpty()
  minQuantity?: number;

  // ── Alcance ──────────────────────────────────────────────────────────────
  @IsEnum(ApplyTo)
  @IsNotEmpty()
  applyTo!: ApplyTo;

  /**
   * Requerido cuando applyTo = 'product'.
   * UUID del producto al que aplica la promo.
   */
  @ValidateIf((o) => o.applyTo === ApplyTo.PRODUCT)
  @IsUUID()
  @IsNotEmpty()
  productId?: string;

  /**
   * Requerido cuando applyTo = 'category'.
   * UUID de la categoría a la que aplica la promo.
   */
  @ValidateIf((o) => o.applyTo === ApplyTo.CATEGORY)
  @IsUUID()
  @IsNotEmpty()
  categoryId?: string;

  // ── Vigencia ─────────────────────────────────────────────────────────────
  @IsDateString()
  @IsNotEmpty()
  startDate!: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate!: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
