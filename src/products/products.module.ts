import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controllers/products.controller';
import { Product } from './entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])], // 👈 Registramos la tabla
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService], // 👈 Vital para que OrdersService pueda buscar los productos
})
export class ProductsModule {}