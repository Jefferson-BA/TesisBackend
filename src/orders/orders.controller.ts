import { 
  Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Req 
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  // Idealmente aquí tendrías un @UseGuards(JwtAuthGuard)
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // En producción, el ID del usuario vendrá del token de autenticación.
    // Por ahora, simularemos que el usuario 1 está comprando.
    const userId = req.user?.id || 1; 
    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user?.id || 1;
    return this.ordersService.findAll(userId);
  }

  @Get(':id')
  // ParseIntPipe asegura que 'id' en la URL sea un número y no texto
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id || 1;
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/status')
  // Este endpoint suele estar protegido para que solo un Administrador lo use
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateOrderDto: UpdateOrderDto
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto);
  }
}