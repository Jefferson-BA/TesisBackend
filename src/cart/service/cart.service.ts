import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';
import { ProductsService } from '../../products/services/products.service'; // 👈 Importamos el servicio, no la entidad

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,

    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,

    // 👈 Cambiamos el Repositorio por tu Servicio ya existente
    private readonly productsService: ProductsService, 
  ) {}

  // 🛠️ Función auxiliar: Busca el carrito del usuario o lo crea si es nuevo
  async findOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ user: { id: userId }, items: [] });
      cart = await this.cartRepository.save(cart);
    }
    return cart;
  }

  // ➕ Agregar producto al carrito
  async addItemToCart(userId: number, productId: string, quantity: number) {
    // 👈 Ahora usamos el servicio para buscar el producto (asumiendo que se llama findOne o findOneById)
    const product = await this.productsService.findOne(productId); 
    if (!product) throw new NotFoundException('Producto no encontrado');

    const cart = await this.findOrCreateCart(userId);

    const existingItem = cart.items.find((item) => item.product.id === productId);

    if (existingItem) {
      existingItem.quantity += quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = this.cartItemRepository.create({
        cart,
        product,
        quantity,
      });
      await this.cartItemRepository.save(newItem);
    }

    return this.findOrCreateCart(userId);
  }

  // ✏️ Actualizar cantidad exacta
  async updateItemQuantity(userId: number, productId: string, quantity: number) {
    const cart = await this.findOrCreateCart(userId);
    const item = cart.items.find((item) => item.product.id === productId);
    
    if (!item) throw new NotFoundException('El producto no está en tu carrito');
    
    item.quantity = quantity;
    await this.cartItemRepository.save(item);
    return this.findOrCreateCart(userId);
  }

  // ❌ Eliminar producto del carrito
  async removeItemFromCart(userId: number, productId: string) {
    const cart = await this.findOrCreateCart(userId);
    const item = cart.items.find((item) => item.product.id === productId);

    if (!item) throw new NotFoundException('El producto no está en el carrito');

    await this.cartItemRepository.remove(item);
    return this.findOrCreateCart(userId);
  }

  // 🧹 Vaciar carrito completo
  async clearCart(userId: number) {
    const cart = await this.findOrCreateCart(userId);
    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }
    return { message: 'Carrito vaciado con éxito' };
  }
}