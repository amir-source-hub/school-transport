'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { verifyOnlinePayment } from './payments-api';

export function PaymentReturnResult() {
  const params = useSearchParams();
  const [state, setState] = useState<'pending' | 'success' | 'failed'>('pending');
  const mode = params.get('mode') === 'onboarding' ? 'onboarding' : 'panel';
  const txId = params.get('txId');
  const trackId = params.get('trackId');
  useEffect(() => {
    if (!txId || !trackId || !/^\d+$/.test(trackId)) { setState('failed'); return; }
    let active = true;
    verifyOnlinePayment(txId, trackId, mode).then(() => { if (active) setState('success'); }).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [txId, trackId, mode]);
  return <main className="mx-auto w-full max-w-xl p-6"><Card>
    <h1 className="text-xl font-black">نتیجه پرداخت</h1>
    <p role="status" className="mt-4 text-sm">
      {state === 'pending' ? 'در حال بررسی پرداخت با زیبال…' : state === 'success' ? 'پرداخت تأیید و ثبت شد.' : 'پرداخت تأیید نشد. وضعیت حساب خود را بررسی کنید.'}
    </p>
    <div className="mt-5"><ButtonLink href={mode === 'onboarding' ? '/onboarding/enrollments' : '/student/payments'}>بازگشت به پرداخت‌ها</ButtonLink></div>
  </Card></main>;
}
