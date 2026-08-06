'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} area="صفحه" />;
}
