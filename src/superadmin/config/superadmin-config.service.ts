import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { SystemConfig, ConfigCategory } from '../entities/system-config.entity';
import { User } from '../../users/entities/user.entity';
import { SuperadminAuditService } from '../audit/superadmin-audit.service';
import { AuditAction } from '../entities/audit-log.entity';
import { ClientInfo } from '../common/utils/client-info.util';

import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { ToggleMaintenanceDto } from './dto/toggle-maintenance.dto';

@Injectable()
export class SuperadminConfigService implements OnModuleInit {
  private readonly logger = new Logger(SuperadminConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepository: Repository<SystemConfig>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: SuperadminAuditService,
  ) {}

  /**
   * 🚀 INICIALIZACIÓN DE PARÁMETROS BASE
   * Se cargan automáticamente los parámetros críticos si la tabla está vacía
   */
  async onModuleInit() {
    try {
      const count = await this.configRepository.count();
      if (count === 0) {
        this.logger.log('Inicializando configuraciones globales del sistema...');
        const initialConfigs: Partial<SystemConfig>[] = [
          {
            key: 'MAINTENANCE_MODE',
            value: 'false',
            category: ConfigCategory.GENERAL,
            description: 'Activa o desactiva el modo mantenimiento global de la plataforma',
            isSecret: false,
          },
          {
            key: 'MAINTENANCE_MESSAGE',
            value: 'El sistema se encuentra en mantenimiento programado. Volveremos pronto.',
            category: ConfigCategory.GENERAL,
            description: 'Mensaje visible para comensales durante el modo mantenimiento',
            isSecret: false,
          },
          {
            key: 'TAX_RATE',
            value: '0.18',
            category: ConfigCategory.FINANCIAL,
            description: 'Tasa de impuesto IGV aplicado en facturación (ej. 0.18 = 18%)',
            isSecret: false,
          },
          {
            key: 'DELIVERY_FEE',
            value: '5.00',
            category: ConfigCategory.FINANCIAL,
            description: 'Costo fijo base por servicio de delivery en Soles (PEN)',
            isSecret: false,
          },
          {
            key: 'MIN_ORDER_AMOUNT',
            value: '10.00',
            category: ConfigCategory.FINANCIAL,
            description: 'Monto mínimo en Soles (PEN) requerido para emitir un pedido',
            isSecret: false,
          },
          {
            key: 'SUPPORT_PHONE',
            value: '+51 987 654 321',
            category: ConfigCategory.GENERAL,
            description: 'Teléfono o WhatsApp de atención al cliente de la sede principal',
            isSecret: false,
          },
          {
            key: 'CULQI_SECRET_KEY',
            value: process.env.CULQI_SECRET_KEY || 'sk_test_QN6iSkVTTh32WaTU',
            category: ConfigCategory.INTEGRATIONS,
            description: 'Llave privada / Secret Key de la pasarela de pagos Culqi',
            isSecret: true,
          },
          {
            key: 'OPENROUTER_API_KEY',
            value: process.env.OPENROUTER_API_KEY || 'sk-or-v1-placeholder',
            category: ConfigCategory.INTEGRATIONS,
            description: 'API Key del proveedor de modelos de Inteligencia Artificial',
            isSecret: true,
          },
          {
            key: 'GEMINI_API_KEY',
            value: process.env.GEMINI_API_KEY || 'AIzaSy-placeholder',
            category: ConfigCategory.INTEGRATIONS,
            description: 'API Key de Google Gemini para el asistente virtual',
            isSecret: true,
          },
        ];

        for (const conf of initialConfigs) {
          const entity = this.configRepository.create(conf);
          await this.configRepository.save(entity);
        }
        this.logger.log('Configuraciones globales inicializadas con éxito.');
      }
    } catch (error: any) {
      this.logger.warn(`No se pudo inicializar las configuraciones base: ${error.message}`);
    }
  }

  /**
   * 🎭 ENMASCARAMIENTO DE CREDENCIALES SENSIBLES
   * Transforma "sk_test_QN6iSkVTTh32WaTU" en "sk_t••••••••WaTU"
   */
  private maskSensitiveValue(value: string): string {
    if (!value) return '';
    if (value.length <= 8) {
      return '••••••••';
    }
    const start = value.slice(0, 4);
    const end = value.slice(-4);
    return `${start}••••••••${end}`;
  }

  /**
   * 🔐 CONFIRMACIÓN DE CONTRASEÑA DE SUPERADMIN
   */
  private async verifySuperadminPassword(
    superadminId: number,
    providedPassword?: string,
  ): Promise<User> {
    if (!providedPassword) {
      throw new ForbiddenException(
        'Debes ingresar tu contraseña de superadmin para modificar credenciales o configuraciones críticas.',
      );
    }

    const superadmin = await this.userRepository.findOne({
      where: { id: superadminId },
    });

    if (!superadmin) {
      throw new NotFoundException('Superadmin autenticado no encontrado.');
    }

    const isValid = await bcrypt.compare(providedPassword, superadmin.password);
    if (!isValid) {
      throw new ForbiddenException(
        'Contraseña de superadmin incorrecta. Operación de configuración rechazada.',
      );
    }

    return superadmin;
  }

