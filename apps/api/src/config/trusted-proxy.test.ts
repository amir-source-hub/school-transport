import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { parseTrustedProxyCidrs } from './config.service';

describe('trusted proxy configuration', () => {
  it('defaults to trusting no proxy and rejects malformed or catch-all-looking input', () => {
    expect(parseTrustedProxyCidrs()).toEqual([]);
    expect(() => parseTrustedProxyCidrs('proxy.internal')).toThrow('Invalid trusted proxy');
    expect(() => parseTrustedProxyCidrs('10.0.0.1/99')).toThrow('Invalid trusted proxy');
    expect(() => parseTrustedProxyCidrs('0.0.0.0/0')).toThrow('Invalid trusted proxy');
  });

  it('ignores spoofed forwarding headers from an untrusted peer', async () => {
    const app = Fastify({ trustProxy: parseTrustedProxyCidrs('127.0.0.1') });
    app.get('/', (request) => ({ ip: request.ip }));
    const response = await app.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '203.0.113.8',
      headers: { 'x-forwarded-for': '198.51.100.99' },
    });
    expect(response.json()).toEqual({ ip: '203.0.113.8' });
    await app.close();
  });

  it('honors forwarding headers only when the directly connected peer is trusted', async () => {
    const app = Fastify({ trustProxy: parseTrustedProxyCidrs('127.0.0.1/32') });
    app.get('/', (request) => ({ ip: request.ip }));
    const response = await app.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '198.51.100.99' },
    });
    expect(response.json()).toEqual({ ip: '198.51.100.99' });
    await app.close();
  });
});
