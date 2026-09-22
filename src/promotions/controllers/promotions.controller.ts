import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PromotionsService } from '../services/promotions.service';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  // ── RUTA PÚBLICA — debe ir PRIMERO para no colisionar con /:id ────────────

  /**
   * GET /promotions/active
   * Retorna solo las promociones activas y vigentes (dentro del rango de fechas).
   * Usado por la página principal del usuario para mostrar banners y badges de descuento.
   */
  @Get('active')
  findActive() {
    return this.promotionsService.findActive();
  }

  // ── RUTAS DE ADMIN (JWT + rol admin) ──────────────────────────────────────

  /**
   * POST /promotions
   * Crea una nueva promoción. Solo accesible por el admin.
   */
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionsService.create(createPromotionDto);
  }

  /**
   * GET /promotions
   * Lista TODAS las promociones (activas e inactivas) para el panel admin.
   */
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  findAll() {
    return this.promotionsService.findAll();
  }

  /**
   * GET /promotions/:id
   * Detalle de una promoción específica (admin).
   */
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.findOne(id);
  }

  /**
   * PATCH /promotions/:id
   * Actualiza una promoción. Solo admin.
   */
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, updatePromotionDto);
  }

  /**
   * DELETE /promotions/:id
   * Elimina una promoción. Solo admin.
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionsService.remove(id);
  }
}

