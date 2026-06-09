import { Module } from '@nestjs/common';
import { ChatbotController } from './controllers/chatbot.controller';
import { ChatbotService } from './services/chatbot.service';
import { ProductsModule } from '../products/products.module'; // 👈 Importa esto

@Module({
  imports: [ProductsModule], // 👈 AÑADE ESTA LÍNEA
  controllers: [ChatbotController],
  providers: [ChatbotService],
})
export class ChatbotModule {}