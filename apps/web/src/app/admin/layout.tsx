import type { ReactNode } from 'react';
import type { Metadata } from 'next';

import { AdminRouteGuard } from '@/features/auth/admin-route-guard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { default: 'پنل مدیریت', template: '%s | پنل مدیریت' },
  description: 'عملیات مجاز مدیریت ثمین گشت مهر ایران.',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRouteGuard>{children}</AdminRouteGuard>;
}
