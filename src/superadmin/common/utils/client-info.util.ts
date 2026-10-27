export interface ClientInfo {
  ip: string;
  userAgent: string;
}

export function getClientInfo(req: any): ClientInfo {
  const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
  let ip = '127.0.0.1';

  if (forwarded) {
    ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  } else if (req.ip) {
    ip = req.ip;
  }

  // Normalizar IPv6 localhost a IPv4 legible
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  const userAgent = req.headers ? (req.headers['user-agent'] || 'Unknown') : 'Unknown';

  return { ip, userAgent };
}
