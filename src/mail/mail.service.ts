import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}
  async sendOrderConfirmation(
    to: string,
    orderId: number,
    total: number,
  ): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const from = this.config.get<string>('SMTP_FROM');
    if (!host || !from)
      throw new ServiceUnavailableException(
        'Configura SMTP_HOST y SMTP_FROM para enviar correos',
      );
    const user = this.config.get<string>('SMTP_USER');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get('SMTP_PORT') || 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      auth: user
        ? { user, pass: this.config.getOrThrow<string>('SMTP_PASSWORD') }
        : undefined,
    });
    await transporter.sendMail({
      from,
      to,
      subject: `Confirmacion de orden #${orderId}`,
      text: `Gracias por tu compra. Orden #${orderId}. Total pagado: S/ ${Number(total).toFixed(2)}.`,
    });
  }
}
