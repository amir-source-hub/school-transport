'use client';

import { RouteError } from '@/components/feedback/route-error';

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError reset={reset} area="پنل مدیریت" />;
}
