import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { registerSecurityHeaders } from './security-headers';

const apps: ReturnType<typeof Fastify>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function responseHeaders(isProduction: boolean) {
  const app = Fastify();
  apps.push(app);
  registerSecurityHeaders(app, isProduction);
  app.get('/health', async () => ({ ok: true }));
  const response = await app.inject({ method: 'GET', url: '/health' });
  return response.headers;
}

describe('backend security headers', () => {
  it('sets the documented browser protections', async () => {
    const headers = await responseHeaders(false);

    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
  });

  it('sets HSTS only after production HTTPS is expected', async () => {
    const developmentHeaders = await responseHeaders(false);
    const productionHeaders = await responseHeaders(true);

    expect(developmentHeaders['strict-transport-security']).toBeUndefined();
    expect(productionHeaders['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});
