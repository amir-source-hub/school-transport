'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} area="صفحه" />;
}
