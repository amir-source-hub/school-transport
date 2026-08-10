'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminShell } from '../admin-shell/admin-shell';
import { PortalSessionGuard } from './portal-session-guard';

export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/admin/login') return children;
  return (
    <PortalSessionGuard role="ADMIN">
      <AdminShell>{children}</AdminShell>
    </PortalSessionGuard>
  );
}
