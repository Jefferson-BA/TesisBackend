import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class ChatbotRateLimitGuard implements CanActivate {
  private readonly windows = new Map<
    string,
    { count: number; expires: number }
  >();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    for (const [key, window] of this.windows)
      if (window.expires <= now) this.windows.delete(key);
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const window = this.windows.get(key) || { count: 0, expires: now + 60_000 };
    if (
      window.count >= 10 ||
      (!this.windows.has(key) && this.windows.size >= 10_000)
    ) {
      response.setHeader(
        'Retry-After',
        Math.max(1, Math.ceil((window.expires - now) / 1000)),
      );
      throw new HttpException(
        'Demasiadas solicitudes. Intenta más tarde.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    window.count++;
    this.windows.set(key, window);
    return true;
  }
}
