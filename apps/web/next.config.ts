import type { NextConfig } from "next";

import { createSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: createSecurityHeaders({
          apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
          production: process.env.NODE_ENV === "production",
        }),
      },
    ];
  },
};

export default nextConfig;
