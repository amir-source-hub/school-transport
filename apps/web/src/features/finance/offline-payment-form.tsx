'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/feedback/alert';
import { Field } from '@/components/forms/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const offlinePaymentSchema = z.object({
  paidAt: z.string().min(1, 'تاریخ و زمان پرداخت را وارد کنید.'),
  referenceNumber: z.string().trim().min(3, 'شماره مرجع معتبر وارد کنید.'),
  description: z.string().trim().max(500, 'توضیحات باید حداکثر ۵۰۰ نویسه باشد.'),
});

type OfflinePaymentValues = z.infer<typeof offlinePaymentSchema>;

export function OfflinePaymentForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OfflinePaymentValues>({
    resolver: zodResolver(offlinePaymentSchema),
    defaultValues: { paidAt: '', referenceNumber: '', description: '' },
  });

  const submitDemo = handleSubmit(async () => {
    setSubmitted(false);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setSubmitted(true);
  });

  return (
    <form className="space-y-5" onSubmit={submitDemo} noValidate>
      <Alert tone="warning" title="ارسال نمایشی برای بررسی مدیریت">
        این فرم هیچ پرداختی را تأیید نمی‌کند و مانده حساب را تغییر نمی‌دهد. نتیجه فقط وضعیت «در
        انتظار بررسی» را شبیه‌سازی می‌کند.
      </Alert>

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="قسط مرتبط"
          htmlFor="offline-invoice"
          hint="ارسال آفلاین باید به یک فاکتور مشخص متصل باشد."
        >
          <Input id="offline-invoice" value="قسط ماه دوم — نمایشی" disabled />
        </Field>
        <Field
          label="تاریخ و زمان پرداخت"
          htmlFor="offline-paid-at"
          required
          error={errors.paidAt?.message}
        >
          <Input
            id="offline-paid-at"
            type="datetime-local"
            dir="ltr"
            {...register('paidAt')}
            aria-invalid={Boolean(errors.paidAt)}
            aria-describedby="offline-paid-at-message"
          />
        </Field>
        <Field
          label="شماره مرجع"
          htmlFor="offline-reference"
          required
          error={errors.referenceNumber?.message}
        >
          <Input
            id="offline-reference"
            dir="ltr"
            {...register('referenceNumber')}
            aria-invalid={Boolean(errors.referenceNumber)}
            aria-describedby="offline-reference-message"
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label="توضیحات اختیاری"
            htmlFor="offline-description"
            error={errors.description?.message}
          >
            <Textarea
              id="offline-description"
              {...register('description')}
              aria-invalid={Boolean(errors.description)}
              aria-describedby="offline-description-message"
            />
          </Field>
        </div>
      </div>

      <p className="text-sm text-muted">
        بارگذاری تصویر رسید تا زمان تصویب نوع فایل، سقف حجم و قرارداد رسانه‌ای غیرفعال است.
      </p>

      {submitted && (
        <Alert title="جزئیات نمایشی در انتظار بررسی قرار گرفت">
          این تأیید فقط از آداپتور mock آمده است؛ پرداخت هنوز تأییدشده یا پرداخت‌شده نیست.
        </Alert>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'در حال ارسال نمایشی…' : 'ارسال نمایشی برای بررسی'}
      </Button>
    </form>
  );
}
