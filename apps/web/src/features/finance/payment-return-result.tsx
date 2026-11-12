'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { confirmReturnedOnlinePayment } from './payments-api';

export function PaymentReturnResult() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<'pending' | 'success' | 'failed'>('pending');
  const mode = params.get('mode') === 'onboarding' ? 'onboarding' : 'panel';
  const txId = params.get('txId');
  const trackId = params.get('trackId');
  const invalidReturn = !txId || !trackId || !/^\d+$/.test(trackId);
  useEffect(() => {
    if (!txId || !trackId || !/^\d+$/.test(trackId)) return;
    let active = true;
    confirmReturnedOnlinePayment(txId, trackId).then(() => { if (active) setState('success'); }).catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [txId, trackId]);
  useEffect(() => {
    if (invalidReturn || state !== 'success') return;
    const timer = window.setTimeout(() => router.replace(mode === 'onboarding' ? '/onboarding/enrollments' : '/student/payments'), 3000);
    return () => window.clearTimeout(timer);
  }, [invalidReturn, state, mode, router]);
  return <main className="mx-auto w-full max-w-xl p-6"><Card>
    <h1 className="text-xl font-black">نتیجه پرداخت</h1>
    <p role="status" className="mt-4 text-sm">
      {invalidReturn || state === 'failed' ? 'پرداخت تأیید نشد. وضعیت حساب خود را بررسی کنید.' : state === 'success' ? 'پرداخت تأیید و ثبت شد. تا چند لحظه دیگر به بخش پرداخت‌ها برمی‌گردید.' : 'در حال بررسی پرداخت با زیبال…'}
    </p>
    <div className="mt-5"><ButtonLink href={mode === 'onboarding' ? '/onboarding/enrollments' : '/student/payments'}>بازگشت به پرداخت‌ها</ButtonLink></div>
  </Card></main>;
}
