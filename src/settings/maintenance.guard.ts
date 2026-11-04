import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SettingsService } from './settings.service';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    // Authentication and protected superadmin operations remain available for recovery.
    if (/^\/(auth|superadmin)(\/|$)/.test(request.path)) return true;
    if (
      (await this.settings.get('MAINTENANCE_MODE', 'false')).toLowerCase() ===
      'true'
    ) {
      throw new ServiceUnavailableException(
        await this.settings.get(
          'MAINTENANCE_MESSAGE',
          'Sistema en mantenimiento',
        ),
      );
    }
    return true;
  }
}
