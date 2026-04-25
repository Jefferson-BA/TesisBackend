import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Ruta: POST http://localhost:3000/auth/signup
  @Post('signup')
  @HttpCode(HttpStatus.CREATED) 
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  // Ruta: POST http://localhost:3000/auth/login
  @Post('login')
  @HttpCode(HttpStatus.OK) 
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}