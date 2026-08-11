import type { NextConfig } from 'next';

import { validateWebEnvironment } from './src/lib/environment';
import { createSecurityHeaders } from './src/lib/security-headers';

const environment = validateWebEnvironment({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  privateUploadOrigin: process.env.NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN,
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  serverActionsEncryptionKey: process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
  production: process.env.NODE_ENV === 'production',
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  deploymentId: environment.deploymentId,
  async redirects() {
    return [
      {
        source: '/parent/:path*',
        destination: '/student/:path*',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: createSecurityHeaders({
          apiBaseUrl: environment.apiBaseUrl,
          privateUploadOrigin: environment.privateUploadOrigin,
          production: environment.production,
        }),
      },
    ];
  },
};

export default nextConfig;
