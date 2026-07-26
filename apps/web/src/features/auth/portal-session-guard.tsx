'use client';

import { useEffect, type ReactNode } from 'react';
import { clearAuthSession } from './auth-session';
import { apiRequest } from '@/lib/api-client';

export function PortalSessionGuard({ role, children }: { role: 'PARENT' | 'ADMIN'; children: ReactNode }) {
  useEffect(() => {
    let active = true;
    apiRequest<{ user: { role: string } }>('/auth/me', { cache: 'no-store' })
      .then(({ data }) => {
        if (active && data.user.role !== role) {
          clearAuthSession();
          window.location.replace('/login');
        }
      })
      .catch(() => {
        if (active) {
          clearAuthSession();
          const next = `${window.location.pathname}${window.location.search}`;
          window.location.replace(`/login?next=${encodeURIComponent(next)}`);
        }
      });
    return () => { active = false; };
  }, [role]);

  return children;
}
