import { 
  Injectable, 
  InternalServerErrorException, 
  BadRequestException,
  Logger // 👈 Agregamos el Logger de NestJS
} from '@nestjs/common';

@Injectable()
export class CulqiService {
  private readonly culqiApiUrl = 'https://api.culqi.com/v2';
  private readonly secretKey = process.env.CULQI_SECRET_KEY;
  private readonly logger = new Logger(CulqiService.name); // 👈 Inicializamos el Logger

  async createCharge(amount: number, email: string, tokenId: string) {
    try {
      // 1. Validación estricta antes de hacer cualquier cálculo
      if (!amount || isNaN(Number(amount)) || amount <= 0) {
        throw new BadRequestException(`El monto de la orden es inválido o cero: ${amount}`);
      }

      // 2. Culqi requiere el monto en céntimos enteros (ej. S/ 80.50 -> 8050)
      const amountInCents = Math.round(Number(amount) * 100);

      // 3. Estructura exacta solicitada
      const payload = {
        amount: amountInCents,
        currency_code: 'PEN',
        email: email,
        source_id: tokenId,
      };

      // 🕵️‍♂️ LOG PARA DEBUG: Esto aparecerá en tu terminal. 
      // Te ayudará a confirmar si el JSON se armó bien.
      this.logger.debug(`Enviando payload a Culqi: ${JSON.stringify(payload)}`);

      const response = await fetch(`${this.culqiApiUrl}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      // Si Culqi rechaza el pago
      if (data.object === 'error') {
        throw new BadRequestException(`Culqi rechazó la transacción: ${data.user_message || data.merchant_message}`);
      }

      return data.id; 

    } catch (error: any) {
      this.logger.error(`Error procesando pago con Culqi: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error al comunicarse con la pasarela de pago');
    }
  }
}