import { Controller, Post, Get, Patch, Delete, Param, Body, Req, ParseIntPipe } from '@nestjs/common';
import { ReservationsService } from '../service/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Req() req: any, @Body() createReservationDto: CreateReservationDto) {
    // Cuando integres tu JwtAuthGuard, aquí sacarás el ID del usuario logueado
    const userId = req.user?.id || 1; 
    return this.reservationsService.createReservation(userId, createReservationDto);
  }

  // 🟢 VISTA DEL CLIENTE: Solo ve sus propias reservas
  @Get()
  findAll(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.reservationsService.findAll(userId);
  }

  // 🟢 VISTA DEL ADMIN: Ve todas las reservas
  @Get('admin')
  findAllAdmin() {
    return this.reservationsService.findAllAdmin();
  }

  // 🟢 VISTA DEL ADMIN: Editar Reserva o Cambiar Estado (CRUD)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateReservationDto: UpdateReservationDto) {
    return this.reservationsService.update(id, updateReservationDto);
  }

  // 🟢 VISTA DEL ADMIN: Eliminar Reserva (CRUD)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.remove(id);
  }

  // Ruta original que ya tenías (mantenida por retrocompatibilidad)
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.approveReservation(id);
  }
}