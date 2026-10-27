import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User } from '../../users/entities/user.entity';
import { Role } from '../../roles/entities/role.entity';
import { RoleType } from '../../roles/enums/role-type.enum';
import { SuperadminAuditService } from '../audit/superadmin-audit.service';
import { AuditAction } from '../entities/audit-log.entity';
import { ClientInfo } from '../common/utils/client-info.util';

import { ListSuperadminUsersDto } from './dto/list-superadmin-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { SuperadminUpdateUserDto } from './dto/superadmin-update-user.dto';

@Injectable()
export class SuperadminUsersService {
  private readonly logger = new Logger(SuperadminUsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly auditService: SuperadminAuditService,
  ) {}

  /**
   * 🔐 VALIDACIÓN DE SEGURIDAD
   * Verifica la contraseña del superadmin autenticado antes de ejecutar acciones sensibles
   */
  private async verifySuperadminPassword(
    superadminId: number,
    providedPassword: string,
  ): Promise<User> {
    const superadmin = await this.userRepository.findOne({
      where: { id: superadminId },
      relations: ['role'],
    });

    if (!superadmin) {
      throw new NotFoundException('Usuario superadmin autenticado no encontrado.');
    }

    const isValid = await bcrypt.compare(providedPassword, superadmin.password);
    if (!isValid) {
      throw new ForbiddenException(
        'Contraseña de confirmación incorrecta. Acción rechazada por seguridad.',
      );
    }

    return superadmin;
  }

  /**
   * 👥 LISTADO AVANZADO DE USUARIOS
   * Filtros por rol, isActive, buscador y paginación
   */
  async findAll(queryDto: ListSuperadminUsersDto) {
    const { limit = 10, offset = 0, role, isActive, search } = queryDto;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .withDeleted(); // Permite ver también usuarios soft-deleted

    if (role) {
      qb.andWhere('LOWER(role.name) = :role', { role: role.toLowerCase() });
    }

    if (isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', { isActive });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search OR user.phone LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC');
    qb.take(limit);
    qb.skip(offset);

    const [users, total] = await qb.getManyAndCount();

    // Contadores globales por rol
    const roleStats = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .select('role.name', 'role')
      .addSelect('COUNT(user.id)', 'count')
      .groupBy('role.name')
      .getRawMany();

    const formattedRoleStats: Record<string, number> = {
      superadmin: 0,
      admin: 0,
      user: 0,
    };
    roleStats.forEach((r) => {
      if (r.role) formattedRoleStats[r.role.toLowerCase()] = Number(r.count);
    });

    return {
      data: users.map((u) => {
        const { password, ...safeUser } = u;
        return safeUser;
      }),
      stats: formattedRoleStats,
      meta: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        lastPage: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 🔍 CONSULTAR DETALLE COMPLETO DE USUARIO
   */
  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role', 'orders'],
      withDeleted: true,
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID #${id} no encontrado.`);
    }

    const { password, ...safeUser } = user;
    return {
      ...safeUser,
      ordersCount: user.orders ? user.orders.length : 0,
    };
  }

