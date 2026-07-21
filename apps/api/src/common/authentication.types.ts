export type UserRole = 'PARENT' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  type: 'access' | 'refresh';
  sid: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  id: string;
  role: UserRole;
  sessionId: string;
}
