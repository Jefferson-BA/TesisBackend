import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import {
  DataSource,
  EntityTarget,
  FindManyOptions,
  ObjectLiteral,
  Repository,
  getMetadataArgsStorage,
} from 'typeorm';
import { Order } from './entities/order.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { OrdersService } from './service/orders.service';
import { PaymentService } from '../payments/service/payment.service';
import { PromotionsService } from '../promotions/services/promotions.service';
import { SettingsService } from '../settings/settings.service';

class MetadataSource extends DataSource {
  prepare() {
    return this.buildMetadatas();
  }
}

describe('SQL de los bloqueos al crear órdenes', () => {
  let source: MetadataSource;
  beforeAll(async () => {
    source = new MetadataSource({
      type: 'postgres',
      entities: getMetadataArgsStorage()
        .tables.map((table) => table.target)
        .filter(
          (target): target is new () => ObjectLiteral =>
            typeof target === 'function',
        ),
    });
    await source.prepare();
  });

  function setup() {
    const queries: string[] = [];
    const sql = (
      entity: EntityTarget<ObjectLiteral>,
      options: FindManyOptions<ObjectLiteral>,
    ) => {
      queries.push(
        source
          .getRepository(entity)
          .createQueryBuilder()
          .setFindOptions(options)
          .getSql(),
      );
    };
    const manager = {
      findOne: jest.fn(
        (
          entity: EntityTarget<ObjectLiteral>,
          options: FindManyOptions<ObjectLiteral>,
        ) => {
          sql(entity, options);
          return Promise.resolve(
            entity === Reservation
              ? { id: 74, userId: 1, status: 'approved', items: [] }
              : { id: 81 },
          );
        },
      ),
      find: jest.fn(
        (
          entity: EntityTarget<ObjectLiteral>,
          options: FindManyOptions<ObjectLiteral>,
        ) => {
          sql(entity, options);
          return Promise.resolve([]);
        },
      ),
    };
    const runner = {
      manager,
      connect: jest.fn(),
      startTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      isTransactionActive: true,
    };
    const service = new OrdersService(
      {} as Repository<Order>,
      { createQueryRunner: () => runner } as unknown as DataSource,
      {} as PaymentService,
      {} as PromotionsService,
      {} as SettingsService,
    );
    return { service, queries };
  }

  it('genera el bloqueo de reservas con sus relaciones sin un error de alias', async () => {
    const { service, queries } = setup();
    await expect(service.createOrder(1, { reservationId: 74 })).rejects.toThrow(
      'La reserva ya tiene una orden vigente',
    );
    expect(queries[0]).toContain('FOR UPDATE OF "Reservation"');
  });

  it('genera el bloqueo de productos antes de validar su disponibilidad', async () => {
    const { service, queries } = setup();
    await expect(
      service.createOrder(1, {
        shippingAddress: 'Av. Principal 123',
        items: [
          { productId: '00000000-0000-4000-8000-000000000001', quantity: 1 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queries[0]).toContain('FOR UPDATE OF "Product"');
  });
});
