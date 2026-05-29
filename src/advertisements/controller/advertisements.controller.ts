import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { AdvertisementsService } from '../services/advertisements.service';
import { CreateAdvertisementDto } from '../dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from '../dto/update-advertisement.dto';

@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  // 🛡️ Nota: En el futuro, POST, PATCH y DELETE deberían llevar tu @UseGuards(AuthGuard('jwt'), RolesGuard) 
  // para que solo los administradores puedan crear o modificar promociones.

  @Post()
  create(@Body() createAdvertisementDto: CreateAdvertisementDto) {
    return this.advertisementsService.create(createAdvertisementDto);
  }

  // Ruta para el Admin (ve todas las promociones)
  @Get()
  findAll() {
    return this.advertisementsService.findAll();
  }

  // Ruta para el E-commerce Público (ve solo las activas)
  @Get('active')
  findActive() {
    return this.advertisementsService.findActive();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.advertisementsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateAdvertisementDto: UpdateAdvertisementDto
  ) {
    return this.advertisementsService.update(id, updateAdvertisementDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.advertisementsService.remove(id);
  }
}