  /**
   * 📋 LISTAR TODAS LAS CONFIGURACIONES (Con llaves secretas enmascaradas)
   */
  async findAll() {
    const configs = await this.configRepository.find({
      order: { category: 'ASC', key: 'ASC' },
    });

    return configs.map((c) => ({
      id: c.id,
      key: c.key,
      value: c.isSecret ? this.maskSensitiveValue(c.value) : c.value,
      category: c.category,
      description: c.description,
      isSecret: c.isSecret,
      updatedByName: c.updatedByName,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * 🔍 CONSULTAR CONFIGURACIÓN ESPECÍFICA
   */
  async findOne(key: string) {
    const config = await this.configRepository.findOne({
      where: { key: key.toUpperCase() },
    });

    if (!config) {
      throw new NotFoundException(`Parámetro de configuración '${key}' no encontrado.`);
    }

    return {
      id: config.id,
      key: config.key,
      value: config.isSecret ? this.maskSensitiveValue(config.value) : config.value,
      category: config.category,
      description: config.description,
      isSecret: config.isSecret,
      updatedByName: config.updatedByName,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * ✏️ ACTUALIZAR CONFIGURACIÓN O CREDENCIAL
   */
  async update(
    key: string,
    superadminId: number,
    dto: UpdateSystemConfigDto,
    clientInfo: ClientInfo,
  ) {
    const upperKey = key.toUpperCase();
    const config = await this.configRepository.findOne({
      where: { key: upperKey },
    });

    if (!config) {
      throw new NotFoundException(`Parámetro de configuración '${key}' no encontrado.`);
    }

    // Si es secreto, exigir contraseña de superadmin
    let superadmin: User | null = null;
    if (config.isSecret) {
      superadmin = await this.verifySuperadminPassword(superadminId, dto.superadminPassword);
    } else {
      superadmin = await this.userRepository.findOne({ where: { id: superadminId } });
    }

    const previousValue = config.isSecret ? this.maskSensitiveValue(config.value) : config.value;
    config.value = dto.value;
    if (dto.description) config.description = dto.description;
    config.updatedById = superadminId;
    config.updatedByName = superadmin?.name || 'Superadmin';

    const saved = await this.configRepository.save(config);

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.SYSTEM_CONFIG_UPDATED,
      entity: 'SystemConfig',
      entityId: config.key,
      performedBy: superadmin || ({ id: superadminId } as any),
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        key: config.key,
        previousValue: previousValue,
        newValue: config.isSecret ? this.maskSensitiveValue(dto.value) : dto.value,
        isSecret: config.isSecret,
      },
    });

    return {
      success: true,
      message: `Configuración '${config.key}' actualizada exitosamente.`,
      config: {
        id: saved.id,
        key: saved.key,
        value: saved.isSecret ? this.maskSensitiveValue(saved.value) : saved.value,
        category: saved.category,
        description: saved.description,
        isSecret: saved.isSecret,
        updatedAt: saved.updatedAt,
      },
    };
  }

  /**
   * 🚨 ACTIVAR O DESACTIVAR MODO MANTENIMIENTO
   */
  async toggleMaintenance(
    superadminId: number,
    dto: ToggleMaintenanceDto,
    clientInfo: ClientInfo,
  ) {
    const superadmin = await this.verifySuperadminPassword(
      superadminId,
      dto.superadminPassword,
    );

    let modeConfig = await this.configRepository.findOne({
      where: { key: 'MAINTENANCE_MODE' },
    });

    if (!modeConfig) {
      modeConfig = this.configRepository.create({
        key: 'MAINTENANCE_MODE',
        value: String(dto.enabled),
        category: ConfigCategory.GENERAL,
        description: 'Activa o desactiva el modo mantenimiento global de la plataforma',
      });
    } else {
      modeConfig.value = String(dto.enabled);
    }

    modeConfig.updatedById = superadminId;
    modeConfig.updatedByName = superadmin.name;
    await this.configRepository.save(modeConfig);

    // Mensaje de mantenimiento si fue provisto
    if (dto.message) {
      let msgConfig = await this.configRepository.findOne({
        where: { key: 'MAINTENANCE_MESSAGE' },
      });
      if (!msgConfig) {
        msgConfig = this.configRepository.create({
          key: 'MAINTENANCE_MESSAGE',
          value: dto.message,
          category: ConfigCategory.GENERAL,
          description: 'Mensaje visible para comensales durante el modo mantenimiento',
        });
      } else {
        msgConfig.value = dto.message;
      }
      msgConfig.updatedById = superadminId;
      msgConfig.updatedByName = superadmin.name;
      await this.configRepository.save(msgConfig);
    }

    // Auditoría
    await this.auditService.logAction({
      action: AuditAction.MAINTENANCE_MODE_TOGGLED,
      entity: 'SystemConfig',
      entityId: 'MAINTENANCE_MODE',
      performedBy: superadmin,
      ipAddress: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      details: {
        maintenanceMode: dto.enabled,
        customMessage: dto.message,
      },
    });

    return {
      success: true,
      message: `Modo mantenimiento ${dto.enabled ? 'ACTIVADO' : 'DESACTIVADO'} correctamente.`,
      maintenanceMode: dto.enabled,
      customMessage: dto.message,
    };
  }

  /**
   * 📡 CONSULTA RÁPIDA DE ESTADO DE MANTENIMIENTO (Pública / Interna)
   */
  async getMaintenanceStatus() {
    const modeConfig = await this.configRepository.findOne({
      where: { key: 'MAINTENANCE_MODE' },
    });
    const msgConfig = await this.configRepository.findOne({
      where: { key: 'MAINTENANCE_MESSAGE' },
    });

    const inMaintenance = modeConfig ? modeConfig.value.toLowerCase() === 'true' : false;
    const message = msgConfig ? msgConfig.value : 'Sistema operativo';

    return {
      inMaintenance,
      message,
    };
  }
}
