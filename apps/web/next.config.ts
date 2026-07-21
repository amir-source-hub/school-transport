import type { NextConfig } from 'next';

import { validateWebEnvironment } from './src/lib/environment';
import { createSecurityHeaders } from './src/lib/security-headers';

const environment = validateWebEnvironment({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  production: process.env.NODE_ENV === 'production',
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecurityHeaders({
          apiBaseUrl: environment.apiBaseUrl,
          production: environment.production,
        }),
      },
    ];
  },
};

export default nextConfig;
