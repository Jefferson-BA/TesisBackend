import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

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
  id: number;

  // 👤 Cliente que hizo la compra
  @ManyToOne(() => User, (user) => user.orders, { eager: false })
  user: User;

  // 💰 Total del pedido
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  // 🚚 Dirección de envío
  @Column()
  shippingAddress: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  phone: string;

  // 💳 Método de pago
  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.CARD,
  })
  paymentMethod: PaymentMethod;

  // 📦 Estado del pedido
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  // 🧾 Productos comprados
  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}