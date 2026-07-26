'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { submitOfflinePayment } from './payments-api';

export function OfflinePaymentForm({ items = [] }: { items?: { id: string; label: string }[] }) {
  const router = useRouter();
  const [scheduleItemId, setScheduleItemId] = useState(items[0]?.id ?? '');
  const [paidAt, setPaidAt] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  return (
    <form className="space-y-5" onSubmit={async (event) => {
      event.preventDefault();
      setPending(true);
      setSubmitted(false);
      try {
        await submitOfflinePayment(scheduleItemId, { paidAt, referenceNumber, description: description || undefined });
        setSubmitted(true);
        router.refresh();
      } finally {
        setPending(false);
      }
    }}>
      <Select value={scheduleItemId} onValueChange={setScheduleItemId} options={items.map((item) => ({ value: item.id, label: item.label }))} placeholder="قسط را انتخاب کنید" />
      <Input required type="datetime-local" dir="ltr" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
      <Input required dir="ltr" placeholder="شماره مرجع" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
      <Textarea placeholder="توضیحات اختیاری" value={description} onChange={(event) => setDescription(event.target.value)} />
      {submitted && <Alert title="پرداخت برای بررسی مدیریت ارسال شد">پس از تأیید مدیر، وضعیت قسط به‌روزرسانی می‌شود.</Alert>}
      <Button type="submit" loading={pending} disabled={!scheduleItemId}>ارسال برای بررسی</Button>
    </form>
  );
}
