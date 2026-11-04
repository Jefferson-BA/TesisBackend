import type { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CartService } from '../service/cart.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('cart')
@UseGuards(AuthGuard('jwt')) // 👈 Protegemos TODO el carrito. Nadie entra sin token.
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // 1. Obtener el carrito del usuario logueado
  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id; // 👈 Extraemos el ID del usuario desde el JWT
    return this.cartService.findOrCreateCart(userId);
  }

  // 2. Agregar un producto al carrito (o sumarle cantidad si ya existe)
  @Post('item')
  addItem(
    @Req() req: AuthenticatedRequest,
    @Body('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    const userId = req.user.id;
    return this.cartService.addItemToCart(userId, productId, quantity);
  }

  // 3. Actualizar la cantidad de un producto específico en el carrito
  @Patch('item/:productId')
  updateItemQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body('quantity') quantity: number,
  ) {
    const userId = req.user.id;
    return this.cartService.updateItemQuantity(userId, productId, quantity);
  }

  // 4. Eliminar un producto del carrito
  @Delete('item/:productId')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('productId') productId: string,
  ) {
    const userId = req.user.id;
    return this.cartService.removeItemFromCart(userId, productId);
  }

  // 5. Vaciar el carrito por completo (útil después de comprar)
  @Delete()
  clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.cartService.clearCart(userId);
  }
}
