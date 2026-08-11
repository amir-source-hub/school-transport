'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { JalaliDateTimeInput } from '@/components/forms/jalali-date-time-input';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import {
  createBroadcast,
  previewBroadcast,
  type BroadcastEstimate,
  type BroadcastInput,
} from './admin-broadcasts-api';

function initialDate(hours: number) {
  const date = new Date(Date.now() + hours * 60 * 60 * 1000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tehran',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function tehranLocalToIso(value: string): string {
  return new Date(`${value}:00+03:30`).toISOString();
}

export function BroadcastForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [estimate, setEstimate] = useState<BroadcastEstimate>();
  const [message, setMessage] = useState<string>();
  const [values, setValues] = useState({
    name: '',
    smsContent: '',
    inAppTitle: '',
    inAppContent: '',
    scheduledAt: initialDate(1),
    expiresAt: initialDate(25),
    featureEnabled: false,
  });

  const payload = (): BroadcastInput => ({
    ...values,
    inAppTitle: values.inAppTitle || undefined,
    inAppContent: values.inAppContent || undefined,
    scheduledAt: tehranLocalToIso(values.scheduledAt),
    expiresAt: tehranLocalToIso(values.expiresAt),
  });

  async function run(mode: 'preview' | 'submit', event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    try {
      const input = payload();
      if (mode === 'preview') {
        setEstimate(await previewBroadcast(input));
        setMessage('برآورد به‌روز شد.');
      } else {
        await createBroadcast(input);
        setMessage('پیام برای تأیید مدیر دوم ثبت شد.');
        router.refresh();
      }
    } catch (error) {
      setMessage(getApiErrorFeedback(error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => run('submit', event)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-bold">نام کمپین</span>
          <Input
            required
            minLength={3}
            maxLength={120}
            value={values.name}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-bold">متن پیامک فارسی</span>
          <Textarea
            required
            minLength={2}
            maxLength={500}
            value={values.smsContent}
            onChange={(event) => {
              setValues({ ...values, smsContent: event.target.value });
              setEstimate(undefined);
            }}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-bold">عنوان اعلان داخل سامانه (اختیاری)</span>
          <Input
            maxLength={200}
            value={values.inAppTitle}
            onChange={(event) => setValues({ ...values, inAppTitle: event.target.value })}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-bold">متن اعلان داخل سامانه (اختیاری)</span>
          <Textarea
            maxLength={1000}
            value={values.inAppContent}
            onChange={(event) => setValues({ ...values, inAppContent: event.target.value })}
          />
        </label>
        <JalaliDateTimeInput
          label="زمان ارسال (تهران)"
          required
          value={values.scheduledAt}
          onChange={(scheduledAt) => setValues({ ...values, scheduledAt })}
        />
        <JalaliDateTimeInput
          label="زمان انقضا (تهران)"
          required
          value={values.expiresAt}
          onChange={(expiresAt) => setValues({ ...values, expiresAt })}
        />
      </div>
      <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border p-3">
        <input
          type="checkbox"
          checked={values.featureEnabled}
          onChange={(event) => setValues({ ...values, featureEnabled: event.target.checked })}
        />
        <span className="text-sm font-bold">این کمپین برای ارسال فعال باشد</span>
      </label>
      <p className="text-xs leading-6 text-muted">
        فقط حساب‌های فعال دارای رضایت پیامک اختیاری در برآورد و ارسال لحاظ می‌شوند. تأیید باید توسط
        مدیر ارشد دیگری انجام شود.
      </p>
      {estimate && (
        <div className="grid gap-3 rounded-2xl bg-surface-muted p-4 text-sm sm:grid-cols-3">
          <p>
            قطعه پیامک: <b>{estimate.segmentCount}</b>
          </p>
          <p>
            گیرنده برآوردی: <b>{estimate.estimatedRecipients}</b>
          </p>
          <p>
            هزینه برآوردی: <b>{estimate.estimatedCostRial.toLocaleString('fa-IR')} ریال</b>
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={(event) => run('preview', event)}
        >
          محاسبه برآورد
        </Button>
        <Button type="submit" loading={pending} disabled={pending || !estimate}>
          ثبت برای تأیید
        </Button>
      </div>
      {message && (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      )}
    </form>
  );
}
