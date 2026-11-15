'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { startOnlinePayment } from './payments-api';
import { onlineFee } from './online-fee';
import { formatIrr } from '@/lib/formatters';
import { ApiClientError } from '@/lib/api-client';

export function OnlinePaymentButton({ scheduleItemId, amount, mode = 'panel', existingPending = false }: {
  scheduleItemId: string;
  amount: number;
  mode?: 'panel' | 'onboarding';
  existingPending?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const router = useRouter();
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const pricing = onlineFee(amount);
  async function begin() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    let redirecting = false;
    try {
      const result = await startOnlinePayment(scheduleItemId, mode, amount);
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
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.code === 'PAYMENT_AMOUNT_CHANGED') {
        setShowConfirmation(false);
        setError('مبلغ پرداخت تغییر کرده است. صفحه را تازه‌سازی کنید و مبلغ جدید را بررسی کنید.');
        router.refresh();
      } else if (caught instanceof ApiClientError && caught.code === 'CHECKOUT_EXPIRED') {
        setShowConfirmation(false);
        setError('مهلت پرداخت قبلی تمام شده است. دوباره روی پرداخت آنلاین بزنید تا درگاه جدید ساخته شود.');
        router.refresh();
      } else {
        setShowConfirmation(false);
        setError('وضعیت پرداخت مشخص نشد. کمی بعد صفحه را تازه‌سازی کنید؛ تا پیش از بررسی وضعیت، پرداخت دیگری انجام ندهید.');
      }
    } finally { if (!redirecting) { lock.current = false; setPending(false); } }
  }
  return <div>
    <Button size="sm" type="button" loading={pending} disabled={pending} onClick={() => setShowConfirmation(true)}>{existingPending ? 'بررسی و ادامه پرداخت' : 'پرداخت آنلاین'}</Button>
    {showConfirmation && <div role="dialog" aria-modal="true" aria-label="تأیید مبلغ پرداخت" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl" dir="rtl">
        <h2 className="text-lg font-black">تأیید مبلغ پرداخت آنلاین</h2>
        <dl className="space-y-2 text-sm"><div className="flex justify-between"><dt>مبلغ قسط یا پیش‌پرداخت</dt><dd>{formatIrr(amount)}</dd></div>
          <div className="flex justify-between"><dt>کارمزد درگاه</dt><dd>{formatIrr(pricing.base)}</dd></div>
          <div className="flex justify-between"><dt>مالیات کارمزد</dt><dd>{formatIrr(pricing.tax)}</dd></div>
          <div className="flex justify-between border-t pt-2 font-bold"><dt>جمع قابل پرداخت</dt><dd>{formatIrr(pricing.total)}</dd></div></dl>
        <p className="text-xs text-muted">اگر مهلت صفحهٔ زیبال تمام شد، به این بخش برگردید و پرداخت را دوباره آغاز کنید.</p>
        <div className="flex gap-2"><Button type="button" disabled={pending} loading={pending} onClick={begin}>تأیید و ادامه پرداخت</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setShowConfirmation(false)}>انصراف</Button></div>
      </div>
    </div>}
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </div>;
}
