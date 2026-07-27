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
      setSubmitted(false);
      setError(undefined);
      if (!scheduleItemId) {
        setError('ابتدا قسط موردنظر را انتخاب کنید.');
        return;
      }
      if (!paidAt) {
        setError('تاریخ شمسی معتبر را وارد کنید.');
        return;
      }
      if (!referenceNumber.trim()) {
        setError('شماره پیگیری یا مرجع پرداخت را وارد کنید.');
        return;
      }
      setPending(true);
      try {
        await submitOfflinePayment(scheduleItemId, {
          paidAt,
          referenceNumber: referenceNumber.trim(),
          description: description || undefined,
        });
        setSubmitted(true);
        router.refresh();
      } catch (caught) {
        setError(getApiErrorFeedback(caught).message);
      } finally {
        setPending(false);
      }
    }}>
      <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4 text-sm leading-7">
        اگر مبلغ را خارج از درگاه سامانه، مانند کارت‌به‌کارت یا واریز بانکی، پرداخت کرده‌اید؛ قسط،
        تاریخ شمسی و شماره پیگیری بانکی را ثبت کنید. پرداخت پس از تأیید مدیر «پرداخت‌شده» می‌شود.
      </div>
      <Select value={scheduleItemId} onValueChange={setScheduleItemId} options={items.map((item) => ({ value: item.id, label: item.label }))} placeholder="قسط را انتخاب کنید" />
      <label className="text-sm font-bold">
        تاریخ پرداخت (شمسی)
        <div className="mt-2"><JalaliDateInput required value={paidAt} onChange={setPaidAt} /></div>
      </label>
      <label className="text-sm font-bold">
        شماره پیگیری بانکی
        <Input required className="mt-2" dir="ltr" placeholder="مثلاً 123456789" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
      </label>
      <label className="text-sm font-bold">
        توضیحات یا نام صاحب حساب (اختیاری)
        <Textarea className="mt-2" placeholder="اطلاعات تکمیلی پرداخت" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {submitted && <Alert title="پرداخت برای بررسی مدیریت ارسال شد">پس از تأیید مدیر، وضعیت قسط به‌روزرسانی می‌شود.</Alert>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending} disabled={pending}>ارسال رسید برای بررسی مدیر</Button>
    </form>
  );
}
