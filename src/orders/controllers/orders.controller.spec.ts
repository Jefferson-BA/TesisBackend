import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from '../orders.service';

// 1. Creamos un "Doble" (Mock) del servicio real
const mockOrdersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  updateStatus: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    // 2. Configuramos el módulo de prueba inyectando el mock
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: mockOrdersService },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('debería estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('debería llamar a ordersService.findOne con los parámetros correctos', async () => {
      // Preparar datos simulados
      const mockReq = { user: { id: 1 } };
      const expectedResult = { id: 1, totalAmount: 150 };
      
      // Le decimos al mock qué debe responder
      mockOrdersService.findOne.mockResolvedValue(expectedResult);

      // Ejecutamos el controlador
      const result = await controller.findOne(1, mockReq);

      // Verificamos que el resultado sea correcto y que el servicio haya sido llamado
      expect(result).toEqual(expectedResult);
      expect(mockOrdersService.findOne).toHaveBeenCalledWith(1, 1); // (orderId, userId)
    });
  });
});