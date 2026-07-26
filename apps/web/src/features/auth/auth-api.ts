import { apiRequest } from '@/lib/api-client';

export type AuthRole = 'PARENT' | 'ADMIN';

type AuthUser = {
  id: string;
  username: string;
  phoneNumber: string;
  role: AuthRole;
};

type LoginResponse = {
  user: AuthUser;
  accessToken: string;
};

export function requestAuthOtp(phoneNumber: string, role: AuthRole) {
  return apiRequest<{
    expiresAt: string;
    cooldownSeconds: number;
    developmentCode?: string;
    accountExists?: boolean;
  }>('/auth/request-otp', {
    method: 'POST',
    body: { phoneNumber, role },
    timeoutMs: 10_000,
  });
}

export function verifyAuthOtp(phoneNumber: string, code: string, role: AuthRole) {
  return apiRequest<LoginResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { phoneNumber, code, role },
    timeoutMs: 10_000,
  });
}
