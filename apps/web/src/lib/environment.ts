const LOCAL_API_BASE_URL = "http://localhost:3001/api/v1";

type WebEnvironmentInput = {
  apiBaseUrl?: string;
  production: boolean;
};

type WebEnvironment = {
  apiBaseUrl: string;
  production: boolean;
};

export const validateWebEnvironment = ({
  apiBaseUrl,
  production,
}: WebEnvironmentInput): WebEnvironment => {
  const value = apiBaseUrl?.trim();

  if (production && !value) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is required for production builds.");
  }

  const resolvedApiBaseUrl = value || LOCAL_API_BASE_URL;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(resolvedApiBaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be an absolute URL.");
  }

  if (production && parsedUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.");
  }

  return {
    apiBaseUrl: resolvedApiBaseUrl.replace(/\/$/, ""),
    production,
  };
};
