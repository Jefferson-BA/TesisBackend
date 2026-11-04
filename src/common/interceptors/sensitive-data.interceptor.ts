import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';

export function removeSensitiveData(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || value instanceof Date)
    return value;
  if (Array.isArray(value)) return value.map(removeSensitiveData);
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !['password', 'tempPassword', 'superadminPassword'].includes(key),
      )
      .map(([key, entry]) => [key, removeSensitiveData(entry)]),
  );
}

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(removeSensitiveData));
  }
}
