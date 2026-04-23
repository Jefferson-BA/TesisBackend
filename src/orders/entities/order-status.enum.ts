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

// Transformer para evitar que el decimal llegue como string
export class ColumnNumericTransformer {
  to(data: number): number { return data; }
  from(data: string): number { return parseFloat(data); }
}

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CARD = 'card',
  YAPE = 'yape',
  PLIN = 'plin',
  CASH = 'cash',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index() 
  @ManyToOne(() => User, (user) => user.orders, { 
    nullable: false, 
    onDelete: 'RESTRICT' 
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ 
    type: 'decimal', 
    precision: 12, 
    scale: 2, 
    default: 0,
    transformer: new ColumnNumericTransformer() 
  })
  totalAmount!: number;

  @Column({ length: 255 })
  shippingAddress!: string;

  @Column({ length: 100, nullable: true })
  city?: string; 

  @Column({ length: 20, nullable: true })
  postalCode?: string;

  @Column({ length: 20, nullable: true })
  phone?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  paymentMethod!: PaymentMethod;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true, 
  })
  items!: OrderItem[];

  @CreateDateColumn({ type: 'timestamptz' }) 
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}