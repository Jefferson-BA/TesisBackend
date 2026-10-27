import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../entities/audit-log.entity';
import { AuditQueryDto } from './dto/audit-query.dto';

export interface CreateAuditLogParams {
  action: AuditAction | string;
  entity: string;
  entityId?: string | number | null;
  performedBy: {
    id: number;
    name?: string;
    email?: string;
    role?: any;
  };
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, any>;
}

@Injectable()
export class SuperadminAuditService {
  private readonly logger = new Logger(SuperadminAuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * 📝 REGISTRAR ACCIÓN CRÍTICA
   * Registra automáticamente la acción en la base de datos de auditoría
   */
  async logAction(params: CreateAuditLogParams): Promise<AuditLog> {
    try {
      const performedByRole =
        typeof params.performedBy.role === 'string'
          ? params.performedBy.role
          : params.performedBy.role?.name || 'UNKNOWN';

      const log = this.auditRepository.create({
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : undefined,
        performedById: params.performedBy.id,
        performedByName: params.performedBy.name || 'Sin Nombre',
        performedByEmail: params.performedBy.email || 'Sin Email',
        performedByRole: performedByRole,
        ipAddress: params.ipAddress || '127.0.0.1',
        userAgent: params.userAgent || 'Unknown',
        details: params.details || {},
      });

      const saved = await this.auditRepository.save(log);
      this.logger.log(
        `[AUDIT] Action: ${params.action} | Entity: ${params.entity} #${params.entityId || 'N/A'} by User #${params.performedBy.id} (${params.ipAddress})`,
      );
      return saved;
    } catch (error: any) {
      this.logger.error(`Error guardando log de auditoría: ${error.message}`, error.stack);
      // No dejamos que falle la operación principal si la auditoría falla
      return null as any;
    }
  }

  /**
   * 🔍 CONSULTAR LOGS CON FILTROS Y PAGINACIÓN
   */
  async findAll(queryDto: AuditQueryDto) {
    const {
      limit = 20,
      offset = 0,
      action,
      entity,
      performedById,
      startDate,
      endDate,
      search,
    } = queryDto;

    const queryBuilder = this.auditRepository.createQueryBuilder('log');

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (entity) {
      queryBuilder.andWhere('log.entity = :entity', { entity });
    }

    if (performedById) {
      queryBuilder.andWhere('log.performedById = :performedById', { performedById });
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: end });
    }

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(log.performedByName) LIKE :search OR LOWER(log.performedByEmail) LIKE :search OR log.ipAddress LIKE :search OR log.entityId LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    queryBuilder.orderBy('log.createdAt', 'DESC');
    queryBuilder.take(limit);
    queryBuilder.skip(offset);

    const [logs, total] = await queryBuilder.getManyAndCount();

    return {
      data: logs,
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
   * 🔎 CONSULTAR LOG INDIVIDUAL
   */
  async findOne(id: number): Promise<AuditLog> {
    const log = await this.auditRepository.findOne({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Registro de auditoría #${id} no encontrado.`);
    }
    return log;
  }

  /**
   * 📋 LISTAR ACCIONES DISPONIBLES PARA FILTROS
   */
  getAvailableActions() {
    return Object.values(AuditAction);
  }
}
