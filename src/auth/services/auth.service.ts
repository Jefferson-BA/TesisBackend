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

    // 🟢 EXCELENTE: El operador spread (...) arrastra name, email, password Y EL PHONE de forma automática
    const newUser = await this.usersService.create({
      ...signupDto,    
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
        phone: (user as any).phone || "", // 🟢 AGREGADO: Mandamos el teléfono también en el Login para que el Frontend lo guarde en la sesión inmediatamente
      }
    };
  }
}