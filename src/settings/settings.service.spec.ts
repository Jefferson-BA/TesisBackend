import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SystemConfig } from '../superadmin/entities/system-config.entity';
import { SettingsService } from './settings.service';
describe('SettingsService', () => {
  const values: Record<string, string> = {
    TAX_RATE: '0.18',
    DELIVERY_FEE: '5',
    MIN_ORDER_AMOUNT: '10',
  };
  const repository = {
    findOneBy: jest.fn(({ key }: { key: string }) =>
      Promise.resolve(values[key] ? { value: values[key] } : null),
    ),
  };
  const service = new SettingsService(
    repository as unknown as Repository<SystemConfig>,
    new ConfigService({ CULQI_SECRET_KEY: 'environment-key' }),
  );
  it('calculates taxes and delivery in cents', async () => {
    await expect(service.totals(100)).resolves.toEqual({
      subtotal: 100,
      tax: 18,
      delivery: 5,
      minimum: 10,
      total: 123,
    });
  });
  it('uses updated database values before environment settings', async () => {
    values.CULQI_SECRET_KEY = 'database-key';
    await expect(service.get('CULQI_SECRET_KEY')).resolves.toBe('database-key');
  });
});
