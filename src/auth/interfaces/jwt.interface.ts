export interface JwtPayload {
  id: number;
  email: string;
  // Opcionalmente, en el futuro para tu entorno empresarial podrías agregar:
  // role?: string; 
  // companyId?: number;
}