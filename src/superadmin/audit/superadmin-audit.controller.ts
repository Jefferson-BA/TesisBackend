import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SuperadminAuditService } from './superadmin-audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('superadmin/audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPERADMIN')
export class SuperadminAuditController {
  constructor(private readonly auditService: SuperadminAuditService) {}

  @Get('actions')
  getAvailableActions() {
    return {
      success: true,
      data: this.auditService.getAvailableActions(),
    };
  }

  @Get('logs')
  findAll(@Query() queryDto: AuditQueryDto) {
    return this.auditService.findAll(queryDto);
  }

  @Get('logs/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auditService.findOne(id);
  }
}
