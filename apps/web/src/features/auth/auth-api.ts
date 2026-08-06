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

export function requestParentOtp(phoneNumber: string) {
  return apiRequest<{
    expiresAt: string;
    cooldownSeconds: number;
    developmentCode?: string;
    accountExists?: boolean;
  }>('/auth/request-otp', {
    method: 'POST',
    body: { phoneNumber, role: 'PARENT' },
    timeoutMs: 10_000,
  });
}

export function verifyParentOtp(phoneNumber: string, code: string, rememberMe = false) {
  return apiRequest<LoginResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { phoneNumber, code, role: 'PARENT', rememberMe },
    timeoutMs: 10_000,
  });
}

export type AdminChallengeResponse = {
  challengeId: string;
  expiresAt: string;
  cooldownSeconds: number;
  developmentCode?: string;
};

export function requestAdminPasswordChallenge(username: string, password: string) {
  return apiRequest<AdminChallengeResponse>('/auth/admin/password-challenge', {
    method: 'POST',
    body: { username, password },
    timeoutMs: 10_000,
  });
}

export function verifyAdminOtp(challengeId: string, code: string, rememberMe = false) {
  return apiRequest<LoginResponse>('/auth/admin/verify-otp', {
    method: 'POST',
    body: { challengeId, code, rememberMe },
    timeoutMs: 10_000,
  });
}

export function logout() {
  return apiRequest<{ loggedOut: true }>('/auth/logout', {
    method: 'POST',
    timeoutMs: 10_000,
  });
}