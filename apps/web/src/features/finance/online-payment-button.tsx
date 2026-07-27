'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { startOnlinePayment, verifyOnlinePayment } from './payments-api';

export function OnlinePaymentButton({
  scheduleItemId,
  amount,
}: {
  scheduleItemId: string;
  amount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <div>
      <Button
        size="sm"
        loading={pending}
        onClick={async () => {
          setPending(true);
          setError(undefined);
          try {
            const transaction = await startOnlinePayment(scheduleItemId);
            await verifyOnlinePayment(
              transaction.id,
              `mock:${amount}:schedule-${scheduleItemId}`,
            );
            router.refresh();
          } catch (caught) {
            setError(getApiErrorFeedback(caught).message);
          } finally {
            setPending(false);
          }
        }}
      >
        پرداخت آنلاین
      </Button>
      {error && <p className="mt-2 max-w-60 text-xs text-danger">{error}</p>}
    </div>
  );
}
