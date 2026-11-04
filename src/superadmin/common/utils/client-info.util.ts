import type { AuthenticatedRequest } from '../../../auth/interfaces/authenticated-request.interface';
export interface ClientInfo {
  ip: string;
  userAgent: string;
}
export function getClientInfo(
  req: Omit<AuthenticatedRequest, 'user'>,
): ClientInfo {
  // Express applies trusted-proxy policy to req.ip. Do not trust raw forwarded headers.
  let ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';
  return { ip, userAgent: req.headers?.['user-agent'] || 'Unknown' };
}
