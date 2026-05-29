import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Product } from '../../products/entities/product.entity';
import { ColumnNumericTransformer } from '../../common/utils/column-numeric.transformer';

@Entity('reservation_items')
export class ReservationItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Reservation, (res) => res.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reservationId' })
  reservation!: Reservation;

  @Column()
  reservationId!: number;

  @ManyToOne(() => Product, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product; // Aquí el "producto" puede ser "Paquete de Buffet Matrimonio"

  @Column({ type: 'uuid' })
  productId!: string;

  @Column()
  quantity!: number; // Por lo general coincidirá con los invitados o paquetes requeridos

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  price!: number; // Precio pactado en el momento de la reserva
}