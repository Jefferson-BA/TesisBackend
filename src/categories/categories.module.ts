import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from '../categories/categories.service';
import { CategoriesController } from '../categories/categories.controller';
import { Category } from './entities/category.entity'; // Asegúrate de importar la entidad

@Module({
  // 👇 ESTO ES LO QUE SUELE FALTAR
  imports: [TypeOrmModule.forFeature([Category])], 
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}