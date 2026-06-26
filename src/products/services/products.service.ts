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

    const product = this.productRepository.create({
      ...createProductDto,
      category: { id: createProductDto.categoryId }
    });

    return await this.productRepository.save(product);
  }

  async findAll(query: QueryProductDto) {
    // Extraemos isActive usando 'as any' temporalmente por si aún no lo agregas a tu QueryProductDto
    const { limit = 10, page = 1, minPrice, maxPrice, category } = query;
    const isActive = (query as any).isActive; 
    
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Product> = {};

    // 👇 FILTRO EMPRESARIAL: Por defecto solo traemos productos activos.
    // El admin puede enviar isActive=false o isActive=all para ver el resto.
    if (isActive !== undefined && isActive !== 'all') {
      where.isActive = String(isActive) === 'true';
    } else if (isActive === undefined) {
      where.isActive = true; 
    }

    if (category) {
      where.category = { id: category };
    }

    if (minPrice && maxPrice) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const [data, total] = await this.productRepository.findAndCount({
      where,
      take: limit,
      skip,
      relations: ['category'],
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
    

    await this.productRepository.softRemove(product);
    
    return { message: 'Producto eliminado (archivado) exitosamente' };
  }
}