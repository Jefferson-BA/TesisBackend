import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 👇 AQUÍ AGREGAMOS LA CONFIGURACIÓN DE CORS
  app.enableCors({
    origin: 'http://localhost:4321', // Permite la entrada exclusiva a tu Astro
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Permite el envío de cookies/tokens
  });

  // Configuración de validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // 👈 CRUCIAL para la paginación (convierte strings a números)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Interceptor global para que @Exclude funcione en toda la APP
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  await app.listen(3000);
}
bootstrap();