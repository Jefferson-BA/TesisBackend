import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // Configuración básica para Gmail
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para puerto 465, false para otros puertos
      auth: {
        user: 'tu-correo@gmail.com', // 👈 Reemplaza con un correo tuyo
        pass: 'tu-contraseña-de-aplicacion', // 👈 Reemplaza con tu App Password de Google
      },
    });
  }

  async sendOrderConfirmation(to: string, orderId: number, total: number) {
    const mailOptions = {
      from: '"Mi E-Commerce" <tu-correo@gmail.com>', // 👈 El correo que envía
      to, // 👈 El correo del cliente que compró
      subject: `¡Confirmación de tu orden #${orderId}! 🎉`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">¡Gracias por tu compra!</h2>
          <p>Tu orden ha sido procesada exitosamente y ya estamos trabajando en ella.</p>
          <hr>
          <h3>Resumen de la Orden:</h3>
          <p><strong>Orden ID:</strong> #${orderId}</p>
          <p><strong>Total pagado:</strong> $${total}</p>
          <br>
          <p>Te avisaremos en cuanto tu paquete esté en camino.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Correo enviado con éxito a: ${to}`);
    } catch (error) {
      console.error('❌ Error enviando el correo:', error);
    }
  }
}