import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai'; // 👈 Importamos OpenAI
import { ProductsService } from '../../products/services/products.service';

@Injectable()
export class ChatbotService {
  private openai: OpenAI;

  constructor(private readonly productsService: ProductsService) {
    // 👈 Magia aquí: Usamos el cliente de OpenAI pero apuntamos a OpenRouter
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
    });
  }

  async ask(userMessage: string) {
    try {
      // 1. Buscamos el catálogo en tu base de datos
      const { data: productosReales } = await this.productsService.findAll({ limit: 50 });
      
      const catalogoContexto = productosReales
        .map(p => `- ${p.name}: $${p.price} (Stock disponible: ${p.stock})`)
        .join('\n');

      // 2. Definimos las instrucciones (System Prompt)
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

      // 3. Enviamos la petición usando el método estándar de OpenAI
      const response = await this.openai.chat.completions.create({
        model: 'nex-agi/nex-n2-pro:free', // 👈 Tu modelo gratuito de OpenRouter
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ]
      });
      
      // 4. Extraemos la respuesta correctamente
      const replyText = response.choices[0]?.message?.content || 'Lo siento, no pude procesar tu solicitud.';
      
      return { reply: replyText };
      
    } catch (error) {
      console.error('Error con la API:', error);
      throw new InternalServerErrorException('Error al comunicarse con el asistente virtual');
    }
  }
}