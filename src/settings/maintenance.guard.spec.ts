import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { MaintenanceGuard } from './maintenance.guard';
import { SettingsService } from './settings.service';
describe('MaintenanceGuard', () => {
  const settings = { get: jest.fn().mockResolvedValue('true') };
  const guard = new MaintenanceGuard(settings as unknown as SettingsService);
  const context = (path: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ path }) }),
    }) as unknown as ExecutionContext;
  it('blocks business operations while maintenance is enabled', async () => {
    await expect(guard.canActivate(context('/orders'))).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('keeps authentication and protected recovery endpoints available', async () => {
    await expect(guard.canActivate(context('/auth/login'))).resolves.toBe(true);
    await expect(
      guard.canActivate(context('/superadmin/config')),
    ).resolves.toBe(true);
  });
});
