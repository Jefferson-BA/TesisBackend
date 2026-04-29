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
    private readonly jwtService: JwtService, 
  ) { }

  // ==========================
  // REGISTRO DE USUARIO
  // ==========================
  async signup(signupDto: SignupDto) {
    const role = await this.rolesService.findByName(RoleType.USER);

    if (!role) {
      throw new InternalServerErrorException('Los roles no han sido inicializados en la base de datos');
    }

    const newUser = await this.usersService.create({
      name: signupDto.name,
      email: signupDto.email,
      password: signupDto.password,
      roleId: role.id, 
    });

    return {
      message: 'Usuario registrado con éxito',
      user: newUser,
    };
  }

  // ==========================
  // INICIO DE SESIÓN
  // ==========================
  async login(loginDto: LoginDto) {
    const user = await this.usersService.findOneByEmail(loginDto.email);
    
    if (!user) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    const isPasswordValid = await user.comparePassword(loginDto.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }

    // Usamos el ?.name por seguridad en caso de que las relaciones no vengan cargadas
    const userRoleName = user.role?.name || 'user';

    const payload = {
      sub: user.id, 
      email: user.email,
      role: userRoleName, 
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRoleName,
      }
    };
  }
}