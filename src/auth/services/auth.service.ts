import { Injectable, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../../users/services/users.service';
import { RolesService } from '../../roles/services/roles.service';
import { RoleType } from '../../roles/enums/role-type.enum';

import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService, // 👈 Inyectamos el creador de Tokens
  ) {}

  // ==========================
  // REGISTRO DE USUARIO
  // ==========================
  async signup(signupDto: SignupDto) {
    // 1. Buscar el ID del rol 'user' en la base de datos (Cliente final)
    const role = await this.rolesService.findByName(RoleType.USER);
    
    if (!role) {
      throw new InternalServerErrorException('Los roles no han sido inicializados en la base de datos');
    }

    // 2. Reutilizamos tu UsersService para crear al usuario
    const newUser = await this.usersService.create({
      name: signupDto.name,
      email: signupDto.email,
      password: signupDto.password,
      roleId: role.id, // Le pasamos el ID que encontramos
    });

    // 3. Devolvemos el usuario (La contraseña está protegida por el @Exclude)
    return {
      message: 'Usuario registrado con éxito',
      user: newUser,
    };
  }

  // ==========================
  // INICIO DE SESIÓN
  // ==========================
  async login(loginDto: LoginDto) {
    // 1. Verificar si el correo existe
    const user = await this.usersService.findOneByEmail(loginDto.email);
    if (!user) {
      // Siempre devolvemos el mismo mensaje para no dar pistas a hackers
      throw new UnauthorizedException('Correo o contraseña incorrectos'); 
    }

    // 2. Verificar la contraseña usando el método mágico de tu Entidad
    const isPasswordValid = await user.comparePassword(loginDto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // 3. Crear el "Payload" (la información pública que viaja dentro del Token)
    const payload = {
      sub: user.id, // sub = Subject (el ID del usuario)
      email: user.email,
      role: user.role.name, // Podemos acceder al nombre del rol directamente
    };

    // 4. Firmar el Token y devolverlo al cliente
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      }
    };
  }
}