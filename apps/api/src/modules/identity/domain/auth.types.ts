export interface JwtPayload {
  sub: string;
  role: 'PARENT' | 'ADMIN';
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  role: 'PARENT' | 'ADMIN';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: { id: string; username: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export interface OtpResult {
  expiresAt: Date;
  cooldownSeconds: number;
}
