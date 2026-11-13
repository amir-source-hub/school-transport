'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { updatePaymentMode, type PrepaymentSettings } from './admin-payments-api';

export function PaymentModeForm({ current }: { current: PrepaymentSettings }) {
  const router = useRouter();
  const [mode, setMode] = useState(current.paymentMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    setPending(true); setError(undefined); setSaved(false);
    try {
      await updatePaymentMode(mode, current.version);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally { setPending(false); }
  }}>
    <div>
      <h2 className="text-lg font-black">روش پرداخت فعال</h2>
      <p className="mt-1 text-sm text-muted">روش انتخاب‌شده برای پرداخت‌های جدید خانواده‌ها اعمال می‌شود. سوابق و بررسی‌های قبلی حفظ می‌شوند.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="روش پرداخت فعال">
      {([['ONLINE', 'پرداخت آنلاین', 'انتقال خانواده به درگاه زیبال'], ['OFFLINE', 'پرداخت آفلاین', 'ثبت رسید و بررسی توسط مدیریت']] as const).map(([value, label, detail]) =>
        <label key={value} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-4 ${mode === value ? 'border-primary bg-primary-soft' : 'border-border'}`}>
          <input type="radio" name="paymentMode" value={value} checked={mode === value} onChange={() => setMode(value)} />
          <span><strong className="block">{label}</strong><span className="text-sm text-muted">{detail}</span></span>
        </label>)}
    </div>
    <Button type="submit" loading={pending} disabled={pending || mode === current.paymentMode}>ذخیره روش پرداخت</Button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {saved && <p role="status" className="text-sm text-success">روش پرداخت ذخیره شد.</p>}
  </form>;
}
