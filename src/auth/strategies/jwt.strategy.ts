import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Le decimos que busque el token en la cabecera (Header) 'Authorization'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // La misma clave secreta que usamos en auth.module
      secretOrKey: configService.get<string>('JWT_SECRET', 'clave-secreta-temporal'), 
    });
  }

  // Si el token es válido, esta función se ejecuta automáticamente
  async validate(payload: any) {
    // Este objeto estará disponible en todas las rutas protegidas como req.user
    return { 
      id: payload.sub, 
      email: payload.email, 
      role: payload.role 
    };
  }
}