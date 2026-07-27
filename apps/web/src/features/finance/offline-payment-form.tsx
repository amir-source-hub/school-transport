'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { submitOfflinePayment } from './payments-api';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function OfflinePaymentForm({ items = [] }: { items?: { id: string; label: string }[] }) {
  const router = useRouter();
  const [scheduleItemId, setScheduleItemId] = useState(items[0]?.id ?? '');
  const [paidAt, setPaidAt] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault();
      setPending(true);
      setSubmitted(false);
      setError(undefined);
      try {
        await submitOfflinePayment(scheduleItemId, { paidAt, referenceNumber, description: description || undefined });
        setSubmitted(true);
        router.refresh();
      } catch (caught) {
        setError(getApiErrorFeedback(caught).message);
      } finally {
        setPending(false);
      }
    }}>
      <Select value={scheduleItemId} onValueChange={setScheduleItemId} options={items.map((item) => ({ value: item.id, label: item.label }))} placeholder="قسط را انتخاب کنید" />
      <label className="text-sm font-bold">
        تاریخ پرداخت (شمسی)
        <div className="mt-2"><JalaliDateInput required value={paidAt} onChange={setPaidAt} /></div>
      </label>
      <Input required dir="ltr" placeholder="شماره مرجع" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
      <Textarea placeholder="توضیحات اختیاری" value={description} onChange={(event) => setDescription(event.target.value)} />
      {submitted && <Alert title="پرداخت برای بررسی مدیریت ارسال شد">پس از تأیید مدیر، وضعیت قسط به‌روزرسانی می‌شود.</Alert>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending} disabled={!scheduleItemId || !paidAt}>ارسال برای بررسی</Button>
    </form>
  );
}
