import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy'; // 👈 Importa esto

// Importamos los módulos para reutilizar sus servicios
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    UsersModule, // 👈 Para poder buscar y crear usuarios
    RolesModule, // 👈 Para buscar el rol 'user' por defecto

    // Configuración del JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Idealmente, esto debe venir del .env (ej. JWT_SECRET=mi_super_secreto)
        secret: configService.get<string>('JWT_SECRET', 'clave-secreta-temporal'),
        signOptions: { expiresIn: '1d' }, // El token expira en 1 día
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule { }