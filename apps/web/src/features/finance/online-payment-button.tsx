'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { startOnlinePayment } from './payments-api';

export function OnlinePaymentButton({ scheduleItemId, mode = 'panel' }: {
  scheduleItemId: string;
  amount: number;
  mode?: 'panel' | 'onboarding';
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function begin() {
    setPending(true);
    setError('');
    try {
      const result = await startOnlinePayment(scheduleItemId, mode);
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'gateway.zibal.ir') throw new Error('Invalid checkout URL');
      window.location.assign(url.toString());
    } catch {
      setError('اتصال به درگاه انجام نشد. لطفاً دوباره تلاش کنید.');
      setPending(false);
    }
  }
  return <div>
    <Button size="sm" type="button" loading={pending} disabled={pending} onClick={begin}>پرداخت آنلاین</Button>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </div>;
}
