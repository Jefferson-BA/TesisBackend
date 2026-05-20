import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; 
import { AuthService } from '../services/auth.service';
import { SignupDto } from '../dto/signup.dto';
import { LoginDto } from '../dto/login.dto';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('signup')
    @HttpCode(HttpStatus.CREATED)
    signup(@Body() signupDto: SignupDto) {
        return this.authService.signup(signupDto);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
    @Get('profile')
    @UseGuards(AuthGuard('jwt')) 
    getProfile(@Req() req: any) {
        return {
            message: '¡Pase VIP aceptado! Bienvenido a tu perfil privado.',
            user: req.user, 
        };
    }
    @Get('admin-only')
    @UseGuards(AuthGuard('jwt'), RolesGuard) 
    @Roles('ADMIN', 'SUPERADMIN')           
    getAdminData() {
        return {
            message: '¡Bienvenido Jefe! Esta información es top secret.',
        };
    }
}