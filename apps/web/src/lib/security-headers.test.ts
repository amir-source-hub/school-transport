import { describe, expect, it } from 'vitest';

import { createSecurityHeaders } from './security-headers';

describe('createSecurityHeaders', () => {
  it('applies the documented browser security controls', () => {
    const headers = createSecurityHeaders({
      apiBaseUrl: 'https://api.example.test/api/v1',
      privateUploadOrigin: 'https://s3.example.test/path-is-ignored',
      production: true,
    });
    const headerMap = new Map(headers.map(({ key, value }) => [key, value]));

    expect(headerMap.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(headerMap.get('Content-Security-Policy')).toContain(
      "frame-src 'self' https://www.google.com",
    );
    expect(headerMap.get('Content-Security-Policy')).toContain(
      "connect-src 'self' https://api.example.test https://s3.example.test blob:",
    );
    expect(headerMap.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    expect(headerMap.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headerMap.get('X-Frame-Options')).toBe('DENY');
    expect(headerMap.get('Permissions-Policy')).toContain('geolocation=(self)');
  });

  it('allows local development connections without enabling HSTS', () => {
    const headers = createSecurityHeaders({ production: false });
    const headerMap = new Map(headers.map(({ key, value }) => [key, value]));

    expect(headerMap.get('Content-Security-Policy')).toContain('http://localhost:5000');
    expect(headerMap.get('Content-Security-Policy')).toContain('ws:');
    expect(headerMap.has('Strict-Transport-Security')).toBe(false);
  });
});
