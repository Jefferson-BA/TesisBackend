import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AskChatbotDto {
  @IsString()
  @IsNotEmpty({ message: 'El mensaje no puede estar vacío' })
  @MaxLength(500, { message: 'El mensaje es demasiado largo (máximo 500 caracteres)' })
  message!: string;
}