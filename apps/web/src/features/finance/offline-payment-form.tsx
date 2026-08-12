'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  authorizeReceiptUpload,
  completeReceiptUpload,
  getOfflineDestination,
  submitOfflinePayment,
  type OfflineDestination,
} from './payments-api';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';

export function OfflinePaymentForm({
  items = [],
  mode = 'panel',
}: {
  items?: { id: string; label: string }[];
  mode?: 'panel' | 'onboarding';
}) {
  const router = useRouter();
  const [scheduleItemId, setScheduleItemId] = useState(items[0]?.id ?? '');
  const [paidAt, setPaidAt] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [payerName, setPayerName] = useState('');
  const [sourceCardLastFour, setSourceCardLastFour] = useState('');
  const [destination, setDestination] = useState<OfflineDestination>();
  const [receipt, setReceipt] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [uploadRequest, setUploadRequest] = useState<XMLHttpRequest>();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [formVersion, setFormVersion] = useState(0);
  useEffect(() => {
    let active = true;
    getOfflineDestination(mode)
      .then((value) => active && setDestination(value))
      .catch((caught) => active && setError(getApiErrorFeedback(caught).message));
    return () => {
      active = false;
    };
  }, [mode]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  const disabled = items.length === 0 || !destination;
  return (
    <form
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,.45)] sm:p-6"
      onSubmit={async (event) => {
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
        if (/[A-Za-z]/.test(description) || /[A-Za-z]/.test(payerName)) {
          setError('در فیلدهای متنی فقط حروف فارسی مجاز است.');
          return;
        }
        if (sourceCardLastFour && !/^\d{4}$/.test(sourceCardLastFour)) {
          setError('چهار رقم آخر کارت مبدأ باید دقیقاً ۴ رقم باشد.');
          return;
        }
        if (!receipt) {
          setError('تصویر رسید پرداخت را انتخاب کنید.');
          return;
        }
        setPending(true);
        try {
          const submissionId = await submitOfflinePayment(
            scheduleItemId,
            {
              paidAt,
              referenceNumber: referenceNumber.trim(),
              description: description || undefined,
              payerName: payerName || undefined,
              sourceCardLastFour: sourceCardLastFour || undefined,
            },
            mode,
            idempotencyKey.current,
          );
          const uploadUrl = await authorizeReceiptUpload(submissionId, receipt, mode);
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            setUploadRequest(xhr);
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', receipt.type);
            xhr.upload.onprogress = (event) =>
              event.lengthComputable && setProgress(Math.round((event.loaded / event.total) * 100));
            xhr.onload = () =>
              xhr.status >= 200 && xhr.status < 300
                ? resolve()
                : reject(new Error('بارگذاری رسید ناموفق بود.'));
            xhr.onerror = () => reject(new Error('ارتباط با ذخیره‌گاه رسید قطع شد.'));
            xhr.onabort = () => reject(new Error('بارگذاری رسید لغو شد.'));
            xhr.send(receipt);
          });
          await completeReceiptUpload(submissionId, mode);
          setSubmitted(true);
          setScheduleItemId('');
          setPaidAt('');
          setReferenceNumber('');
          setDescription('');
          setPayerName('');
          setSourceCardLastFour('');
          setReceipt(undefined);
          setPreviewUrl(undefined);
          setProgress(0);
          setUploadRequest(undefined);
          idempotencyKey.current = crypto.randomUUID();
          setFormVersion((current) => current + 1);
          router.refresh();
        } catch (caught) {
          setError(getApiErrorFeedback(caught).message);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/10 to-sky-50 p-4 text-sm leading-7 text-slate-700">
        اگر مبلغ را خارج از درگاه سامانه، مانند کارت‌به‌کارت یا واریز بانکی، پرداخت کرده‌اید؛ قسط،
        تاریخ شمسی و شماره پیگیری بانکی را ثبت کنید. پرداخت پس از تأیید مدیر «پرداخت‌شده» می‌شود.
      </div>
      {destination && (
        <dl className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">صاحب حساب</dt>
            <dd className="font-bold">{destination.accountOwner}</dd>
          </div>
          <div>
            <dt className="text-muted">بانک</dt>
            <dd className="font-bold">{destination.bankName}</dd>
          </div>
          <div>
            <dt className="text-muted">شماره کارت</dt>
            <dd className="font-bold" dir="ltr">
              {destination.cardNumber}
            </dd>
          </div>
          {destination.iban && (
            <div>
              <dt className="text-muted">شبا</dt>
              <dd className="font-bold" dir="ltr">
                {destination.iban}
              </dd>
            </div>
          )}
          {destination.accountNumber && (
            <div>
              <dt className="text-muted">شماره حساب</dt>
              <dd className="font-bold" dir="ltr">
                {destination.accountNumber}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="text-muted">راهنما</dt>
            <dd className="whitespace-pre-line">{destination.instructions}</dd>
          </div>
        </dl>
      )}
      {disabled && (
        <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          قسط قابل ارسال وجود ندارد. اقساط پرداخت‌شده یا دارای رسید در انتظار بررسی، تا زمان رد رسید
          دوباره قابل انتخاب نیستند.
        </div>
      )}
      <label className="block rounded-2xl bg-slate-50 p-4 text-sm font-bold">
        قسط موردنظر
        <Select
          className="mt-2 bg-white"
          value={scheduleItemId}
          onValueChange={setScheduleItemId}
          options={items.map((item) => ({ value: item.id, label: item.label }))}
          placeholder="قسط را انتخاب کنید"
          disabled={disabled}
        />
      </label>
      <label className="text-sm font-bold">
        تاریخ پرداخت (شمسی)
        <div className="mt-2">
          <JalaliDateInput
            key={formVersion}
            required
            disabled={disabled}
            value={paidAt}
            onChange={setPaidAt}
            maxDate={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </label>
      <label className="text-sm font-bold">
        شماره پیگیری بانکی
        <Input
          disabled={disabled}
          required
          className="mt-2"
          dir="ltr"
          placeholder="مثلاً ۱۲۳۴۵۶۷۸۹"
          value={referenceNumber}
          onChange={(event) =>
            setReferenceNumber(
              event.target.value
                .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
                .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
                .replace(/\D/g, ''),
            )
          }
        />
      </label>
      <label className="text-sm font-bold">
        توضیحات یا نام صاحب حساب (اختیاری)
        <Textarea
          disabled={disabled}
          className="mt-2"
          placeholder="اطلاعات تکمیلی پرداخت"
          value={description}
          onChange={(event) => setDescription(event.target.value.replace(/[A-Za-z]/g, ''))}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">
          نام پرداخت‌کننده (اختیاری)
          <Input
            disabled={disabled}
            className="mt-2"
            value={payerName}
            onChange={(event) => setPayerName(event.target.value.replace(/[A-Za-z]/g, ''))}
          />
        </label>
        <label className="text-sm font-bold">
          چهار رقم آخر کارت مبدأ (اختیاری)
          <Input
            disabled={disabled}
            className="mt-2"
            dir="ltr"
            inputMode="numeric"
            maxLength={4}
            value={sourceCardLastFour}
            onChange={(event) =>
              setSourceCardLastFour(
                event.target.value
                  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
                  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
                  .replace(/\D/g, ''),
              )
            }
          />
        </label>
      </div>
      <label className="block rounded-2xl border-2 border-dashed border-primary/25 bg-primary/[0.025] p-4 text-sm font-bold">
        تصویر رسید (JPEG یا PNG)
        <Input
          type="file"
          accept="image/jpeg,image/png"
          required
          disabled={disabled}
          className="mt-2"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setReceipt(file);
            setPreviewUrl(URL.createObjectURL(file));
            setProgress(0);
            setError(undefined);
          }}
        />
      </label>
      {previewUrl && (
        <div className="rounded-xl border border-border p-3">
          <Image
            src={previewUrl}
            alt="پیش‌نمایش رسید پرداخت"
            width={800}
            height={600}
            sizes="(max-width: 640px) 100vw, 640px"
            unoptimized
            className="max-h-64 w-full object-contain"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => {
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setReceipt(undefined);
              setPreviewUrl(undefined);
              setProgress(0);
            }}
          >
            حذف رسید
          </Button>
        </div>
      )}
      {pending && progress > 0 && (
        <div role="status" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            بارگذاری رسید: {progress.toLocaleString('fa-IR')}٪
          </p>
          {uploadRequest && (
            <Button type="button" variant="ghost" size="sm" onClick={() => uploadRequest.abort()}>
              لغو بارگذاری
            </Button>
          )}
        </div>
      )}
      {submitted && (
        <Alert title="پرداخت برای بررسی مدیریت ارسال شد">
          پس از تأیید مدیر، وضعیت قسط به‌روزرسانی می‌شود.
        </Alert>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button className="w-full sm:w-auto" size="lg" type="submit" loading={pending} disabled={disabled || pending}>
        ارسال رسید برای بررسی مدیر
      </Button>
    </form>
  );
}
