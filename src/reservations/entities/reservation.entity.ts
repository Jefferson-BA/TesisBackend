import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  OneToMany, 
  JoinColumn 
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReservationItem } from '../entities/reservation-item.entity';
import { ReservationStatus } from '../enums/reservations.enums';
import { ColumnNumericTransformer } from '../../common/utils/column-numeric.transformer';
import { Order } from '../../orders/entities/order.entity';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  // ✅ Relación con User correcta (Esto garantiza que el populate funcione)
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'date' })
  eventDate!: Date; 

  @Column({ type: 'varchar', length: 50 })
  serviceStartTime!: string; 

  @Column({ type: 'int' })
  guestsCount!: number; 

  @Column({ length: 255 })
  venueAddress!: string; 

  @Column({ length: 100 })
  city!: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes?: string; 

  // 🚨 CORRECCIÓN ARQUITECTÓNICA: 
  // Eliminamos el `orderId` físico de aquí. La Reserva no guarda el ID de la orden.
  // La Orden guarda el ID de la Reserva. Por lo tanto, aquí es un OneToMany.
  @OneToMany(() => Order, (order) => order.reservation)
  orders!: Order[]; 

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  totalAmount!: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING_REVIEW, 
  })
  status!: ReservationStatus;

  @OneToMany(() => ReservationItem, (item) => item.reservation, { cascade: true })
  items!: ReservationItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}