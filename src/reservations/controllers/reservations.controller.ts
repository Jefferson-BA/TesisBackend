import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

import { ReservationsService } from '../service/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // 🟢 CREAR RESERVA: Ahora es obligatorio estar logueado
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    const userId = req.user.id;

    return this.reservationsService.createReservation(
      userId,
      createReservationDto,
    );
  }

  // 🟢 VISTA DEL CLIENTE: Solo ve sus propias reservas
  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;

    return this.reservationsService.findAll(userId);
  }

  // 🟢 VISTA DEL ADMIN: Ve todas las reservas (Acepta paginación y filtros)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin')
  @Roles('ADMIN', 'SUPERADMIN')
  findAllAdmin(
    @Query('status') status?: string,
    @Query('page') page: string = '1', // 👈 Parámetro de página
    @Query('limit') limit: string = '10', // 👈 Parámetro de límite
  ) {
    // Los convertimos a número usando el signo +
    return this.reservationsService.findAllAdmin(status, +page, +limit);
  }

  // 🟢 VISTA DEL ADMIN: Editar Reserva o Cambiar Estado (CRUD)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  // 🟢 VISTA DEL ADMIN: Eliminar Reserva (CRUD)
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @Roles('ADMIN', 'SUPERADMIN')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }

  // Ruta mantenida por retrocompatibilidad
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/approve')
  @Roles('ADMIN', 'SUPERADMIN')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.approveReservation(id);
  }
}
