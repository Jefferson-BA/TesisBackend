import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // 1. Buscamos qué roles exige la ruta a la que intentan entrar
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // Si la ruta no tiene la etiqueta @Roles(), dejamos pasar a cualquiera
        if (!requiredRoles) {
            return true;
        }

        // 2. Obtenemos al usuario que acaba de pasar por el JwtStrategy
        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.role) {
            throw new ForbiddenException('No se encontró el rol del usuario en el token');
        }

        console.log('📌 Roles requeridos (Decorador):', requiredRoles);
        console.log('📌 Rol del usuario (Token):', user.role);

        // 3. Verificamos el rol asegurándonos de extraerlo correctamente
        const userRole = typeof user.role === 'string' ? user.role : (user.role?.name || '');

        // 4. Comparamos ignorando mayúsculas y minúsculas ('ADMIN' es igual a 'admin')
        const hasRole = requiredRoles.some(
            (role) => role.toUpperCase() === userRole.toUpperCase()
        );

        if (!hasRole) {
            throw new ForbiddenException('¡Acceso Denegado! Tu rol no tiene permisos para esta acción.');
        }

        return true;
    }
}