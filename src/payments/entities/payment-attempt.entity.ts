import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
@Entity('payment_attempts')
@Check('CHK_payment_attempt_amount', '"amountCents" > 0')
@Index('IDX_payment_attempt_active_order', ['orderId'], {
  unique: true,
  where: '"status" <> \'failed\'',
})
export class PaymentAttempt {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() orderId!: number;
  @Column({ type: 'varchar', length: 20, default: 'processing' }) status!:
    | 'processing'
    | 'succeeded'
    | 'failed';
  @Column({ type: 'int' }) amountCents!: number;
  @Column({ type: 'varchar', length: 255 }) email!: string;
  @Column({ type: 'varchar', nullable: true }) chargeId?: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}
