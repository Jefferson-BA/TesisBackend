import type { IncomingHttpHeaders } from 'node:http';
export interface AuthenticatedRequest {
  user: { id: number; email?: string; role?: string };
  headers?: IncomingHttpHeaders;
  ip?: string;
  socket?: { remoteAddress?: string };
}
