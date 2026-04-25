import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentMethod } from '../enums/order.enums';
import { ColumnNumericTransformer } from '../../common/utils/column-numeric.transformer';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @ManyToOne(() => User, (user) => user.orders, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  // Si tenías una columna de "total" que usara el transformador, iría aquí. 
  // Por ahora la dejamos como en tu código original.

  @Column({ length: 255 })
  shippingAddress!: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 20, nullable: true })
  postalCode?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Index()
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CARD })
  paymentMethod!: PaymentMethod;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}