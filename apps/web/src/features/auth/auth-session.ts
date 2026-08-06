import type { AuthRole } from './auth-api';

let currentAccessToken: string | null = null;
let currentRole: AuthRole | null = null;
let sessionVersion = 0;

export function setAuthSession(accessToken: string, role: AuthRole) {
  currentAccessToken = accessToken;
  currentRole = role;
}

export function setAuthRole(role: AuthRole) {
  currentRole = role;
}

export function setAuthAccessToken(accessToken: string) {
  currentAccessToken = accessToken;
}

export function getAuthSession() {
  return { accessToken: currentAccessToken, role: currentRole };
}

export function clearAuthSession() {
  currentAccessToken = null;
  currentRole = null;
  sessionVersion += 1;
}

export function getAuthSessionVersion() {
  return sessionVersion;
}
