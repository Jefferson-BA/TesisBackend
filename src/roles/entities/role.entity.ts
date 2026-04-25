import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RoleType } from '../enums/role-type.enum';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: RoleType,
    unique: true,
  })
  name!: RoleType;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // 🔥 Relación inversa: Un rol puede tener muchos usuarios
  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}