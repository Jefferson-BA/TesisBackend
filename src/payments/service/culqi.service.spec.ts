import { ServiceUnavailableException } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import {
  CulqiCharge,
  CulqiDeclinedChargeException,
  CulqiService,
} from './culqi.service';

describe('CulqiService: resultado del cargo', () => {
  const charge: CulqiCharge = {
    object: 'charge',
    id: 'charge-test',
    amount: 2323,
    currency_code: 'PEN',
    capture: true,
    metadata: { order_id: '99', payment_attempt_id: 'attempt-test' },
  };
  const service = new CulqiService({
    get: jest.fn().mockResolvedValue('test-key'),
  } as unknown as SettingsService);
  afterEach(() => jest.restoreAllMocks());

  it('envía captura inmediata y solo confirma un cargo capturado', async () => {
    const request = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(charge));
    await expect(
      service.createCharge(
        23.23,
        'user@example.com',
        'token-test',
        charge.metadata!,
      ),
    ).resolves.toBe('charge-test');
    expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toMatchObject({
      capture: true,
      amount: 2323,
    });
  });

  it('distingue una denegación por 3DS recibida con HTTP 200 de un fallo temporal', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ...charge,
        capture: null,
        outcome: {
          type: 'operacion_denegada',
          decline_code: 'authentication_required',
        },
      }),
    );
    await expect(
      service.createCharge(
        23.23,
        'user@example.com',
        'token-test',
        charge.metadata!,
      ),
    ).rejects.toMatchObject({
      response: { statusCode: 400, code: 'PAYMENT_AUTHENTICATION_REQUIRED' },
    });
  });

  it('reconoce una denegación al consultar un intento antiguo', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ...charge,
        capture: null,
        outcome: {
          type: 'operacion_denegada',
          decline_code: 'authentication_required',
        },
      }),
    );
    await expect(service.getCharge('charge-test')).rejects.toBeInstanceOf(
      CulqiDeclinedChargeException,
    );
  });

  it('conserva la incertidumbre cuando no hay captura ni denegación explícita', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...charge, capture: null }));
    await expect(service.getCharge('charge-test')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('no considera exitosa una respuesta con captura y denegación contradictorias', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ ...charge, outcome: { type: 'operacion_denegada' } }),
      );
    await expect(service.getCharge('charge-test')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
