import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto'; // 👈 agregado
import { Role } from '../../roles/entities/role.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const userExists = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (userExists) throw new BadRequestException('El correo ya está registrado');

    const role = await this.roleRepository.findOne({ where: { id: createUserDto.roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');

    const newUser = this.userRepository.create({
      ...createUserDto,
      role: role,
    });

    return await this.userRepository.save(newUser);
  }

  // 🔥 MODIFICADO: ahora con paginación
  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const [users, total] = await this.userRepository.findAndCount({
      take: limit,
      skip: offset,
      relations: ['role'], // 👈 trae el rol
    });

    return {
      data: users,
      meta: {
        total,
        page: Math.ceil(offset / limit) + 1,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return user;
  }

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);
    this.userRepository.merge(user, updateUserDto as any);
    return await this.userRepository.save(user);
  }

  async remove(id: number) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return await this.userRepository.softRemove(user);
  }
}