  /**
   * 🛡️ CAMBIAR ROL DE USUARIO (Con confirmación de seguridad)
   */
  async updateRole(
    targetUserId: number,
    requestingSuperadminId: number,
    dto: UpdateUserRoleDto,
    clientInfo: ClientInfo,
  ) {
    // 1. Confirmación de seguridad
    const superadmin = await this.verifySuperadminPassword(
      requestingSuperadminId,
      dto.superadminPassword,
    );

    // 2. Buscar usuario objetivo
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['role'],
    });

    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID #${targetUserId} no encontrado.`);
    }

    // 3. Prevenir auto-degradación si es el único superadmin
    if (
      targetUser.id === superadmin.id &&
      dto.newRole.toLowerCase() !== RoleType.SUPERADMIN
    ) {
      const superadminCount = await this.userRepository
        .createQueryBuilder('u')
        .leftJoin('u.role', 'r')
        .where('LOWER(r.name) = :role', { role: RoleType.SUPERADMIN })
        .getCount();

      if (superadminCount <= 1) {
        throw new BadRequestException(
          'No puedes degradar tu propio rol porque eres el único superadmin registrado.',
        );
      }
    }

    const previousRole = targetUser.role?.name || 'unknown';

    // 4. Buscar entidad de nuevo rol
    const newRoleEntity = await this.roleRepository.findOne({
      where: { name: dto.newRole },
    });

    if (!newRoleEntity) {
      throw new NotFoundException(`Rol ${dto.newRole} no encontrado en el sistema.`);
    }

    targetUser.role = newRoleEntity;
    const savedUser = await this.userRepository.save(targetUser);

    // 5. Registrar en Auditoría
    await this.auditService.logAction({
      action: AuditAction.USER_ROLE_CHANGED,
      entity: 'User',
      entityId: targetUser.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        previousRole: previousRole,
        newRole: dto.newRole,
        reason: dto.reason,
      },
    });

    const { password, ...safeUser } = savedUser;
    return {
      success: true,
      message: `Rol del usuario #${targetUserId} actualizado exitosamente a ${dto.newRole}.`,
      user: safeUser,
    };
  }

  /**
   * 🚫 ACTIVAR / DESACTIVAR CUENTA DE USUARIO
   */
  async updateStatus(
    targetUserId: number,
    requestingSuperadminId: number,
    dto: UpdateUserStatusDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.verifySuperadminPassword(
      requestingSuperadminId,
      dto.superadminPassword,
    );

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['role'],
    });

    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID #${targetUserId} no encontrado.`);
    }

    if (targetUser.id === superadmin.id && dto.isActive === false) {
      throw new BadRequestException('No puedes suspender tu propia cuenta de superadmin.');
    }

    const previousStatus = targetUser.isActive;
    targetUser.isActive = dto.isActive;
    const savedUser = await this.userRepository.save(targetUser);

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.USER_STATUS_CHANGED,
      entity: 'User',
      entityId: targetUser.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        previousStatus,
        newStatus: dto.isActive,
        reason: dto.reason,
      },
    });

    const { password, ...safeUser } = savedUser;
    return {
      success: true,
      message: `Estado del usuario #${targetUserId} actualizado a: ${dto.isActive ? 'Activo' : 'Suspendido'}.`,
      user: safeUser,
    };
  }

  /**
   * ✏️ EDITAR PERFIL DE USUARIO
   */
  async updateProfile(
    targetUserId: number,
    requestingSuperadminId: number,
    dto: SuperadminUpdateUserDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.userRepository.findOne({
      where: { id: requestingSuperadminId },
      relations: ['role'],
    });

    if (!superadmin) throw new NotFoundException('Superadmin no encontrado');

    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['role'],
    });

    if (!targetUser) {
      throw new NotFoundException(`Usuario con ID #${targetUserId} no encontrado.`);
    }

    // Verificar email duplicado si cambia
    if (dto.email && dto.email !== targetUser.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (emailExists && emailExists.id !== targetUserId) {
        throw new BadRequestException('El correo ingresado ya está en uso por otro usuario.');
      }
    }

    const previousData = {
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      address: targetUser.address,
    };

    if (dto.name !== undefined) targetUser.name = dto.name;
    if (dto.email !== undefined) targetUser.email = dto.email;
    if (dto.phone !== undefined) targetUser.phone = dto.phone;
    if (dto.address !== undefined) targetUser.address = dto.address;
    if (dto.password) {
      targetUser.password = dto.password; // @BeforeUpdate lo encriptará
    }

    const savedUser = await this.userRepository.save(targetUser);

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.USER_PROFILE_UPDATED,
      entity: 'User',
      entityId: targetUser.id,
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        previousData,
        updatedFields: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          passwordUpdated: !!dto.password,
        },
      },
    });

    const { password, ...safeUser } = savedUser;
    return {
      success: true,
      message: `Perfil del usuario #${targetUserId} actualizado exitosamente.`,
      user: safeUser,
    };
  }
}
