import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    // Inyectamos DataSource para manejar transacciones manuales seguras
    private readonly dataSource: DataSource,
  ) { }

  async create(createOrderDto: CreateOrderDto, userId: number) {
    const productIds = createOrderDto.items.map((item) => item.productId);

    // 1. Iniciamos el QueryRunner para la transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 2. Buscar productos DENTRO de la transacción para asegurar consistencia
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
        // Opcional (Pro): lock: { mode: 'pessimistic_write' } para evitar concurrencia
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException('Algunos productos de la orden no existen.');
      }

      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      // 3. Preparar items y VALIDAR STOCK
      for (const itemDto of createOrderDto.items) {
        const product = products.find((p) => p.id === itemDto.productId);

        // LÓGICA DE STOCK: Validamos si hay suficiente cantidad
        // (Asumiendo que tu entidad Product tiene propiedades 'stock' y 'name')
        if (product!.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para el producto: ${product!.name}. Stock actual: ${product!.stock}`,
          );
        }

        // 4. Descontamos el stock en memoria
        product!.stock -= itemDto.quantity;

        const itemPrice = product!.price;
        totalAmount += itemPrice * itemDto.quantity;

        // Creamos la instancia del item
        const orderItem = queryRunner.manager.create(OrderItem, {
          productId: product!.id,
          quantity: itemDto.quantity,
          price: itemPrice,
        });

        orderItems.push(orderItem);
      }

      // 5. Guardar los productos con su NUEVO STOCK en la base de datos
      await queryRunner.manager.save(Product, products);

      // 6. Crear la orden principal
      const order = queryRunner.manager.create(Order, {
        ...createOrderDto,
        userId,
        totalAmount,
        items: orderItems,
      });

      // 7. Guardar la orden y sus items (por cascade)
      const savedOrder = await queryRunner.manager.save(Order, order);

      // 8. Confirmar la transacción (Si todo salió bien, aplica los cambios reales)
      await queryRunner.commitTransaction();

      return savedOrder;

    } catch (error) {
      // 9. Rollback de emergencia: Si algo falla, deshace TODO (incluso el stock)
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException) {
        throw error;
      }
      // Loggear el error real internamente y lanzar uno genérico
      throw new InternalServerErrorException('Error procesando la orden de compra');
    } finally {
      // 10. Liberar el QueryRunner para no saturar la memoria
      await queryRunner.release();
    }
  }

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

    // Aquí (en un futuro) podrías añadir lógica para "devolver el stock" si la orden se CANCELA

    return await this.orderRepository.save(order);
  }
}