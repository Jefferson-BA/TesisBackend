import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, EntityManager } from 'typeorm';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';
import { MailService } from '../mail/mail.service'; // No olvidemos tu servicio de correos

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number) {
    const productIds = createOrderDto.items.map((item) => item.productId);
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Bloqueo Pesimista (Pessimistic Read/Write): 
      // Vital para E-commerce. Bloquea las filas de estos productos momentáneamente
      // para que si 2 personas compran el último stock al mismo tiempo, uno espere al otro.
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
        lock: { mode: 'pessimistic_write' }, 
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Algunos productos de la orden no existen.');
      }

      // 2. Delegamos la lógica matemática y de validación a un método privado
      const { orderItems, totalAmount } = this.processOrderItems(
        createOrderDto.items,
        products,
        queryRunner.manager,
      );

      // 3. Guardar nuevo stock (los objetos 'products' ya fueron modificados en memoria por processOrderItems)
      await queryRunner.manager.save(Product, products);

      // 4. Crear y guardar orden
      const order = queryRunner.manager.create(Order, {
        ...createOrderDto,
        userId,
        totalAmount,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 5. Confirmar transacción
      await queryRunner.commitTransaction();

      // 6. Disparar correo de forma asíncrona
      this.mailService.sendOrderConfirmation(
        'correo-de-prueba@gmail.com', // Cambia por el correo real del usuario o el tuyo
        savedOrder.id,
        savedOrder.totalAmount,
      );

      return savedOrder;

    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error procesando la orden de compra');
    } finally {
      await queryRunner.release();
    }
  }

  // ====================================================================
  // MÉTODOS PRIVADOS (Separación de Responsabilidades)
  // Si esta lógica crece más, la puedes mover a src/orders/utils/
  // ====================================================================
  private processOrderItems(
    itemsDto: CreateOrderDto['items'],
    products: Product[],
    manager: EntityManager,
  ): { orderItems: OrderItem[]; totalAmount: number } {
    
    // Optimización: O(1) en las búsquedas
    const productsMap = new Map(products.map((product) => [product.id, product]));
    
    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const itemDto of itemsDto) {
      const product = productsMap.get(itemDto.productId);

      if (!product) {
        throw new BadRequestException(`Producto con ID ${itemDto.productId} no encontrado.`);
      }

      if (product.stock < itemDto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para: ${product.name}. Stock actual: ${product.stock}`,
        );
      }

      // Descontar stock en memoria
      product.stock -= itemDto.quantity;

      const itemPrice = product.price;
      totalAmount += itemPrice * itemDto.quantity;

      // Generar el ítem
      const orderItem = manager.create(OrderItem, {
        productId: product.id,
        quantity: itemDto.quantity,
        price: itemPrice,
      });

      orderItems.push(orderItem);
    }

    return { orderItems, totalAmount };
  }

  // ====================================================================
  // MÉTODOS PÚBLICOS DE LECTURA
  // ====================================================================
  async findAll(userId: number) {
    return await this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

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

  async updateStatus(id: number, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderRepository.preload({
      id,
      ...updateOrderDto,
    });

    if (!order) throw new NotFoundException(`La orden #${id} no existe.`);

    return await this.orderRepository.save(order);
  }
}