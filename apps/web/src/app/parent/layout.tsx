import type { ReactNode } from 'react';

import { ParentShell } from '@/features/parent-shell/parent-shell';

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <ParentShell>{children}</ParentShell>;
}
