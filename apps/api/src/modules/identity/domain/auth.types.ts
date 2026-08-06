export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: { id: string; username: string; phoneNumber: string; role: string };
  accessToken: string;
  refreshToken: string;
}

export interface OnboardingSessionResult {
  sessionId: string;
  token: string;
  expiresAt: Date;
  currentStep: string | null;
}

/** Verified but not yet active: guided-enrollment-only restricted identity. */
export type OnboardingVerifyResult = {
  user: null;
  onboarding: OnboardingSessionResult;
};

export type VerifyAuthOtpResult = LoginResult | OnboardingVerifyResult;

export interface OtpResult {
  expiresAt: Date;
  cooldownSeconds: number;
  developmentCode?: string;
  accountExists?: boolean;
}
