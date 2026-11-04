import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';

export interface CulqiCharge {
  object: 'charge';
  id: string;
  amount: number;
  currency_code: string;
  capture: boolean | null;
  outcome?: {
    type?: string;
    code?: string;
    decline_code?: string;
    user_message?: string;
  };
  metadata?: Record<string, string>;
}
export interface CulqiResult {
  object?: string;
  id?: string;
  user_message?: string;
  data?: CulqiCharge[];
}

export class CulqiDeclinedChargeException extends BadRequestException {
  constructor(readonly charge: CulqiCharge) {
    const authenticationRequired =
      charge.outcome?.decline_code === 'authentication_required';
    super({
      statusCode: 400,
      code: authenticationRequired
        ? 'PAYMENT_AUTHENTICATION_REQUIRED'
        : 'PAYMENT_DECLINED',
      message: authenticationRequired
        ? 'Culqi solicita autenticación 3DS para completar el pago. Este intento no fue aprobado.'
        : charge.outcome?.user_message || 'La pasarela rechazó el pago.',
    });
  }
}
@Injectable()
export class CulqiService {
  constructor(private readonly settings: SettingsService) {}
  async ensureConfigured(): Promise<string> {
    const key = await this.settings.get('CULQI_SECRET_KEY');
    if (!key)
      throw new ServiceUnavailableException(
        'La pasarela de pagos no esta configurada',
      );
    return key;
  }
  private async request<T extends CulqiResult>(
    path: string,
    payload?: Record<string, unknown>,
  ): Promise<T> {
    const key = await this.ensureConfigured();
    let response: Response;
    let result: T;
    try {
      response = await fetch(`https://api.culqi.com/v2${path}`, {
        method: payload ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
      result = (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo confirmar el resultado de la pasarela',
      );
    }
    // A rejection is definite only for a well formed 4xx error response.
    if (!response.ok || result.object === 'error') {
      if (
        response.status >= 400 &&
        response.status < 500 &&
        response.status !== 429 &&
        result.object === 'error'
      ) {
        throw new BadRequestException(
          result.user_message || 'La pasarela rechazo la operacion',
        );
      }
      throw new ServiceUnavailableException(
        'La pasarela no pudo confirmar la operacion',
      );
    }
    return result;
  }
  async createCharge(
    amount: number,
    email: string,
    tokenId: string,
    metadata: Record<string, string>,
  ) {
    if (!Number.isFinite(amount) || amount <= 0)
      throw new BadRequestException('Monto invalido');
    const result = await this.request<CulqiCharge>('/charges', {
      amount: Math.round(amount * 100),
      currency_code: 'PEN',
      email,
      source_id: tokenId,
      capture: true,
      metadata,
    });
    if (
      result.amount !== Math.round(amount * 100) ||
      result.currency_code !== 'PEN'
    )
      throw new ServiceUnavailableException('Cargo inconsistente');
    this.assertCharge(result);
    return result.id;
  }
  private assertCharge(charge: CulqiCharge) {
    if (charge.object !== 'charge' || !charge.id)
      throw new ServiceUnavailableException('Respuesta de cargo inválida');
    if (
      charge.outcome?.type === 'operacion_denegada' ||
      charge.outcome?.decline_code === 'authentication_required'
    ) {
      if (charge.capture === true)
        throw new ServiceUnavailableException('Estado de cargo inconsistente');
      throw new CulqiDeclinedChargeException(charge);
    }
    if (charge.capture !== true)
      throw new ServiceUnavailableException('Cargo pendiente de confirmacion');
  }
  async getCharge(id: string) {
    const charge = await this.request<CulqiCharge>(
      `/charges/${encodeURIComponent(id)}`,
    );
    this.assertCharge(charge);
    return charge;
  }
  async findCharge(
    attemptId: string,
    createdAt: Date,
  ): Promise<CulqiCharge | undefined> {
    const params = new URLSearchParams({
      limit: '100',
      creation_date_from: String(Math.floor(createdAt.getTime() / 1000) - 60),
      creation_date_to: String(Math.floor(createdAt.getTime() / 1000) + 3600),
    });
    for (let page = 0; page < 20; page++) {
      const result = await this.request<CulqiResult>(`/charges?${params}`);
      if (!Array.isArray(result.data))
        throw new ServiceUnavailableException(
          'Respuesta de conciliacion invalida',
        );
      const charge = result.data.find(
        (item) => item.metadata?.payment_attempt_id === attemptId,
      );
      if (charge) {
        this.assertCharge(charge);
        return charge;
      }
      if (result.data.length < 100) return undefined;
      params.set('after', result.data[result.data.length - 1].id);
    }
    return undefined; // Never treat an incomplete scan as a failed payment.
  }
  async createRefund(
    chargeId: string,
    amount?: number,
    reason = 'solicitud_comprador',
  ) {
    if (
      !chargeId ||
      (amount !== undefined && (!Number.isFinite(amount) || amount <= 0))
    )
      throw new BadRequestException('Reembolso invalido');
    const result = await this.request<CulqiResult>('/refunds', {
      charge_id: chargeId,
      reason,
      ...(amount !== undefined ? { amount: Math.round(amount * 100) } : {}),
    });
    if (result.object !== 'refund' || !result.id)
      throw new ServiceUnavailableException(
        'Reembolso pendiente de confirmacion',
      );
    return result;
  }
}
