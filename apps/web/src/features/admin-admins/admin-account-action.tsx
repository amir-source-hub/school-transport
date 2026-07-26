'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { setAdminAccountActive } from './admin-admins-api';

export function AdminAccountAction({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={async () => {
        setPending(true);
        try {
          await setAdminAccountActive(id, !active);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
    </Button>
  );
}
