import type { ReactNode } from 'react';
import { OnboardingSessionGuard } from '@/features/auth/onboarding-session-guard';
import { redirect } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';

export const metadata = {
  title: 'تکمیل ثبت‌نام',
};

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  if (!featureFlags.onboarding) redirect('/login');
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <OnboardingSessionGuard>{children}</OnboardingSessionGuard>
    </main>
  );
}
