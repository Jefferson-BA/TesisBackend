import { Injectable, BadRequestException, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleType } from '../enums/role-type.enum';


@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }

  // 👇 AGREGA ESTE MÉTODO PARA SOLUCIONAR EL ERROR

  async findByName(name: RoleType) {
    return await this.roleRepository.findOne({ where: { name } });
  }
  // 🔥 ESTA ES LA MAGIA: Se ejecuta solo al levantar el servidor (npm run start:dev)
  async onModuleInit() {
    const roles = [RoleType.SUPERADMIN, RoleType.ADMIN, RoleType.USER];

    for (const roleName of roles) {
      const roleExists = await this.roleRepository.findOne({ where: { name: roleName } });
      if (!roleExists) {
        const newRole = this.roleRepository.create({ name: roleName });
        await this.roleRepository.save(newRole);
        console.log(`[Roles Seeder] Rol '${roleName}' creado automáticamente.`);
      }
    }
  }

  async create(createRoleDto: CreateRoleDto) {
    const roleExists = await this.roleRepository.findOne({ where: { name: createRoleDto.name } });
    if (roleExists) throw new BadRequestException(`El rol ${createRoleDto.name} ya existe`);

    const newRole = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(newRole);
  }

  async findAll() {
    return await this.roleRepository.find();
  }

  async findOne(id: number) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);
    this.roleRepository.merge(role, updateRoleDto as any);
    return await this.roleRepository.save(role);
  }

  async remove(id: number) {
    const role = await this.findOne(id);
    return await this.roleRepository.remove(role);
  }
}