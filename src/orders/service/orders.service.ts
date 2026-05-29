import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CartService } from '../../cart/service/cart.service'; // Asegúrate de que esta ruta coincida con tu estructura
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { OrderStatus } from '../enums/order.enums';

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cartService: CartService,
  ) {}

  async createOrderFromCart(userId: number, createOrderDto: CreateOrderDto) {
    // 1. Obtener carrito
    const cart = await this.cartService.findOrCreateCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío, no se puede crear una orden.');
    }

    // 2. Iniciar Transacción Atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 3. Procesar productos
      for (const cartItem of cart.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: cartItem.product.id }, // Aquí tu ID ya es UUID como lo definiste
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) throw new BadRequestException('Producto no encontrado.');
        
        if (product.stock < cartItem.quantity) {
          throw new BadRequestException(`No hay suficiente stock para: ${product.name}. Stock actual: ${product.stock}`);
        }

        totalAmount += Number(product.price) * cartItem.quantity;
        product.stock -= cartItem.quantity;
        await queryRunner.manager.save(product);

        // Adaptado a tu propiedad 'price'
        const orderItem = queryRunner.manager.create(OrderItem, {
          product: product,
          quantity: cartItem.quantity,
          price: product.price, 
        });
        orderItems.push(orderItem);
      }

      // 4. Crear la cabecera de la Orden usando tus enums y el DTO
      const newOrder = queryRunner.manager.create(Order, {
        userId: userId,
        totalAmount: totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress,
        city: createOrderDto.city,
        postalCode: createOrderDto.postalCode,
        phone: createOrderDto.phone,
        paymentMethod: createOrderDto.paymentMethod,
        items: orderItems,
      });

      await queryRunner.manager.save(newOrder);

      // 5. Vaciar el carrito
      await queryRunner.manager.query(`DELETE FROM cart_items WHERE "cartId" = $1`, [cart.id]);

      // 6. Éxito
      await queryRunner.commitTransaction();
      return newOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la orden: ' + (error as Error).message);
    } finally {
      await queryRunner.release();
    }
  }
}