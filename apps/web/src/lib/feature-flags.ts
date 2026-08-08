const enabled = (value: string | undefined) => value !== 'false';

export const featureFlags = {
  adminTwoFactor: enabled(process.env.NEXT_PUBLIC_FEATURE_ADMIN_2FA),
  onboarding: enabled(process.env.NEXT_PUBLIC_FEATURE_ONBOARDING),
  studentPanel: enabled(process.env.NEXT_PUBLIC_FEATURE_STUDENT_PANEL),
} as const;
