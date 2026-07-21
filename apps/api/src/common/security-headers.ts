import { FastifyInstance } from 'fastify';

export function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('X-XSS-Protection', '0');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
    );
    return payload;
  });
}
