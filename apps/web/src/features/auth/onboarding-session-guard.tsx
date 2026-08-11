'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RouteLoading } from '@/components/feedback/route-loading';
import { ApiClientError, apiRequest } from '@/lib/api-client';
import { setOnboardingState } from './onboarding-session';

type GuardStatus = 'checking' | 'authorized' | 'unavailable';

export function OnboardingSessionGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GuardStatus>('checking');
  const verificationId = useRef(0);

  const verify = useCallback(() => {
    const requestId = ++verificationId.current;
    const isCurrent = () => requestId === verificationId.current;
    apiRequest<{
      phoneNumber: string;
      expiresAt: string;
      currentStep: string | null;
    }>('/auth/onboarding/me', {
      cache: 'no-store',
      redirectOnAuthFailure: false,
    })
      .then((response) => {
        if (!isCurrent()) return;
        setOnboardingState({
          sessionId: null,
          phoneNumber: response.data.phoneNumber,
          expiresAt: response.data.expiresAt,
          currentStep: response.data.currentStep,
        });
        setStatus('authorized');
      })
      .catch((caught) => {
        if (!isCurrent()) return;
        if (caught instanceof ApiClientError && caught.isSessionExpired) {
          const query = searchParams.toString();
          const next = `${pathname}${query ? `?${query}` : ''}`;
          router.replace(`/login?next=${encodeURIComponent(next)}`);
          return;
        }
        setStatus('unavailable');
      });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    verify();
    return () => {
      verificationId.current += 1;
    };
  }, [verify]);

  if (status === 'checking') return <RouteLoading compact />;
  if (status === 'unavailable') {
    return (
      <div role="alert" className="mx-auto max-w-lg p-8 text-center">
        <p className="font-bold">بررسی نشست ثبت‌نام ممکن نیست. اتصال خود را بررسی کنید.</p>
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
