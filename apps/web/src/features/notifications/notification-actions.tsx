'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { markAllNotificationsRead, markNotificationRead } from './notifications-api';
export function MarkReadButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            await markNotificationRead(id);
            router.refresh();
          } catch (cause) {
            setError(getApiErrorFeedback(cause).message);
            setPending(false);
          }
        }}
      >
        خواندم
      </Button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </>
  );
}
export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            await markAllNotificationsRead();
            router.refresh();
          } catch (cause) {
            setError(getApiErrorFeedback(cause).message);
            setPending(false);
          }
        }}
      >
        خواندن همه
      </Button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </>
  );
}
