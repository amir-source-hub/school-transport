'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { ApiClientError } from '@/lib/api-client';
import {
  configureInstallments,
  approvePayment,
  rejectPayment,
  getReceiptView,
  recordPaymentOnBehalf,
} from '@/features/admin-payments/admin-payments-api';

export function RecordPaymentOnBehalfDialog({
  scheduleItemId,
  label,
  onCompleted,
}: {
  scheduleItemId: string;
  label: string;
  onCompleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paidAt, setPaidAt] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState<File>();
  const [error, setError] = useState<string>();
  const idempotencyKey = useRef(crypto.randomUUID());

  const submit = async () => {
    if (!paidAt || !referenceNumber.trim() || !receipt) {
      setError('تاریخ پرداخت، شماره مرجع و تصویر رسید همگی الزامی هستند.');
      return;
    }
    if (!['image/jpeg', 'image/png'].includes(receipt.type)) {
      setError('تصویر رسید باید با فرمت JPEG یا PNG باشد.');
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      await recordPaymentOnBehalf(
        scheduleItemId,
        {
          paidAt,
          referenceNumber: referenceNumber.trim(),
          description: description.trim() || undefined,
        },
        receipt,
        idempotencyKey.current,
      );
      idempotencyKey.current = crypto.randomUUID();
      setOpen(false);
      onCompleted?.();
      router.refresh();
    } catch (caught) {
      setError(getApiErrorFeedback(caught).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">ثبت پرداخت به نمایندگی خانواده</Button>
      </DialogTrigger>
      <DialogContent
        title={`ثبت پرداخت ${label}`}
        description="پرداخت فقط همراه با تصویر رسید معتبر ثبت و قطعی می‌شود."
      >
        <div className="space-y-4">
          <label className="block text-sm font-bold">
            تاریخ پرداخت (شمسی) *
            <div className="mt-2">
              <JalaliDateInput required value={paidAt} onChange={setPaidAt} />
            </div>
          </label>
          <label className="block text-sm font-bold">
            شماره رسید / مرجع پرداخت *
            <Input
              className="mt-2"
              dir="ltr"
              value={referenceNumber}
              onChange={(event) => setReferenceNumber(event.target.value)}
            />
          </label>
          <label className="block text-sm font-bold">
            تصویر رسید (JPEG یا PNG) *
            <Input
              className="mt-2"
              type="file"
              accept="image/jpeg,image/png"
              onChange={(event) => setReceipt(event.target.files?.[0])}
            />
          </label>
          <label className="block text-sm font-bold">
            توضیحات پرداخت
            <Textarea
              className="mt-2"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button loading={loading} onClick={submit}>
              ثبت پرداخت و رسید
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ReceiptPreviewDialog({ submissionId }: { submissionId: string }) {
  const [open, setOpen] = useState(false);
  const [viewUrl, setViewUrl] = useState<string>();
  const [error, setError] = useState<string>();
  return (
    <Dialog
      open={open}
      onOpenChange={async (next) => {
        setOpen(next);
        if (!next || viewUrl) return;
        try {
          setViewUrl((await getReceiptView(submissionId)).viewUrl);
        } catch (caught) {
          setError(getApiErrorFeedback(caught).message);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">مشاهده رسید</Button>
      </DialogTrigger>
      <DialogContent
        title="تصویر رسید پرداخت"
        description="این پیوند کوتاه‌عمر و فقط برای بررسی مجاز است."
      >
        {viewUrl ? (
          <Image
            src={viewUrl}
            alt="رسید پرداخت ارسالی"
            width={1200}
            height={1200}
            sizes="(max-width: 640px) 100vw, 640px"
            unoptimized
            className="max-h-[65vh] w-full object-contain"
          />
        ) : (
          <p role="status" className="text-sm text-muted">
            در حال دریافت رسید…
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApprovePaymentDialog({
  paymentId,
  version,
}: {
  paymentId: string;
  version: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await approvePayment(paymentId, version);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(getApiErrorFeedback(e).message);
      if (e instanceof ApiClientError && e.code === 'OFFLINE_PAYMENT_NOT_PENDING') {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>تأیید پرداخت</Button>
      </DialogTrigger>
      <DialogContent
        title="تأیید پرداخت"
        description="پس از تأیید، مبلغ به حساب مدرسه واریز شده محسوب می‌شود."
      >
        <div className="space-y-4">
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button loading={loading} onClick={handle}>
              تأیید پرداخت
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConfigureInstallmentsDialog({
  planId,
  fullPayment = false,
}: {
  planId: string;
  fullPayment?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>();
  const [items, setItems] = useState([{ amount: '', dueDate: '' }]);
  const update = (index: number, key: 'amount' | 'dueDate', value: string) =>
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{fullPayment ? 'تنظیم پرداخت باقی‌مانده' : 'تنظیم برنامه اقساط'}</Button>
      </DialogTrigger>
      <DialogContent
        title={fullPayment ? 'پرداخت یکجای باقی‌مانده' : 'برنامه اقساط'}
        description={
          fullPayment
            ? 'مبلغ باقی‌مانده و تاریخ پرداخت را تعیین کنید. پیش‌پرداخت ثابت می‌ماند.'
            : 'تعداد، مبلغ و تاریخ هر قسط را تعیین کنید. پیش‌پرداخت ۴٬۹۹۷٬۸۰۰ تومان ثابت می‌ماند.'
        }
      >
        <div className="max-h-[65vh] space-y-4 overflow-y-auto">
          {items.map((item, index) => {
            const amountErrors = fieldErrors?.[`items.${index}.amount`] ?? [];
            const dueDateErrors = fieldErrors?.[`items.${index}.dueDate`] ?? [];
            return (
              <div key={index} className="space-y-2">
                <div className="grid grid-cols-1 items-end gap-3 rounded-xl bg-surface-muted p-3 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
                  <span className="text-sm font-black md:pb-3">
                    {fullPayment ? 'باقی‌مانده' : `قسط ${(index + 1).toLocaleString('fa-IR')}`}
                  </span>
                  <label className="text-xs font-bold">
                    مبلغ (ریال)
                    <Input
                      inputMode="numeric"
                      value={item.amount}
                      onChange={(event) =>
                        update(index, 'amount', event.target.value.replace(/\D/g, ''))
                      }
                    />
                  </label>
                  <label className="text-xs font-bold">
                    سررسید (شمسی)
                    <JalaliDateInput
                      required
                      value={item.dueDate}
                      onChange={(value) => update(index, 'dueDate', value)}
                    />
                  </label>
                </div>
                {[...amountErrors, ...dueDateErrors].map((message, messageIndex) => (
                  <p key={messageIndex} className="text-xs text-danger">
                    {message}
                  </p>
                ))}
              </div>
            );
          })}
          <div className="flex gap-2">
            {!fullPayment && items.length < 12 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setItems((current) => [...current, { amount: '', dueDate: '' }])}
              >
                افزودن قسط
              </Button>
            )}
            {!fullPayment && items.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setItems((current) => current.slice(0, -1))}
              >
                حذف قسط آخر
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            className="w-full"
            loading={loading}
            disabled={items.some((item) => !item.amount || !item.dueDate)}
            onClick={async () => {
              setLoading(true);
              setError(undefined);
              setFieldErrors(undefined);
              try {
                await configureInstallments(
                  planId,
                  items.map((item) => ({ amount: Number(item.amount), dueDate: item.dueDate })),
                );
                setOpen(false);
                router.refresh();
              } catch (caught) {
                const feedback = getApiErrorFeedback(caught);
                setError(feedback.message);
                setFieldErrors(feedback.fieldErrors);
              } finally {
                setLoading(false);
              }
            }}
          >
            {fullPayment ? 'ثبت پرداخت باقی‌مانده' : 'ذخیره برنامه اقساط'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RejectPaymentDialog({
  paymentId,
  version,
}: {
  paymentId: string;
  version: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await rejectPayment(paymentId, version, reason.trim());
      setOpen(false);
      setReason('');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در رد پرداخت');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">رد پرداخت</Button>
      </DialogTrigger>
      <DialogContent title="رد پرداخت" description="دلیل رد را وارد کنید.">
        <div className="space-y-4">
          <div>
            <label htmlFor="pay-reject-reason" className="text-sm font-bold">
              دلیل رد
            </label>
            <Textarea
              id="pay-reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="دلیل رد را شرح دهید..."
              className="mt-2"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setReason('');
              }}
            >
              انصراف
            </Button>
            <Button variant="danger" loading={loading} disabled={!reason.trim()} onClick={handle}>
              رد پرداخت
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
