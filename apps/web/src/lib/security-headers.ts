type SecurityHeaderOptions = {
  apiBaseUrl?: string;
  production: boolean;
};

type SecurityHeader = {
  key: string;
  value: string;
};

const getApiOrigin = (apiBaseUrl?: string) => {
  try {
    return new URL(apiBaseUrl ?? 'http://localhost:5000/api/v1').origin;
  } catch {
    return undefined;
  }
};

const createContentSecurityPolicy = ({ apiBaseUrl, production }: SecurityHeaderOptions) => {
  const apiOrigin = getApiOrigin(apiBaseUrl);
  const connectSources = ["'self'", apiOrigin];

  if (!production) {
    connectSources.push('ws:', 'wss:');
  }

  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (!production) {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "frame-src 'self' https://www.google.com",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSources.join(' ')}`,
    `connect-src ${connectSources.filter(Boolean).join(' ')}`,
  ].join('; ');
};

export const createSecurityHeaders = (options: SecurityHeaderOptions): SecurityHeader[] => {
  const headers: SecurityHeader[] = [
    {
      key: 'Content-Security-Policy',
      value: createContentSecurityPolicy(options),
    },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(self)',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];

  if (options.production) {
    headers.push({
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    });
  }

  return headers;
};
