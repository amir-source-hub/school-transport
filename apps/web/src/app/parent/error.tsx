'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function ParentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError error={error} reset={reset} area="پنل خانواده" />;
}
