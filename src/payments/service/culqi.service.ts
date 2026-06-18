import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';

@Injectable()
export class CulqiService {
  private readonly culqiApiUrl = 'https://api.culqi.com/v2';
  
  // En un entorno real, esto viene de @nestjs/config (process.env.CULQI_SECRET_KEY)
  private readonly secretKey = process.env.CULQI_SECRET_KEY;

  async createCharge(amount: number, email: string, tokenId: string) {
    try {
      // Culqi requiere el monto en céntimos (ej. S/ 50.50 -> 5050)
      const amountInCents = Math.round(amount * 100);

      const response = await fetch(`${this.culqiApiUrl}/charges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.secretKey}`,
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency_code: 'PEN', // Soles Peruanos
          email: email,
          source_id: tokenId, // El token que te mandó el frontend
        }),
      });

      const data = await response.json();

      // Si Culqi rechaza el pago (fondos insuficientes, tarjeta expirada)
      if (data.object === 'error') {
        throw new BadRequestException(`Error en el pago: ${data.user_message}`);
      }

      // Retornamos el ID del cargo exitoso
      return data.id; 

    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error al comunicarse con la pasarela de pago');
    }
  }
}