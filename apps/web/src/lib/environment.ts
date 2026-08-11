const LOCAL_API_BASE_URL = 'http://localhost:5000/api/v1';

type WebEnvironmentInput = {
  apiBaseUrl?: string;
  privateUploadOrigin?: string;
  deploymentId?: string;
  serverActionsEncryptionKey?: string;
  production: boolean;
};

type WebEnvironment = {
  apiBaseUrl: string;
  privateUploadOrigin?: string;
  deploymentId?: string;
  production: boolean;
};

export const validateWebEnvironment = ({
  apiBaseUrl,
  privateUploadOrigin,
  deploymentId,
  serverActionsEncryptionKey,
  production,
}: WebEnvironmentInput): WebEnvironment => {
  const value = apiBaseUrl?.trim();

  if (production && !value) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required for production builds.');
  }

  const normalizedDeploymentId = deploymentId?.trim();
  if (production && !normalizedDeploymentId) {
    throw new Error('NEXT_DEPLOYMENT_ID is required for production builds.');
  }
  if (normalizedDeploymentId && !/^[A-Za-z0-9._-]{7,128}$/.test(normalizedDeploymentId)) {
    throw new Error('NEXT_DEPLOYMENT_ID must be a 7-128 character immutable release identifier.');
  }

  if (production) {
    const key = serverActionsEncryptionKey?.trim();
    let decodedLength = 0;
    try {
      decodedLength = key ? Buffer.from(key, 'base64').length : 0;
    } catch {
      decodedLength = 0;
    }
    if (!key || !/^[A-Za-z0-9+/]+={0,2}$/.test(key) || ![16, 24, 32].includes(decodedLength)) {
      throw new Error(
        'NEXT_SERVER_ACTIONS_ENCRYPTION_KEY must be a base64-encoded 16, 24, or 32 byte key for production builds.',
      );
    }
  }

  const resolvedApiBaseUrl = value || LOCAL_API_BASE_URL;
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(resolvedApiBaseUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must be an absolute URL.');
  }

  const isLoopback = ['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname);
  if (production && parsedUrl.protocol !== 'https:' && !isLoopback) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL must use HTTPS in production.');
  }

  const uploadValue = privateUploadOrigin?.trim();
  let normalizedUploadOrigin: string | undefined;
  if (uploadValue) {
    let uploadUrl: URL;
    try {
      uploadUrl = new URL(uploadValue);
    } catch {
      throw new Error('NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN must be an absolute URL.');
    }
    if (uploadUrl.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(uploadUrl.hostname)) {
      throw new Error('NEXT_PUBLIC_PRIVATE_UPLOAD_ORIGIN must use HTTPS.');
    }
    normalizedUploadOrigin = uploadUrl.origin;
  }

  return {
    apiBaseUrl: resolvedApiBaseUrl.replace(/\/$/, ''),
    privateUploadOrigin: normalizedUploadOrigin,
    deploymentId: normalizedDeploymentId,
    production,
  };
};
