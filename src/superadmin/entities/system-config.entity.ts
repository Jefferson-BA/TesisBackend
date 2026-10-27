import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ConfigCategory {
  GENERAL = 'GENERAL',
  FINANCIAL = 'FINANCIAL',
  SECURITY = 'SECURITY',
  INTEGRATIONS = 'INTEGRATIONS',
}

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'varchar', length: 80, unique: true })
  key!: string;

  @Column({ type: 'text' })
  value!: string;

  @Column({
    type: 'enum',
    enum: ConfigCategory,
    default: ConfigCategory.GENERAL,
  })
  category!: ConfigCategory;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSecret!: boolean;

  @Column({ type: 'int', nullable: true })
  updatedById?: number;

  @Column({ type: 'varchar', length: 150, nullable: true })
  updatedByName?: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
