'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { RouteLoading } from '@/components/feedback/route-loading';
import { apiRequest } from '@/lib/api-client';
import { PortalRoleSelector } from './portal-role-selector';
import { StudentPortalLoginForm } from './student-portal-login-form';
import { ManagerPortalLoginForm } from './manager-portal-login-form';
import { DriverComingSoonForm } from './driver-coming-soon-form';
import { PORTAL_PATH_BY_ROLE, type UiRoleIdentifier } from './auth-api';

export function PortalLoginGateway() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const [checked, setChecked] = useState(false);
  const [role, setRole] = useState<UiRoleIdentifier>(
    next && next.startsWith('/manager') ? 'SCHOOL_MANAGER' : 'STUDENT_PORTAL',
  );

  useEffect(() => {
    let active = true;
    apiRequest<{ user: { role: 'PARENT' | 'ADMIN' | 'SCHOOL_MANAGER' } }>('/auth/me', {
      cache: 'no-store',
      redirectOnAuthFailure: false,
    })
      .then(({ data }) => {
        if (!active) return;
        router.replace(PORTAL_PATH_BY_ROLE[data.user.role]);
      })
      .catch(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!checked) return <RouteLoading compact />;

  return (
    <div className="space-y-6">
      <PortalRoleSelector selected={role} onSelect={setRole} />

      <div key={role} className="mt-6">
        {role === 'STUDENT_PORTAL' && <StudentPortalLoginForm nextPath={next ?? undefined} />}
        {role === 'SCHOOL_MANAGER' && <ManagerPortalLoginForm nextPath={next ?? undefined} />}
        {role === 'DRIVER_COMING_SOON' && <DriverComingSoonForm />}
      </div>
    </div>
  );
}
