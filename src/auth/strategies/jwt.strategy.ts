import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/services/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Le decimos que busque el token en la cabecera (Header) 'Authorization'
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // La misma clave secreta que usamos en auth.module
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Si el token es válido, esta función se ejecuta automáticamente
  async validate(payload: { sub: number }) {
    if (!Number.isInteger(payload.sub) || payload.sub <= 0)
      throw new UnauthorizedException();
    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) throw new UnauthorizedException('La cuenta no está disponible');
    // Este objeto estará disponible en todas las rutas protegidas como req.user
    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
    };
  }
}
