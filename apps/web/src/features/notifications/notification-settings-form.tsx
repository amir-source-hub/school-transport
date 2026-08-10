'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { updateNotificationConsent, type NotificationSettings } from './notifications-api';

export function NotificationSettingsForm({ initial }: { initial: NotificationSettings }) {
  const [inApp, setInApp] = useState(initial.optionalUpdates.inApp);
  const [sms, setSms] = useState(initial.optionalUpdates.sms);
  const [saved, setSaved] = useState({ inApp, sms });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  return (
    <section
      aria-labelledby="notification-consent-heading"
      className="rounded-3xl border border-border bg-white p-5 sm:p-6"
    >
      <h2 id="notification-consent-heading" className="text-lg font-black">
        تنظیمات رضایت اطلاع‌رسانی
      </h2>
      <p className="mt-2 text-sm leading-7 text-muted">{initial.consentText}</p>
      <p className="mt-2 text-xs text-muted">نسخه متن رضایت: {initial.textVersion}</p>
      <div className="mt-5 space-y-3">
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border p-3">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(event) => setInApp(event.target.checked)}
          />
          <span className="text-sm font-bold">اعلان‌های اختیاری داخل سامانه</span>
        </label>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border p-3">
          <input type="checkbox" checked={sms} onChange={(event) => setSms(event.target.checked)} />
          <span className="text-sm font-bold">پیامک‌های اختیاری</span>
        </label>
      </div>
      <p className="mt-4 text-xs leading-6 text-muted">
        پیام‌های ضروری مربوط به قرارداد، پرداخت و ایمنی سرویس مستقل از رضایت اختیاری ارسال می‌شوند.
      </p>
      <Button
        className="mt-5"
        disabled={pending || (saved.inApp === inApp && saved.sms === sms)}
        loading={pending}
        onClick={async () => {
          setPending(true);
          setMessage(undefined);
          try {
            await Promise.all([
              updateNotificationConsent('IN_APP', inApp, 'SETTINGS'),
              updateNotificationConsent('SMS', sms, 'SETTINGS'),
            ]);
            setSaved({ inApp, sms });
            setMessage('تنظیمات اطلاع‌رسانی ذخیره شد.');
          } catch (error) {
            setInApp(saved.inApp);
            setSms(saved.sms);
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
