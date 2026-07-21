import { apiRequest } from '@/lib/api-client';

export type AuthRole = 'PARENT' | 'ADMIN';

type AuthUser = {
  id: string;
  username: string;
  role: AuthRole;
};

type LoginResponse = {
  user: AuthUser;
  accessToken: string;
};

export function login(username: string, password: string, role: AuthRole) {
  return apiRequest<LoginResponse>(role === 'ADMIN' ? '/auth/admin-login' : '/auth/login', {
    method: 'POST',
    body: { username, password },
    timeoutMs: 10_000,
  });
}

export function register(username: string, password: string) {
  return apiRequest<{ userId: string }>('/auth/register', {
    method: 'POST',
    body: { username, password },
    timeoutMs: 10_000,
  });
}

export function requestPasswordReset(phoneNumber: string) {
  return apiRequest<{ expiresAt: string; cooldownSeconds: number }>('/auth/forgot-password', {
    method: 'POST',
    body: { phoneNumber },
    timeoutMs: 10_000,
  });
}
