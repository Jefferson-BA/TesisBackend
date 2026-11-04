import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaymentService } from './payment.service';
import { CulqiDeclinedChargeException, CulqiService } from './culqi.service';
import { MailService } from '../../mail/mail.service';
import { PaymentAttempt } from '../entities/payment-attempt.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderStatus } from '../../orders/enums/order.enums';

describe('PaymentService', () => {
  function setup(existing = false) {
    const attempt = {
      id: 'attempt-1',
      orderId: 1,
      amountCents: 12300,
      email: 'customer@example.com',
      status: 'processing',
      createdAt: new Date(Date.now() - 120_000),
    };
    const order = {
      id: 1,
      userId: 7,
      totalAmount: 123,
      status: OrderStatus.PENDING,
      user: { email: 'customer@example.com' },
    };
    const manager = {
      findOne: jest.fn((type: unknown) =>
        Promise.resolve(type === Order ? order : existing ? attempt : null),
      ),
      findOneOrFail: jest.fn((type: unknown) =>
        Promise.resolve(type === Order ? order : attempt),
      ),
      findOneByOrFail: jest.fn().mockResolvedValue(attempt),
      create: jest.fn((_type: unknown, value: object) => ({
        ...attempt,
        ...value,
      })),
      save: jest.fn().mockResolvedValue(attempt),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const repository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([attempt]),
    };
    const dataSource = {
      transaction: jest.fn((fn: (manager: unknown) => unknown) => fn(manager)),
      getRepository: jest.fn(() => repository),
    };
    const culqi = {
      ensureConfigured: jest.fn().mockResolvedValue('configured-key'),
      createCharge: jest.fn().mockResolvedValue('charge-1'),
      findCharge: jest.fn().mockResolvedValue({
        id: 'charge-1',
        amount: 12300,
        currency_code: 'PEN',
        metadata: { order_id: '1', payment_attempt_id: 'attempt-1' },
      }),
    };
    const mail = {
      sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PaymentService(
      dataSource as unknown as DataSource,
      culqi as unknown as CulqiService,
      mail as unknown as MailService,
    );
    return { service, culqi, manager, repository, mail };
  }
  const dto = { tokenId: 'token', amount: 123 };
  const deniedCharge = {
    object: 'charge' as const,
    id: 'denied-test',
    amount: 12300,
    currency_code: 'PEN',
    capture: null,
    metadata: { order_id: '1', payment_attempt_id: 'attempt-1' },
    outcome: {
      type: 'operacion_denegada',
      decline_code: 'authentication_required',
    },
  };
  it('libera un intento denegado por 3DS sin marcar la orden como pagada', async () => {
    const { service, culqi, repository, manager } = setup();
    culqi.createCharge.mockRejectedValue(
      new CulqiDeclinedChargeException(deniedCharge),
    );
    await expect(service.pay(1, 7, dto)).rejects.toBeInstanceOf(
      CulqiDeclinedChargeException,
    );
    expect(repository.update).toHaveBeenCalledWith('attempt-1', {
      status: 'failed',
      chargeId: 'denied-test',
    });
    expect(manager.update).not.toHaveBeenCalled();
  });
  it('reconcilia una denegación antigua sin generar un segundo cargo', async () => {
    const { service, culqi, repository, manager } = setup();
    culqi.findCharge.mockRejectedValue(
      new CulqiDeclinedChargeException(deniedCharge),
    );
    await service.reconcilePending();
    expect(repository.update).toHaveBeenCalledWith('attempt-1', {
      status: 'failed',
      chargeId: 'denied-test',
    });
    expect(culqi.createCharge).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });
  it('no libera una denegación que corresponde a otra orden', async () => {
    const { service, culqi, repository } = setup();
    culqi.findCharge.mockRejectedValue(
      new CulqiDeclinedChargeException({
        ...deniedCharge,
        metadata: { ...deniedCharge.metadata, order_id: 'another-order' },
      }),
    );
    await service.reconcilePending();
    expect(repository.update).not.toHaveBeenCalledWith(
      'attempt-1',
      expect.objectContaining({ status: 'failed' }),
    );
  });
  it('does not call the gateway for an already initiated payment', async () => {
    const { service, culqi } = setup(true);
    await expect(service.pay(1, 7, dto)).rejects.toThrow(ConflictException);
    expect(culqi.createCharge).not.toHaveBeenCalled();
  });
  it('keeps uncertain failures processing to prevent another charge', async () => {
    const { service, culqi, repository } = setup();
    culqi.createCharge.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.pay(1, 7, dto)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
  it('allows another attempt only after a definite rejection', async () => {
    const { service, culqi, repository } = setup();
    culqi.createCharge.mockRejectedValue(new BadRequestException());
    await expect(service.pay(1, 7, dto)).rejects.toThrow(BadRequestException);
    expect(repository.update).toHaveBeenCalledWith('attempt-1', {
      status: 'failed',
    });
  });
  it('records the charge and confirms the order before sending mail', async () => {
    const { service, repository, manager, mail } = setup();
    await expect(service.pay(1, 7, dto)).resolves.toMatchObject({
      chargeId: 'charge-1',
      status: 'paid',
    });
    expect(repository.update).toHaveBeenCalledWith('attempt-1', {
      chargeId: 'charge-1',
    });
    expect(manager.update).toHaveBeenCalledWith(Order, 1, {
      status: OrderStatus.PAID,
      chargeId: 'charge-1',
    });
    expect(manager.update).toHaveBeenCalledWith(PaymentAttempt, 'attempt-1', {
      status: 'succeeded',
      chargeId: 'charge-1',
    });
    expect(mail.sendOrderConfirmation).toHaveBeenCalled();
  });
  it('recovers a confirmed remote charge without creating a new charge', async () => {
    const { service, culqi, manager } = setup();
    await service.reconcilePending();
    expect(culqi.createCharge).not.toHaveBeenCalled();
    expect(manager.update).toHaveBeenCalledWith(Order, 1, {
      status: OrderStatus.PAID,
      chargeId: 'charge-1',
    });
  });
  it('does not confirm a remote charge belonging to another attempt', async () => {
    const { service, culqi, manager } = setup();
    culqi.findCharge.mockResolvedValue({
      id: 'charge-2',
      amount: 12300,
      currency_code: 'PEN',
      metadata: { order_id: '1', payment_attempt_id: 'other-attempt' },
    });
    await service.reconcilePending();
    expect(manager.update).not.toHaveBeenCalled();
    expect(culqi.createCharge).not.toHaveBeenCalled();
  });
});
