import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLog } from './entities/audit-log.entity';
import { SystemConfig } from './entities/system-config.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Order } from '../orders/entities/order.entity';
import { Reservation } from '../reservations/entities/reservation.entity';

import { CulqiService } from '../payments/service/culqi.service';

import { SuperadminAuditService } from './audit/superadmin-audit.service';
import { SuperadminAuditController } from './audit/superadmin-audit.controller';

import { SuperadminUsersService } from './users/superadmin-users.service';
import { SuperadminUsersController } from './users/superadmin-users.controller';

import { SuperadminFinanceService } from './finance/superadmin-finance.service';
import { SuperadminFinanceController } from './finance/superadmin-finance.controller';

import { SuperadminConfigService } from './config/superadmin-config.service';
import { SuperadminConfigController } from './config/superadmin-config.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLog,
      SystemConfig,
      User,
      Role,
      Order,
      Reservation,
    ]),
  ],
  controllers: [
    SuperadminAuditController,
    SuperadminUsersController,
    SuperadminFinanceController,
    SuperadminConfigController,
  ],
  providers: [
    CulqiService,
    SuperadminAuditService,
    SuperadminUsersService,
    SuperadminFinanceService,
    SuperadminConfigService,
  ],
  exports: [
    SuperadminAuditService,
    SuperadminConfigService,
  ],
})
export class SuperadminModule {}
