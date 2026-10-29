import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { ProductsService } from '../../products/services/products.service';

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor(private readonly productsService: ProductsService) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });
  }

  async ask(userMessage: string) {
    try {
      const { data: productosReales } = await this.productsService.findAll({ limit: 50 });
      
      const catalogoContexto = productosReales
        .map(p => `- ${p.name}: $${p.price} (Disponible: ${p.isAvailable ? 'Sí' : 'No'})`)
        .join('\n');

      const systemPrompt = `
        Eres el asistente virtual experto y amable de nuestra plataforma de e-commerce.
        
        Aquí tienes nuestro CATÁLOGO ACTUAL en tiempo real:
        ${catalogoContexto}

        Tus reglas:
        1. Responde preguntas basándote ÚNICAMENTE en el catálogo proporcionado.
        2. Si te preguntan por un producto que no está en la lista, di amablemente que por el momento no lo manejamos.
        3. Usa formato Markdown (negritas para precios y nombres).
        4. Sé conciso y persuasivo para invitar a la compra.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'recursive/flint-v1.0:free', 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });
      
      const replyText = response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
      
      return { reply: replyText };
      
    } catch (error) {
      console.error('Error con la API:', error);
      throw new InternalServerErrorException('Error al comunicarse con el asistente virtual');
    }
  }
}