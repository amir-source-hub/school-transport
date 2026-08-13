'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { updateNotificationConsent, type NotificationSettings } from './notifications-api';

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const [inApp, setInApp] = useState(initial.optionalUpdates.inApp);
  const [saved, setSaved] = useState({ inApp });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  return (
    <section
      aria-labelledby="notification-consent-heading"
      className="overflow-hidden rounded-[var(--radius-canvas)] border border-primary/15 bg-gradient-to-br from-white via-sky-50/50 to-amber-50/40 p-5 shadow-[var(--shadow-raised)] sm:p-7"
    >
      <h2 id="notification-consent-heading" className="text-xl font-black text-navy">
        تنظیمات رضایت اطلاع‌رسانی
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">{initial.consentText}</p>
      <p className="mt-2 text-xs text-muted">نسخه متن رضایت: {initial.textVersion}</p>
      <div className="mt-5 space-y-3">
        <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-primary/15 bg-white/90 p-4 shadow-sm transition hover:border-primary/40">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(event) => setInApp(event.target.checked)}
          />
          <span className="text-sm font-bold">اعلان‌های اختیاری داخل سامانه</span>
        </label>
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-inset p-3 text-muted">
          <span className="text-sm font-bold">پیامک‌های اختیاری</span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold">
            فعلاً غیرفعال
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-6 text-muted">
        پیام‌های ضروری مربوط به قرارداد، پرداخت و ایمنی سرویس مستقل از رضایت اختیاری ارسال می‌شوند.
      </p>
      <Button
        className="mt-6 min-w-44 shadow-lg shadow-primary/20"
        disabled={pending || saved.inApp === inApp}
        loading={pending}
        onClick={async () => {
          setPending(true);
          setMessage(undefined);
          try {
            await updateNotificationConsent('IN_APP', inApp, 'SETTINGS');
            setSaved({ inApp });
            setMessage('تنظیمات اطلاع‌رسانی ذخیره شد.');
          } catch (error) {
            setInApp(saved.inApp);
            setMessage(getApiErrorFeedback(error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        ذخیره تنظیمات
      </Button>
      {message && (
        <p role="status" className="mt-3 text-sm text-muted">
          {message}
        </p>
      )}
    </section>
  );
}
