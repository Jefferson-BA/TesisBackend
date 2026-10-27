import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  ORDER_FORCE_CANCELLED = 'ORDER_FORCE_CANCELLED',
  CULQI_REFUND_PROCESSED = 'CULQI_REFUND_PROCESSED',
  ORDER_AMOUNT_ADJUSTED = 'ORDER_AMOUNT_ADJUSTED',
  SYSTEM_CONFIG_UPDATED = 'SYSTEM_CONFIG_UPDATED',
  MAINTENANCE_MODE_TOGGLED = 'MAINTENANCE_MODE_TOGGLED',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  action!: string;

  @Index()
  @Column({ type: 'varchar', length: 60 })
  entity!: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  entityId?: string;

  @Index()
  @Column({ type: 'int' })
  performedById!: number;

  @Column({ type: 'varchar', length: 150 })
  performedByName!: string;

  @Column({ type: 'varchar', length: 150 })
  performedByEmail!: string;

  @Column({ type: 'varchar', length: 50 })
  performedByRole!: string;

  @Column({ type: 'varchar', length: 64 })
  ipAddress!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
