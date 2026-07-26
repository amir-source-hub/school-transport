import type { ReactNode } from 'react';

import { AdminShell } from '@/features/admin-shell/admin-shell';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PortalSessionGuard role="ADMIN"><AdminShell>{children}</AdminShell></PortalSessionGuard>;
}
