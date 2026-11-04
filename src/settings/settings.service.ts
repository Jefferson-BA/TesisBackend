import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { SystemConfig } from '../superadmin/entities/system-config.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemConfig)
    private readonly repository: Repository<SystemConfig>,
    private readonly env: ConfigService,
  ) {}

  async get(
    key: string,
    fallback = '',
    manager?: EntityManager,
  ): Promise<string> {
    const repository = manager
      ? manager.getRepository(SystemConfig)
      : this.repository;
    const setting = await repository.findOneBy({ key });
    return setting?.value || this.env.get<string>(key) || fallback;
  }

  async totals(subtotal: number, manager?: EntityManager) {
    const taxRate = Number(await this.get('TAX_RATE', '0.18', manager));
    const delivery = Number(await this.get('DELIVERY_FEE', '5', manager));
    const minimum = Number(await this.get('MIN_ORDER_AMOUNT', '10', manager));
    if (
      ![taxRate, delivery, minimum].every(Number.isFinite) ||
      taxRate < 0 ||
      taxRate > 1 ||
      delivery < 0 ||
      minimum < 0
    ) {
      throw new ServiceUnavailableException(
        'Configuración financiera inválida',
      );
    }
    const subtotalCents = Math.round(subtotal * 100);
    const taxCents = Math.round(subtotalCents * taxRate);
    return {
      subtotal: subtotalCents / 100,
      tax: taxCents / 100,
      delivery,
      minimum,
      total: (subtotalCents + taxCents + Math.round(delivery * 100)) / 100,
    };
  }
}
