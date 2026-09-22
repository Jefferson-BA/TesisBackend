import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DiscountType, ApplyTo } from '../enums/promotion.enums';
import { Product } from '../../products/entities/product.entity';
import { Category } from '../../categories/entities/category.entity';
import { ColumnNumericTransformer } from '../../common/utils/column-numeric.transformer';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id!: number;

  // ── Datos del banner público ───────────────────────────────────────────────
  @Column({ type: 'varchar', length: 150 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  // ── Configuración del descuento ────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENTAGE,
  })
  discountType!: DiscountType;

  /**
   * Valor del descuento:
   *   - percentage       → 20 = 20% off
   *   - fixed_amount     → 5  = $5 de descuento
   *   - buy_x_get_discount → 15 = 15% off cuando se cumpla minQuantity
   */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  discountValue!: number;

  /**
   * Solo para discountType = 'buy_x_get_discount'.
   * Indica cuántos productos debe comprar el cliente para activar el descuento.
   * Ej: minQuantity = 3 → al comprar 3 o más, aplica discountValue% de descuento.
   */
  @Column({ type: 'int', nullable: true })
  minQuantity?: number;

  // ── Alcance del descuento ──────────────────────────────────────────────────
  @Column({
    type: 'enum',
    enum: ApplyTo,
    default: ApplyTo.ALL,
  })
  applyTo!: ApplyTo;

  /** FK a products — solo cuando applyTo = 'product' */
  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  /** FK a categories — solo cuando applyTo = 'category' */
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

  // ── Vigencia y estado ──────────────────────────────────────────────────────
  @Column({ type: 'date' })
  startDate!: Date;

  @Column({ type: 'date' })
  endDate!: Date;

  /** Switch manual del admin para activar/desactivar sin borrar */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
