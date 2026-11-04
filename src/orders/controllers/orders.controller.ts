import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PayOrderDto } from '../dto/pay-order.dto';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrdersService } from '../service/orders.service';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(AuthGuard('jwt')) // 🛡️ Todas las rutas de compras exigen estar logueado
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Post(':id/pay')
  payOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() payOrderDto: PayOrderDto, // 👈 Se valida automáticamente con el DTO
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.ordersService.payOrder(id, userId, payOrderDto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('reservationId', new DefaultValuePipe(0), ParseIntPipe)
    reservationId?: number,
  ) {
    const userId = req.user.id;
    return this.ordersService.findAll(userId, reservationId || undefined);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.ordersService.findOne(id, userId);
  }

  @Get(':id/payment-status')
  paymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.paymentStatus(id, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto);
  }
}
