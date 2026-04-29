import { SetMetadata } from '@nestjs/common';
// Si tienes tu enum en otra ruta, asegúrate de importarlo correctamente
import { RoleType } from '../../roles/enums/role-type.enum'; 

export const ROLES_KEY = 'roles';

// Esta función recibe los roles permitidos y los guarda en los metadatos de la ruta
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);