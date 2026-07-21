'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function ParentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} area="پنل خانواده" />;
}
