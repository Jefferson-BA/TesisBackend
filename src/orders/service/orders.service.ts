import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';

import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { Order } from '../entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../entities/order-item.entity';
import { MailService } from '../../mail/mail.service';
import { CartService } from '../../cart/service/cart.service';
import { OrderStatus } from '../enums/order.enums';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly cartService: CartService, // Se mantiene por si se usa el carrito en otras áreas
  ) {}

  /**
   * 🛒 CREAR ORDEN (Flujo Direct Checkout / Comprar Ahora)
   */
  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    // 1. Validar que vengan items directamente en el payload del frontend
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('No se enviaron productos/servicios para crear la orden.');
    }

    // Extraer IDs usando la llave correcta del DTO (productId)
    const productIds = createOrderDto.items.map((item) => item.productId);

    // 2. Iniciar Transacción Atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Bloqueo Pesimista (Pessimistic Write)
      // Evitamos LEFT JOINs automáticos con loadEagerRelations: false para que PostgreSQL no rompa el FOR UPDATE
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
        loadEagerRelations: false, 
        lock: { mode: 'pessimistic_write' },
      });

      const productsMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 4. Procesar los elementos enviados por el frontend
      for (const dtoItem of createOrderDto.items) {
        const product = productsMap.get(dtoItem.productId);

        if (!product) {
          throw new BadRequestException(`El producto con ID ${dtoItem.productId} ya no está disponible.`);
        }

        if (product.stock < dtoItem.quantity) {
          throw new BadRequestException(
            `No hay suficiente stock para: ${product.name}. Stock disponible: ${product.stock}`,
          );
        }

        // Calcular montos y descontar stock en memoria
        totalAmount += Number(product.price) * dtoItem.quantity;
        product.stock -= dtoItem.quantity;

        // Generar la fila del detalle de la orden
        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: product.id,
          quantity: dtoItem.quantity,
          price: product.price, // Precio congelado al momento de la compra
        });
        orderItems.push(orderItem);
      }

      // 5. Guardar actualización de stock masiva
      await queryRunner.manager.save(Product, products);

      // 6. Crear cabecera de la Orden
      const newOrder = queryRunner.manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress,
        city: createOrderDto.city,
        postalCode: createOrderDto.postalCode,
        phone: createOrderDto.phone,
        paymentMethod: createOrderDto.paymentMethod,
        reservationId: createOrderDto.reservationId,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, newOrder);

      // 7. (Opcional) Si el usuario tenía este carrito activo en BD, lo vaciamos por limpieza de estado
      const cart = await this.cartService.findOrCreateCart(userId);
      if (cart) {
        await queryRunner.manager.query(
          `DELETE FROM cart_items WHERE "cartId" = $1`,
          [cart.id],
        );
      }

      // 8. Confirmar Transacción
      await queryRunner.commitTransaction();

      // 9. Disparar correo asíncrono (No bloquea la velocidad de respuesta del HTTP)
      this.mailService.sendOrderConfirmation(
        'correo-de-prueba@gmail.com',
        savedOrder.id,
        savedOrder.totalAmount,
      );

      return savedOrder;

    } catch (error) {
      // Si algo falla, deshacemos todos los pasos concurrentes
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la orden: ' + (error as Error).message);
    } finally {
      // Liberar la conexión al pool
      await queryRunner.release();
    }
  }

  // ====================================================================
  // MÉTODOS PÚBLICOS DE GESTIÓN Y LECTURA (Admin / Customer)
  // ====================================================================

  /**
   * Listar órdenes con mapeo optimizado y los productos inyectados en la raíz
   */
  async findAll(userId: number, reservationId?: number) {
    const whereClause: any = {};

    if (reservationId) {
      whereClause.reservationId = reservationId;
    } else {
      whereClause.userId = userId;
    }

    // Traemos las relaciones necesarias incluyendo items y el producto interno de cada item
    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['user', 'reservation', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });

    // Moldeamos la respuesta exactamente como el Frontend la requiere
    return orders.map((order) => {
      const user = order.user as any;
      const reservation = order.reservation as any;

      return {
        id: order.id,
        fullName: user ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()) : 'No disponible',
        email: user?.email || 'No disponible',
        phone: user?.phone || 'No disponible',
        city: reservation?.city || order.city || 'No disponible',
        address: reservation?.venueAddress || order.shippingAddress || 'No disponible',
        postalCode: order.postalCode || 'No disponible',
        eventDate: reservation?.eventDate || 'No disponible',
        notes: reservation?.additionalNotes || 'Sin notas',
        total: Number(order.totalAmount || 0),
        paymentMethod: order.paymentMethod || 'No especificado',
        status: order.status || 'Pendiente',
        
        // ✨ SOLUCIÓN AL FRONTEND: Mapeo de platos directo en la raíz del pedido
        items: order.items ? order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: (item.product as any)?.name || 'Producto no disponible',
          price: Number(item.price || 0),
          quantity: item.quantity,
          subtotal: Number(item.price || 0) * item.quantity,
        })) : [],
      };
    });
  }

  /**
   * Ver el detalle a fondo de una orden en particular
   */
  async findOne(id: number, userId: number) {
    const order = await this.orderRepository.findOne({
      where: { id, userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`La orden #${id} no existe o no te pertenece.`);
    }
    return order;
  }

  /**
   * Cambiar el estado de la orden (Uso exclusivo de Admin)
   */
  async updateStatus(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderRepository.preload({
      id,
      ...updateOrderDto,
    });

    if (!order) throw new NotFoundException(`La orden #${id} no existe.`);

    return await this.orderRepository.save(order);
  }
}