'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getOfflineDestination, submitOfflinePayment, type OfflineDestination } from './payments-api';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function OfflinePaymentForm({ items = [], mode = 'panel' }: { items?: { id: string; label: string }[]; mode?: 'panel' | 'onboarding' }) {
  const router = useRouter();
  const [scheduleItemId, setScheduleItemId] = useState(items[0]?.id ?? '');
  const [paidAt, setPaidAt] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [sourceCardLastFour, setSourceCardLastFour] = useState('');
  const [destination, setDestination] = useState<OfflineDestination>();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [formVersion, setFormVersion] = useState(0);
  useEffect(() => {
    let active = true;
    getOfflineDestination(mode)
      .then((value) => active && setDestination(value))
      .catch((caught) => active && setError(getApiErrorFeedback(caught).message));
    return () => { active = false; };
  }, [mode]);
  const disabled = items.length === 0 || !destination;
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
      if (sourceCardLastFour && !/^\d{4}$/.test(sourceCardLastFour)) {
        setError('چهار رقم آخر کارت مبدأ باید دقیقاً ۴ رقم باشد.');
        return;
      }
      setPending(true);
      try {
        await submitOfflinePayment(scheduleItemId, {
          paidAt,
          referenceNumber: referenceNumber.trim(),
          description: description || undefined,
          payerName: payerName || undefined,
          sourceCardLastFour: sourceCardLastFour || undefined,
        }, mode);
        setSubmitted(true);
        setScheduleItemId('');
        setPaidAt('');
        setReferenceNumber('');
        setDescription('');
        setPayerName('');
        setSourceCardLastFour('');
        setFormVersion((current) => current + 1);
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
      {destination && (
        <dl className="grid gap-3 rounded-xl border border-border bg-white p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">صاحب حساب</dt><dd className="font-bold">{destination.accountOwner}</dd></div>
          <div><dt className="text-muted">بانک</dt><dd className="font-bold">{destination.bankName}</dd></div>
          <div><dt className="text-muted">شماره کارت</dt><dd className="font-bold" dir="ltr">{destination.cardNumber}</dd></div>
          {destination.iban && <div><dt className="text-muted">شبا</dt><dd className="font-bold" dir="ltr">{destination.iban}</dd></div>}
          <div className="sm:col-span-2"><dt className="text-muted">راهنما</dt><dd className="whitespace-pre-line">{destination.instructions}</dd></div>
        </dl>
      )}
      {disabled && (
        <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          قسط قابل ارسال وجود ندارد. اقساط پرداخت‌شده یا دارای رسید در انتظار بررسی، تا زمان رد
          رسید دوباره قابل انتخاب نیستند.
        </div>
      )}
      <Select
        value={scheduleItemId}
        onValueChange={setScheduleItemId}
        options={items.map((item) => ({ value: item.id, label: item.label }))}
        placeholder="قسط را انتخاب کنید"
        disabled={disabled}
      />
      <label className="text-sm font-bold">
        تاریخ پرداخت (شمسی)
        <div className="mt-2">
          <JalaliDateInput
            key={formVersion}
            required
            disabled={disabled}
            value={paidAt}
            onChange={setPaidAt}
          />
        </div>
      </label>
      <label className="text-sm font-bold">
        شماره پیگیری بانکی
        <Input disabled={disabled} required className="mt-2" dir="ltr" placeholder="مثلاً 123456789" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
      </label>
      <label className="text-sm font-bold">
        توضیحات یا نام صاحب حساب (اختیاری)
        <Textarea disabled={disabled} className="mt-2" placeholder="اطلاعات تکمیلی پرداخت" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">نام پرداخت‌کننده (اختیاری)<Input disabled={disabled} className="mt-2" value={payerName} onChange={(event) => setPayerName(event.target.value)} /></label>
        <label className="text-sm font-bold">چهار رقم آخر کارت مبدأ (اختیاری)<Input disabled={disabled} className="mt-2" dir="ltr" inputMode="numeric" maxLength={4} value={sourceCardLastFour} onChange={(event) => setSourceCardLastFour(event.target.value.replace(/\D/g, ''))} /></label>
      </div>
      {submitted && <Alert title="پرداخت برای بررسی مدیریت ارسال شد">پس از تأیید مدیر، وضعیت قسط به‌روزرسانی می‌شود.</Alert>}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" loading={pending} disabled={disabled || pending}>ارسال رسید برای بررسی مدیر</Button>
    </form>
  );
}
