import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { AdminShell } from '@/features/admin-shell/admin-shell';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: 'پنل مدیریت', template: '%s | پنل مدیریت' },
  description: 'عملیات مجاز مدیریت سامانه سرویس مدرسه.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalSessionGuard role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </PortalSessionGuard>
  );
}
