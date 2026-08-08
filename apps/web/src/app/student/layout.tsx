import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { StudentShell } from '@/features/student-shell/student-shell';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';
import { redirect } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: 'پنل دانش‌آموز', template: '%s | پنل دانش‌آموز' },
  description: 'مدیریت خدمات سرویس دانش‌آموزان در پنل دانش‌آموز.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function StudentLayout({ children }: { children: ReactNode }) {
  if (!featureFlags.studentPanel) redirect('/');
  return (
    <PortalSessionGuard role="PARENT">
      <StudentShell>{children}</StudentShell>
    </PortalSessionGuard>
  );
}
