'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { setAdminAccountActive } from './admin-admins-api';

export function AdminAccountAction({
  id,
  active,
  isSelf = false,
}: {
  id: string;
  active: boolean;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (isSelf && active) {
    return (
      <Button variant="ghost" size="sm" disabled title="غیرفعال‌سازی حساب خودتان مجاز نیست">
        حساب خودتان
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            await setAdminAccountActive(id, !active);
            router.refresh();
          } catch (caught) {
            setError(getApiErrorFeedback(caught).message);
          } finally {
            setPending(false);
          }
        }}
      >
        {active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
      </Button>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </>
  );
}
