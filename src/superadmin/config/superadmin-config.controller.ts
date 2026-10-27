import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { getClientInfo } from '../common/utils/client-info.util';

import { SuperadminConfigService } from './superadmin-config.service';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';
import { ToggleMaintenanceDto } from './dto/toggle-maintenance.dto';

@Controller('superadmin/config')
export class SuperadminConfigController {
  constructor(private readonly configService: SuperadminConfigService) {}

  /**
   * 📡 Estado público de modo mantenimiento (Para verificación del Frontend sin token)
   */
  @Get('maintenance-mode/status')
  getMaintenanceStatus() {
    return this.configService.getMaintenanceStatus();
  }

  /**
   * 📋 Listar configuraciones del sistema (Protegido Superadmin)
   */
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  findAll() {
    return this.configService.findAll();
  }

  /**
   * 🔍 Consultar configuración específica (Protegido Superadmin)
   */
  @Get(':key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  findOne(@Param('key') key: string) {
    return this.configService.findOne(key);
  }

  /**
   * ✏️ Actualizar configuración o llave API (Protegido Superadmin)
   */
  @Patch(':key')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.configService.update(key, req.user.id, dto, clientInfo);
  }

  /**
   * 🚨 Toggle modo mantenimiento (Protegido Superadmin)
   */
  @Post('maintenance-mode/toggle')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SUPERADMIN')
  toggleMaintenance(@Body() dto: ToggleMaintenanceDto, @Req() req: any) {
    const clientInfo = getClientInfo(req);
    return this.configService.toggleMaintenance(req.user.id, dto, clientInfo);
  }
}
