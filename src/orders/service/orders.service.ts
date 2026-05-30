import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';

import {CreateOrderDto} from '../dto/create-order.dto'
import {UpdateOrderDto} from '../dto/update-order.dto'
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
    private readonly cartService: CartService,
  ) {}

  /**
   * CREAR ORDEN DESDE EL CARRITO (El corazón del flujo de checkout)
   */
  async createOrderFromCart(userId: number, createOrderDto: CreateOrderDto) {
    // 1. Obtener el carrito activo del usuario
    const cart = await this.cartService.findOrCreateCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío, no se puede crear una orden.');
    }

    // Extaer todos los IDs de productos para buscarlos en bloque de forma eficiente
    const productIds = cart.items.map((item) => item.product.id);

    // 2. Iniciar Transacción Atómica
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 3. Bloqueo Pesimista (Pessimistic Write):
      // Trae todos los productos de la orden juntos y bloquea sus filas en la BD momentáneamente.
      // Evita que dos usuarios compren el mismo stock al mismo tiempo.
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' },
      });

      // Mapeo O(1) para buscar productos a máxima velocidad en memoria
      const productsMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 4. Procesar y validar cada elemento traído del carrito
      for (const cartItem of cart.items) {
        const product = productsMap.get(cartItem.product.id);

        if (!product) {
          throw new BadRequestException(`El producto con ID ${cartItem.product.id} ya no está disponible.`);
        }

        if (product.stock < cartItem.quantity) {
          throw new BadRequestException(
            `No hay suficiente stock para: ${product.name}. Stock disponible: ${product.stock}`,
          );
        }

        // Calcular montos y descontar stock en memoria
        totalAmount += Number(product.price) * cartItem.quantity;
        product.stock -= cartItem.quantity;

        // Generar la fila del detalle de la orden
        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: product.id,
          quantity: cartItem.quantity,
          price: product.price,
        });
        orderItems.push(orderItem);
      }

      // 5. Guardar la actualización masiva de stock
      await queryRunner.manager.save(Product, products);

      // 6. Crear la cabecera de la Orden con datos de envío y pago
      const newOrder = queryRunner.manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress,
        city: createOrderDto.city,
        postalCode: createOrderDto.postalCode,
        phone: createOrderDto.phone,
        paymentMethod: createOrderDto.paymentMethod,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, newOrder);

      // 7. Vaciar el carrito de compras directamente en la transacción
      await queryRunner.manager.query(
        `DELETE FROM cart_items WHERE "cartId" = $1`,
        [cart.id],
      );

      // 8. Confirmar todos los cambios en la Base de Datos
      await queryRunner.commitTransaction();

      // 9. Disparar correo de confirmación de forma asíncrona (No frena la respuesta del servidor)
      this.mailService.sendOrderConfirmation(
        'correo-de-prueba@gmail.com', // 👈 Aquí luego puedes mapear el correo real del usuario
        savedOrder.id,
        savedOrder.totalAmount,
      );

      return savedOrder;

    } catch (error) {
      // Si algo falla, se deshacen todos los cambios automáticamente (Roolback)
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al procesar la orden: ' + (error as Error).message);
    } finally {
      // Liberar el hilo de conexión
      await queryRunner.release();
    }
  }

  // ====================================================================
  // MÉTODOS PÚBLICOS DE GESTIÓN Y LECTURA (Admin / Customer)
  // ====================================================================

  /**
   * Listar todas las órdenes de un usuario específico (Para su historial de compras)
   */
  async findAll(userId: number) {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
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
   * Cambiar el estado de la orden (Ideal para que el Admin marque como PAGADO o ENVIADO)
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