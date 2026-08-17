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
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { ApiClientError } from '@/lib/api-client';
import { createClientId } from '@/lib/client-id';
import { DIRECT_UPLOAD_RETRY_MESSAGE, putFileDirectly } from '@/lib/direct-object-upload';
import { CopyPaymentValue } from './copy-payment-value';
import { formatIrr } from '@/lib/formatters';

const receiptDraftKey = (mode: string, scheduleItemId: string) =>
  `offline-receipt-draft:${mode}:${scheduleItemId}`;

export function OfflinePaymentForm({
  items = [],
  mode = 'panel',
}: {
  items?: { id: string; label: string; amount: number }[];
  mode?: 'panel' | 'onboarding';
}) {
  const router = useRouter();
  const [scheduleItemId, setScheduleItemId] = useState(items[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState<OfflineDestination>();
  const [receipt, setReceipt] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [progress, setProgress] = useState(0);
  const uploadAbort = useRef<AbortController | undefined>(undefined);
  const receiptAuthorization = useRef<
    | {
        submissionId: string;
        file: File;
        uploadUrl: string;
        expiresAt: number;
      }
    | undefined
  >(undefined);
  const idempotencyKey = useRef(createClientId());
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const selectedItem = items.find(({ id }) => id === scheduleItemId);
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
      noValidate
      className="space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,.45)] sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitted(false);
        setError(undefined);
        if (!scheduleItemId) {
          setError('ابتدا قسط موردنظر را انتخاب کنید.');
          return;
        }
        if (/[A-Za-z]/.test(description)) {
          setError('در فیلدهای متنی فقط حروف فارسی مجاز است.');
          return;
        }
        if (!receipt) {
          setError('تصویر رسید پرداخت را انتخاب کنید.');
          return;
        }
        setPending(true);
        try {
          const storageKey = receiptDraftKey(mode, scheduleItemId);
          const savedSubmissionId = window.sessionStorage.getItem(storageKey);
          const submissionId =
            savedSubmissionId ??
            (await submitOfflinePayment(
              scheduleItemId,
              {
                paidAt: new Date().toISOString(),
                referenceNumber: `RECEIPT-${idempotencyKey.current}`,
                description: description || undefined,
              },
              mode,
              idempotencyKey.current,
            ));
          window.sessionStorage.setItem(storageKey, submissionId);
          let authorization = receiptAuthorization.current;
          if (
            !authorization ||
            authorization.submissionId !== submissionId ||
            authorization.file !== receipt ||
            authorization.expiresAt <= Date.now()
          ) {
            const created = await authorizeReceiptUpload(submissionId, receipt, mode);
            authorization = {
              submissionId,
              file: receipt,
              uploadUrl: created.uploadUrl,
              expiresAt: Date.now() + created.expiresInSeconds * 1000,
            };
            receiptAuthorization.current = authorization;
          }
          const controller = new AbortController();
          uploadAbort.current = controller;
          await putFileDirectly(authorization.uploadUrl, receipt, {
            signal: controller.signal,
            onProgress: (percent) => setProgress(percent ?? 0),
          });
          await completeReceiptUpload(submissionId, mode);
          window.sessionStorage.removeItem(storageKey);
          receiptAuthorization.current = undefined;
          setSubmitted(true);
          setScheduleItemId('');
          setDescription('');
          setReceipt(undefined);
          setPreviewUrl(undefined);
          setProgress(0);
          uploadAbort.current = undefined;
          idempotencyKey.current = createClientId();
          router.refresh();
        } catch (caught) {
          if (caught instanceof ApiClientError && caught.code === 'RECEIPT_NOT_DRAFT') {
            setSubmitted(true);
            receiptAuthorization.current = undefined;
            setReceipt(undefined);
            setPreviewUrl(undefined);
            setProgress(0);
            router.refresh();
            return;
          }
          const feedback = getApiErrorFeedback(caught);
          setError(feedback.canRetry ? DIRECT_UPLOAD_RETRY_MESSAGE : feedback.message);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-l from-primary/15 via-sky-50 to-amber-50 p-5 text-sm leading-7 text-slate-700 shadow-sm">
        مبلغ را دقیقاً مطابق پرداخت انتخاب‌شده واریز کنید و فقط تصویر رسید را بفرستید. هر مبلغ کمتر
        یا بیشتر از مبلغ اعلام‌شده قابل تأیید نیست و رسید رد خواهد شد.
      </div>
      {destination && (
        <dl className="grid gap-3 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-4 text-sm shadow-[0_18px_45px_-32px_rgba(2,132,199,.6)] sm:grid-cols-2 sm:p-5">
          <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
            <dt className="text-muted">صاحب حساب</dt>
            <dd className="font-bold">{destination.accountOwner}</dd>
          </div>
          <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
            <dt className="text-muted">بانک</dt>
            <dd className="font-bold">{destination.bankName}</dd>
          </div>
          <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
            <dt className="text-muted">شماره کارت</dt>
            <dd className="font-bold" dir="ltr">
              {destination.cardNumber}
            </dd>
            <CopyPaymentValue value={destination.cardNumber} label="شماره کارت" />
          </div>
          {destination.iban && (
            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
              <dt className="text-muted">شبا</dt>
              <dd className="font-bold" dir="ltr">
                {destination.iban}
              </dd>
              <CopyPaymentValue value={destination.iban} label="شماره شبا" />
            </div>
          )}
          {destination.accountNumber && (
            <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
              <dt className="text-muted">شماره حساب</dt>
              <dd className="font-bold" dir="ltr">
                {destination.accountNumber}
              </dd>
              <CopyPaymentValue value={destination.accountNumber} label="شماره حساب" />
            </div>
          )}
          <div className="rounded-2xl bg-navy p-4 text-white sm:col-span-2">
            <dt className="text-sm font-black text-sun">راهنمای واریز</dt>
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
          onValueChange={(value) => {
            setScheduleItemId(value);
            setSubmitted(false);
          }}
          options={items.map((item) => ({ value: item.id, label: item.label }))}
          placeholder="قسط را انتخاب کنید"
          disabled={disabled}
        />
      </label>
      {selectedItem && (
        <div role="note" className="rounded-2xl border-2 border-danger/25 bg-danger/5 p-5">
          <p className="font-black text-danger">
            مبلغ دقیق این پرداخت: {formatIrr(selectedItem.amount)}
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground">
            فقط همین مبلغ را واریز کنید. رسید مربوط به هر مبلغ دیگری توسط مدیریت رد می‌شود.
          </p>
        </div>
      )}
      <label className="text-sm font-bold">
        توضیحات (اختیاری)
        <Textarea
          disabled={disabled}
          className="mt-2"
          placeholder="اطلاعات تکمیلی پرداخت"
          value={description}
          onChange={(event) => setDescription(event.target.value.replace(/[A-Za-z]/g, ''))}
        />
      </label>
      {!submitted && (
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
              receiptAuthorization.current = undefined;
              setPreviewUrl(URL.createObjectURL(file));
              setProgress(0);
              setError(undefined);
            }}
          />
        </label>
      )}
      {!submitted && previewUrl && (
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
              receiptAuthorization.current = undefined;
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => uploadAbort.current?.abort()}
          >
            لغو بارگذاری
          </Button>
        </div>
      )}
      {submitted && (
        <Alert title="رسید با موفقیت ارسال شد">
          تصویر رسید در صف بررسی مدیریت است. می‌توانید از فهرست بالا پرداخت دیگری را انتخاب و ثبت
          کنید؛ نتیجه این رسید در اعلان‌ها و سوابق پرداخت نمایش داده می‌شود.
        </Alert>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!submitted && (
        <Button
          className="w-full sm:w-auto"
          size="lg"
          type="submit"
          loading={pending}
          disabled={disabled || pending}
        >
          ارسال رسید برای بررسی مدیر
        </Button>
      )}
    </form>
  );
}
