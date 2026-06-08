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

import { ReservationsService } from '../service/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
  ) {}

  // 🟢 CREAR RESERVA: Ahora es obligatorio estar logueado
  @UseGuards(AuthGuard('jwt')) 
  @Post()
  create(
    @Req() req: any,
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
  findAll(@Req() req: any) {
    const userId = req.user.id; 

    return this.reservationsService.findAll(userId);
  }

  // 🟢 VISTA DEL ADMIN: Ve todas las reservas (Acepta paginación y filtros)
  @UseGuards(AuthGuard('jwt')) 
  @Get('admin')
  findAllAdmin(
    @Query('status') status?: string,
    @Query('page') page: string = '1',   // 👈 Parámetro de página
    @Query('limit') limit: string = '10' // 👈 Parámetro de límite
  ) {
    // Los convertimos a número usando el signo +
    return this.reservationsService.findAllAdmin(status, +page, +limit);
  }

  // 🟢 VISTA DEL ADMIN: Editar Reserva o Cambiar Estado (CRUD)
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  // 🟢 VISTA DEL ADMIN: Eliminar Reserva (CRUD)
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }

  // Ruta mantenida por retrocompatibilidad
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.approveReservation(id);
  }
}