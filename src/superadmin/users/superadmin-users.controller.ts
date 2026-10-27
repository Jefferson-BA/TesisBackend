import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { getClientInfo } from '../common/utils/client-info.util';

import { SuperadminUsersService } from './superadmin-users.service';
import { ListSuperadminUsersDto } from './dto/list-superadmin-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { SuperadminUpdateUserDto } from './dto/superadmin-update-user.dto';

@Controller('superadmin/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SUPERADMIN')
export class SuperadminUsersController {
  constructor(private readonly superadminUsersService: SuperadminUsersService) {}

  @Get()
  findAll(@Query() queryDto: ListSuperadminUsersDto) {
    return this.superadminUsersService.findAll(queryDto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.superadminUsersService.findOne(id);
  }

  @Patch(':id/role')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.superadminUsersService.updateRole(id, req.user.id, dto, clientInfo);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.superadminUsersService.updateStatus(id, req.user.id, dto, clientInfo);
  }

  @Patch(':id/profile')
  updateProfile(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuperadminUpdateUserDto,
    @Req() req: any,
  ) {
    const clientInfo = getClientInfo(req);
    return this.superadminUsersService.updateProfile(id, req.user.id, dto, clientInfo);
  }
}
