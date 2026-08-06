'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} area="ورود به حساب" />;
}
