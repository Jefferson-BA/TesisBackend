import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const existingProduct = await this.productRepository.findOne({ where: { name: createProductDto.name } });
    if (existingProduct) throw new ConflictException('Ya existe un producto con este nombre');

    // Mapeamos el categoryId para que TypeORM entienda la relación
    const product = this.productRepository.create({
      ...createProductDto,
      category: { id: createProductDto.categoryId } // 👈 Magia relacional de TypeORM
    });

    return await this.productRepository.save(product);
  }

  async findAll() {
    // Como pusimos "eager: true" en la Entidad, esto traerá la categoría automáticamente
    return await this.productRepository.find();
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.findOne(id);

    // Si el Admin quiere cambiar el producto de categoría, preparamos la actualización
    let categoryUpdate = {};
    if (updateProductDto.categoryId) {
       categoryUpdate = { category: { id: updateProductDto.categoryId } };
    }

    const updatedProduct = this.productRepository.merge(product, {
      ...updateProductDto,
      ...categoryUpdate
    });

    return await this.productRepository.save(updatedProduct);
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { message: 'Producto eliminado del catálogo' };
  }
}