import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ReservationItem } from '../entities/reservation-item.entity';
import { ReservationStatus } from '../enums/reservations.enums';
import { ColumnNumericTransformer } from '../../common/utils/column-numeric.transformer';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ type: 'date' })
  eventDate!: Date; // Fecha del matrimonio/evento

  @Column({ type: 'varchar', length: 50 })
  serviceStartTime!: string; // Horario en que debe iniciar el buffet (ej: "18:00")

  @Column({ type: 'int' })
  guestsCount!: number; // Cantidad de invitados/platos

  @Column({ length: 255 })
  venueAddress!: string; // Lugar del evento

  @Column({ length: 100 })
  city!: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes?: string; // Detalles extra (ej: "5 invitados son vegetarianos")

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
    default: ReservationStatus.PENDING_REVIEW, // 👈 Empieza en revisión
  })
  status!: ReservationStatus;

  @OneToMany(() => ReservationItem, (item) => item.reservation, { cascade: true })
  items!: ReservationItem[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}