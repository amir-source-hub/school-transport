import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { ParentShell } from '@/features/parent-shell/parent-shell';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: 'پنل خانواده', template: '%s | پنل خانواده' },
  description: 'مدیریت خدمات دانش‌آموزان در پنل خانواده.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalSessionGuard role="PARENT">
      <ParentShell>{children}</ParentShell>
    </PortalSessionGuard>
  );
}
