import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    BeforeInsert,
    BeforeUpdate,
    AfterLoad,
    CreateDateColumn,
    OneToMany,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { Order } from '../../orders/entities/order.entity';
import { IsNotEmpty, IsEmail } from 'class-validator';
import { ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { OneToOne } from 'typeorm';
import { Cart } from '../../cart/entities/cart.entity';

export enum UserRole {
    ADMIN = 'admin',
    CUSTOMER = 'customer',
}

@Entity('users')
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    @IsNotEmpty()
    name: string;

    @Column({ unique: true })
    @IsEmail()
    email: string;

    @Column()
    @Exclude() // No se devuelve en respuestas
    password: string;
    @OneToOne(() => Cart, (cart) => cart.user)
    cart: Cart;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.CUSTOMER,
    })
    @ManyToOne(() => Role, (role) => role.users, {
        eager: true,
        nullable: false,
    })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ default: true })
    isActive: boolean;

    @Column({ nullable: true })
    profileImage?: string;

    @CreateDateColumn()
    createdAt: Date;

    // 🔥 Relación con órdenes (para el futuro)
    @OneToMany(() => Order, (order) => order.user)
    orders: Order[];

    // ===============================
    // 🔐 PASSWORD LOGIC
    // ===============================

    private tempPassword: string;

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