import type { AuthRole } from './auth-api';

let currentAccessToken: string | null = null;
let currentRole: AuthRole | null = null;

export function setAuthSession(accessToken: string, role: AuthRole) {
  currentAccessToken = accessToken;
  currentRole = role;
}

export function getAuthSession() {
  return { accessToken: currentAccessToken, role: currentRole };
}

export function clearAuthSession() {
  currentAccessToken = null;
  currentRole = null;
}
