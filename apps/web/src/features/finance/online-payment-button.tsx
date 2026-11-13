'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { startOnlinePayment } from './payments-api';

export function OnlinePaymentButton({ scheduleItemId, mode = 'panel', existingPending = false }: {
  scheduleItemId: string;
  amount: number;
  mode?: 'panel' | 'onboarding';
  existingPending?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const router = useRouter();
  const [error, setError] = useState('');
  async function begin() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    let redirecting = false;
    try {
      const result = await startOnlinePayment(scheduleItemId, mode);
      if (result.transactionStatus === 'SUCCEEDED') {
        setError('این پرداخت قبلاً با موفقیت ثبت شده است. وضعیت صفحه در حال به‌روزرسانی است.');
        router.refresh();
        return;
      }
      if (!result.checkoutUrl) throw new Error('Checkout URL is missing');
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'gateway.zibal.ir') throw new Error('Invalid checkout URL');
      window.location.assign(url.toString());
      redirecting = true;
    } catch {
      setError('وضعیت پرداخت مشخص نشد. کمی بعد صفحه را تازه‌سازی کنید؛ تا پیش از بررسی وضعیت، پرداخت دیگری انجام ندهید.');
    } finally { if (!redirecting) { lock.current = false; setPending(false); } }
  }
  return <div>
    <Button size="sm" type="button" loading={pending} disabled={pending} onClick={begin}>{existingPending ? 'بررسی و ادامه پرداخت' : 'پرداخت آنلاین'}</Button>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </div>;
}
