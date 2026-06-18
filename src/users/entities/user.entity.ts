import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  OneToOne,
  Index // 👈 Importado
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { Order } from '../../orders/entities/order.entity';
import { Role } from '../../roles/entities/role.entity';
import { Cart } from '../../cart/entities/cart.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Index() // 👈 Acelera la búsqueda durante el Login
  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password!: string;

  @OneToOne(() => Cart, (cart) => cart.user)
  cart!: Cart;

  @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: false })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Index() // 👈 Acelera los filtros del dashboard o panel de admin
  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  profileImage?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  // ===============================
  // 🔐 PASSWORD LOGIC
  // ===============================
  private tempPassword!: string;

  @AfterLoad()
  loadTempPassword(): void {
    this.tempPassword = this.password;
  }

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  @BeforeUpdate()
  async encryptPassword() {
    if (this.tempPassword !== this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  async comparePassword(attempt: string) {
    return bcrypt.compare(attempt, this.password);
  }
}