import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { Repository, FindOptionsWhere, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { QueryProductDto } from '../dto/query-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) { }

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

  async findAll(query: QueryProductDto) {
    const { limit = 10, page = 1, minPrice, maxPrice, category } = query;
    const skip = (page - 1) * limit; // Calcula cuántos productos saltarse

    const where: FindOptionsWhere<Product> = {};

    // 1. Filtro por categoría
    if (category) {
      where.category = { id: category };
    }

    // 2. Filtros por rango de precio
    if (minPrice && maxPrice) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice) {
      where.price = LessThanOrEqual(maxPrice);
    }

    // Buscamos los productos y contamos el total
    const [data, total] = await this.productRepository.findAndCount({
      where,
      take: limit,
      skip,
      relations: ['category'], // Opcional si ya tienes eager:true en la entidad
    });

    return {
      data,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
      },
    };
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