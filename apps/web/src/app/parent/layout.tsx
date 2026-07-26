import type { ReactNode } from 'react';

import { ParentShell } from '@/features/parent-shell/parent-shell';
import { PortalSessionGuard } from '@/features/auth/portal-session-guard';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <PortalSessionGuard role="PARENT"><ParentShell>{children}</ParentShell></PortalSessionGuard>;
}
