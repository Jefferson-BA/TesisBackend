import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // 👈 Importamos al "guardia"
import { AuthService } from '../services/auth.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

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
    @Get('profile')
    @UseGuards(AuthGuard('jwt')) // 👈 Le decimos al guardia que vigile esta puerta
    getProfile(@Req() req: any) {
        // Si el guardia lo deja pasar, los datos del usuario estarán en req.user
        return {
            message: '¡Pase VIP aceptado! Bienvenido a tu perfil privado.',
            user: req.user, // Muestra el ID, email y rol que extrajimos del token
        };
    }
}