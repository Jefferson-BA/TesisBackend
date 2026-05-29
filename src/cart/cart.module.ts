import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './service/cart.service';
import { CartController } from './controller/cart.controller';
// 👇 Asegúrate de importar tus entidades del carrito
import { Cart } from './entities/cart.entity'; 
import { CartItem } from './entities/cart-item.entity'; // (Si tienes esta entidad)
import { ProductsModule } from 'src/products/products.module';

@Module({
  // 👇 AQUÍ ESTÁ LA MAGIA QUE FALTA
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    ProductsModule, // 👈 ¡ESTO EVITA EL CONFLICTO! Permite usar los productos aquí.
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}