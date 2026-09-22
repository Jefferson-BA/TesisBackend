import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Promotion } from '../entities/promotion.entity';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { DiscountType, ApplyTo } from '../enums/promotion.enums';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async create(createDto: CreatePromotionDto): Promise<Promotion> {
    // Validación semántica: no pasar IDs de más
    if (createDto.applyTo === ApplyTo.ALL) {
      createDto.productId = undefined;
      createDto.categoryId = undefined;
    }
    if (createDto.applyTo === ApplyTo.PRODUCT) {
      createDto.categoryId = undefined;
    }
    if (createDto.applyTo === ApplyTo.CATEGORY) {
      createDto.productId = undefined;
    }
    if (createDto.discountType !== DiscountType.BUY_X_GET_DISCOUNT) {
      createDto.minQuantity = undefined;
    }

    const promotion = this.promotionRepository.create(createDto);
    return await this.promotionRepository.save(promotion);
  }

  /** Lista TODAS las promociones (panel de admin) */
  async findAll(): Promise<Promotion[]> {
    return await this.promotionRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Lista solo las promociones activas Y vigentes (para el frontend público).
   * Una promo es vigente si: isActive=true Y hoy está entre startDate y endDate.
   */
  async findActive(): Promise<Promotion[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.promotionRepository.find({
      where: {
        isActive: true,
        startDate: LessThanOrEqual(today),
        endDate: MoreThanOrEqual(today),
      },
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Promotion> {
    const promotion = await this.promotionRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`La promoción con ID #${id} no existe`);
    }
    return promotion;
  }

  async update(id: number, updateDto: UpdatePromotionDto): Promise<Promotion> {
    const promotion = await this.findOne(id);
    Object.assign(promotion, updateDto);
    return await this.promotionRepository.save(promotion);
  }

  async remove(id: number): Promise<{ message: string }> {
    const promotion = await this.findOne(id);
    await this.promotionRepository.remove(promotion);
    return { message: `Promoción #${id} eliminada correctamente` };
  }

  // ── Lógica de descuento ───────────────────────────────────────────────────

  /**
   * Calcula el precio final de un producto dado una promoción aplicable.
   * @param originalPrice Precio original del producto
   * @param promotion     Promoción a aplicar
   * @param quantity      Cantidad de unidades que el cliente va a comprar
   * @returns             Precio unitario con descuento aplicado
   */
  calculateDiscountedPrice(
    originalPrice: number,
    promotion: Promotion,
    quantity: number = 1,
  ): number {
    const { discountType, discountValue, minQuantity } = promotion;

    switch (discountType) {
      case DiscountType.PERCENTAGE: {
        const discount = Math.min(discountValue, 100); // máximo 100%
        return +(originalPrice * (1 - discount / 100)).toFixed(2);
      }

      case DiscountType.FIXED_AMOUNT: {
        const discounted = originalPrice - discountValue;
        return +(Math.max(discounted, 0)).toFixed(2); // nunca negativo
      }

      case DiscountType.BUY_X_GET_DISCOUNT: {
        // Solo aplica si el cliente compra >= minQuantity unidades
        if (minQuantity && quantity >= minQuantity) {
          const discount = Math.min(discountValue, 100);
          return +(originalPrice * (1 - discount / 100)).toFixed(2);
        }
        return +originalPrice.toFixed(2); // sin descuento si no llega al mínimo
      }

      default:
        return +originalPrice.toFixed(2);
    }
  }

  /**
   * Retorna la primera promoción activa que aplique a un producto específico.
   * Prioridad: promo de producto > promo de categoría > promo general.
   * @param productId  UUID del producto
   * @param categoryId UUID de la categoría del producto
   */
  async findActivePromotionForProduct(
    productId: string,
    categoryId: string,
  ): Promise<Promotion | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseWhere = {
      isActive: true,
      startDate: LessThanOrEqual(today),
      endDate: MoreThanOrEqual(today),
    };

    // 1. Busca promo por producto específico
    const byProduct = await this.promotionRepository.findOne({
      where: { ...baseWhere, applyTo: ApplyTo.PRODUCT, productId },
    });
    if (byProduct) return byProduct;

    // 2. Busca promo por categoría
    const byCategory = await this.promotionRepository.findOne({
      where: { ...baseWhere, applyTo: ApplyTo.CATEGORY, categoryId },
    });
    if (byCategory) return byCategory;

    // 3. Busca promo general
    return await this.promotionRepository.findOne({
      where: { ...baseWhere, applyTo: ApplyTo.ALL },
    });
  }
}
