'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeDigits } from '@/features/enrollment/national-id';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { updateDefaultPrepayment, type PrepaymentSettings } from './admin-payments-api';

export function PrepaymentSettingsForm({ current }: { current: PrepaymentSettings }) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(current.defaultPrepaymentAmount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const numericAmount = Number(amount);
  return <form onSubmit={async (event) => {
    event.preventDefault();
    setError(undefined);
    setSaved(false);
    setPending(true);
    try {
      await updateDefaultPrepayment(numericAmount, current.version);
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setPending(false);
    }
  }} className="flex flex-wrap items-end gap-3">
    <label className="min-w-56 flex-1 text-sm font-bold">پیش‌پرداخت پیش‌فرض برای ثبت‌نام‌های جدید (ریال)
      <Input className="mt-2" inputMode="numeric" dir="ltr" value={amount}
        onChange={(event) => setAmount(normalizeDigits(event.target.value).replace(/\D/g, ''))} />
    </label>
    <Button type="submit" loading={pending} disabled={!Number.isInteger(numericAmount) || numericAmount <= 0 || numericAmount > 2_147_483_640}>ذخیره مبلغ</Button>
    {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
    {saved && <p role="status" className="w-full text-sm text-success">مبلغ جدید برای ثبت‌نام‌های بعدی ذخیره شد.</p>}
  </form>;
}
