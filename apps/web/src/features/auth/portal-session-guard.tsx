'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RouteLoading } from '@/components/feedback/route-loading';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { clearAuthSession, setAuthRole } from './auth-session';

type GuardStatus = 'checking' | 'authorized' | 'unavailable';

export function PortalSessionGuard({
  role,
  children,
}: {
  role: 'PARENT' | 'ADMIN';
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GuardStatus>('checking');
  const verificationId = useRef(0);

  const verify = useCallback(() => {
    const requestId = ++verificationId.current;
    const isCurrent = () => requestId === verificationId.current;
    apiRequest<{ user: { role: 'PARENT' | 'ADMIN' } }>('/auth/me', {
      cache: 'no-store',
      redirectOnAuthFailure: false,
    })
      .then(({ data }) => {
        if (!isCurrent()) return;
        if (data.user.role !== role) {
          router.replace(data.user.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard');
          return;
        }
        setAuthRole(role);
        setStatus('authorized');
      })
      .catch((caught) => {
        if (!isCurrent()) return;
        if (caught instanceof ApiClientError && caught.isSessionExpired) {
          clearAuthSession();
          const query = searchParams.toString();
          const next = `${pathname}${query ? `?${query}` : ''}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          router.refresh();
          return;
        }
        setStatus('unavailable');
      });
  }, [pathname, role, router, searchParams]);

  useEffect(() => {
    verify();
    return () => {
      verificationId.current += 1;
    };
  }, [verify]);
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setStatus('checking');
        verify();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [verify]);

  if (status === 'checking') return <RouteLoading compact />;
  if (status === 'unavailable') {
    return (
      <div role="alert" className="mx-auto max-w-lg p-8 text-center">
        <p className="font-bold">بررسی نشست حساب ممکن نیست. اتصال خود را بررسی کنید.</p>
        <Button
          className="mt-4"
          onClick={() => {
            setStatus('checking');
            verify();
          }}
        >
          تلاش دوباره
        </Button>
      </div>
    );
  }
  return children;
}
