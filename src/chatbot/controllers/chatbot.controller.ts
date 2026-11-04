import { ChatbotRateLimitGuard } from '../guards/chatbot-rate-limit.guard';
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ChatbotService } from '../services/chatbot.service';
import { AskChatbotDto } from '../dto/ask-chatbot.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Chatbot') // Para que aparezca bonito en tu Swagger
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  @UseGuards(ChatbotRateLimitGuard)
  @ApiOperation({ summary: 'Enviar una pregunta al Asistente IA' })
  async askQuestion(@Body() askChatbotDto: AskChatbotDto) {
    return this.chatbotService.ask(askChatbotDto.message);
  }
}
