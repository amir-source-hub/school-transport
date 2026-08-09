'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { configureOfflineDestination, type AdminOfflineDestination } from './admin-payments-api';

export function OfflineDestinationForm({ current }: { current: AdminOfflineDestination | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    accountOwner: current?.accountOwner ?? '', bankName: current?.bankName ?? '',
    cardNumber: current?.cardNumber ?? '', iban: current?.iban ?? '',
    accountNumber: current?.accountNumber ?? '', instructions: current?.instructions ?? '',
  });
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const set = (key: keyof typeof form, value: string) => setForm((state) => ({ ...state, [key]: value }));
  return (
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); setPending(true); setError(undefined);
      try {
        await configureOfflineDestination({ ...form, expectedVersion: current?.version, iban: form.iban || undefined, accountNumber: form.accountNumber || undefined, confirmed });
        setConfirmed(false); router.refresh();
      } catch (caught) { setError(getApiErrorFeedback(caught).message); } finally { setPending(false); }
    }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام صاحب حساب<Input required className="mt-2" value={form.accountOwner} onChange={(e) => set('accountOwner', e.target.value)} /></label>
        <label className="text-sm font-bold">نام بانک<Input required className="mt-2" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></label>
        <label className="text-sm font-bold">شماره کارت<Input required className="mt-2" dir="ltr" inputMode="numeric" maxLength={16} value={form.cardNumber} onChange={(e) => set('cardNumber', e.target.value.replace(/\D/g, ''))} /></label>
        <label className="text-sm font-bold">شماره شبا (اختیاری)<Input className="mt-2" dir="ltr" value={form.iban} onChange={(e) => set('iban', e.target.value.replace(/\s/g, '').toUpperCase())} /></label>
        <label className="text-sm font-bold">شماره حساب (اختیاری)<Input className="mt-2" dir="ltr" value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} /></label>
      </div>
      <label className="block text-sm font-bold">راهنمای فارسی پرداخت<Textarea required className="mt-2" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></label>
      <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>اطلاعات مقصد را بررسی کرده‌ام و تأیید می‌کنم که جایگزین نسخه فعال شود.</span></label>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending} disabled={pending || !confirmed}>ذخیره نسخه جدید مقصد پرداخت</Button>
    </form>
  );
}
