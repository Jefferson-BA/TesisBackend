import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from '../cart/cart.service';
import { CartController } from '../cart/cart.controller';
// 👇 Asegúrate de importar tus entidades del carrito
import { Cart } from './entities/cart.entity'; 
import { CartItem } from './entities/cart-item.entity'; // (Si tienes esta entidad)

@Module({
  // 👇 AQUÍ ESTÁ LA MAGIA QUE FALTA
  imports: [TypeOrmModule.forFeature([Cart, CartItem])], 
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}