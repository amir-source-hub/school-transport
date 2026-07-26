export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: { id: string; username: string; phoneNumber: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export interface OtpResult {
  expiresAt: Date;
  cooldownSeconds: number;
  developmentCode?: string;
  accountExists?: boolean;
}
