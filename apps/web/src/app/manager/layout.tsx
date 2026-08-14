import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';
import { ManagerShell } from '@/features/manager/manager-shell';
import { featureFlags } from '@/lib/feature-flags';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: 'پنل مدیر مدرسه', template: '%s | پنل مدیر مدرسه' },
  robots: { index: false, follow: false, noarchive: true },
};
export default function Layout({ children }: { children: ReactNode }) {
  if (!featureFlags.managerPortal) redirect('/login');
  return (
    <PortalSessionGuard role="SCHOOL_MANAGER">
      <ManagerShell>{children}</ManagerShell>
    </PortalSessionGuard>
  );
}
