import type { ReactNode } from 'react';
import { OnboardingSessionGuard } from '@/features/auth/onboarding-session-guard';

export const metadata = {
  title: 'تکمیل ثبت‌نام',
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <OnboardingSessionGuard>{children}</OnboardingSessionGuard>
    </main>
  );
}