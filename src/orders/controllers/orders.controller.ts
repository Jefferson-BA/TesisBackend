import { 
  Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Req, UseGuards 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from '../orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('orders')
@UseGuards(AuthGuard('jwt')) // 🛡️ Todas las rutas de compras exigen estar logueado
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    // Tomamos el ID real del usuario desde el Token JWT
    const userId = req.user.id; 
    return this.ordersService.create(createOrderDto, userId);
  }

  @Get()
  findAll(@Req() req: any) {
    const userId = req.user.id;
    return this.ordersService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user.id;
    return this.ordersService.findOne(id, userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard) // 🛡️ Activamos el guardián de roles
  @Roles('ADMIN', 'SUPERADMIN') // 🔑 Solo administradores pueden cambiar el estado
  updateStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateOrderDto: UpdateOrderDto
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto);
  }
}