import { Controller, Post, Get, Patch, Param, Body, Req, ParseIntPipe } from '@nestjs/common';
import { ReservationsService } from '../service/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  create(@Req() req: any, @Body() createReservationDto: CreateReservationDto) {
    // Cuando integres tu JwtAuthGuard, aquí sacarás el ID del usuario logueado
    const userId = req.user?.id || 1; 
    return this.reservationsService.createReservation(userId, createReservationDto);
  }

  @Get()
  findAll() {
    return this.reservationsService.findAll();
  }

  // Ruta exclusiva del Admin para aprobar la viabilidad del evento
  @Patch(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.reservationsService.approveReservation(id);
  }
}