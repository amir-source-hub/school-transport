import type { ReactNode } from 'react';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';
import { DriverShell } from '@/features/driver/driver-shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: { default: 'پنل راننده', template: '%s | پنل راننده' }, robots: { index:false, follow:false, noarchive:true } };

export default function DriverLayout({ children }: { children: ReactNode }) {
  return <PortalSessionGuard role="DRIVER"><DriverShell>{children}</DriverShell></PortalSessionGuard>;
}
