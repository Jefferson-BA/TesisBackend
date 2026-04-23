import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { NotFoundException } from '@nestjs/common';

// 1. Simulamos la Base de Datos (Mocks de Repositorios)
const mockOrderRepository = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockProductRepository = {
  find: jest.fn(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        // Inyectamos los repositorios falsos para que no intente usar PostgreSQL/MySQL
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('debería retornar una orden si esta existe y pertenece al usuario', async () => {
      const expectedOrder = { id: 1, userId: 1, totalAmount: 100 };
      
      // Simulamos que la base de datos sí encontró el registro
      mockOrderRepository.findOne.mockResolvedValue(expectedOrder);

      const result = await service.findOne(1, 1);
      
      expect(result).toEqual(expectedOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        relations: ['items', 'items.product'],
      });
    });

    it('debería lanzar NotFoundException si la orden no existe', async () => {
      // Simulamos que la base de datos devolvió null
      mockOrderRepository.findOne.mockResolvedValue(null);

      // Verificamos que al ejecutar la función, lance el error correcto
      await expect(service.findOne(99, 1)).rejects.toThrow(NotFoundException);
    });
  });
});