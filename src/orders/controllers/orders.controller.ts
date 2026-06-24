import {
  Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Req, UseGuards, Query
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
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    const userId = req.user.id;
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Post(':id/pay')
  payOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() payOrderDto: PayOrderDto, // 👈 Se valida automáticamente con el DTO
    @Req() req: any
  ) {
    const userId = req.user.id;
    return this.ordersService.payOrder(id, userId, payOrderDto);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('reservationId') reservationId?: string
  ) {
    const userId = req.user.id;
    return this.ordersService.findAll(userId, reservationId ? Number(reservationId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto);
  }
}