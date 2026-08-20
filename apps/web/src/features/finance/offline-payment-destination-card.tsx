'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { ApiClientError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { getOfflineDestination, type OfflineDestination } from './payments-api';
import { CopyPaymentValue } from './copy-payment-value';

export function OfflinePaymentDestinationCard({
  mode = 'panel',
  onReadyChange,
}: {
  mode?: 'panel' | 'onboarding';
  onReadyChange?: (ready: boolean) => void;
}) {
  const [destination, setDestination] = useState<OfflineDestination>();
  const [error, setError] = useState<string>();
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    onReadyChange?.(false);
    getOfflineDestination(mode)
      .then((value) => {
        if (!active) return;
        setDestination(value);
        onReadyChange?.(true);
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          caught instanceof ApiClientError && caught.code === 'OFFLINE_DESTINATION_UNAVAILABLE'
            ? 'اطلاعات کارت و حساب پرداخت هنوز توسط مدیر سامانه ثبت نشده است.'
            : getApiErrorFeedback(caught).message,
        );
      });
    return () => {
      active = false;
    };
  }, [mode, onReadyChange, retryAttempt]);

  if (error)
    return (
      <div role="alert" className="rounded-2xl border border-warning/30 bg-warning-soft p-4">
        <p className="text-sm font-bold leading-7 text-foreground">{error}</p>
        <p className="mt-1 text-xs leading-6 text-muted">
          مدیر سامانه می‌تواند این اطلاعات را از بخش «پرداخت‌ها» در پنل مدیریت ثبت کند.
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          onClick={() => {
            setError(undefined);
            setDestination(undefined);
            onReadyChange?.(false);
            setRetryAttempt((attempt) => attempt + 1);
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          تلاش دوباره
        </Button>
      </div>
    );
  if (!destination) return <p className="text-sm text-muted">در حال دریافت اطلاعات پرداخت…</p>;

  return (
    <dl className="grid gap-3 rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 text-sm shadow-[0_18px_45px_-32px_rgba(2,132,199,.6)] sm:grid-cols-2">
      <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
        <dt className="text-muted">صاحب حساب</dt>
        <dd className="font-bold">{destination.accountOwner}</dd>
      </div>
      <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
        <dt className="text-muted">بانک</dt>
        <dd className="font-bold">{destination.bankName}</dd>
      </div>
      <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
        <dt className="text-muted">شماره کارت</dt>
        <dd className="font-bold" dir="ltr">
          {destination.cardNumber}
        </dd>
        <CopyPaymentValue value={destination.cardNumber} label="شماره کارت" />
      </div>
      {destination.iban && (
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
          <dt className="text-muted">شماره شبا</dt>
          <dd className="break-all font-bold" dir="ltr">
            {destination.iban}
          </dd>
          <CopyPaymentValue value={destination.iban} label="شماره شبا" />
        </div>
      )}
      {destination.accountNumber && (
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
          <dt className="text-muted">شماره حساب</dt>
          <dd className="font-bold" dir="ltr">
            {destination.accountNumber}
          </dd>
          <CopyPaymentValue value={destination.accountNumber} label="شماره حساب" />
        </div>
      )}
      <div className="rounded-2xl bg-navy p-4 text-white sm:col-span-2">
        <dt className="font-black text-sun">راهنمای پرداخت</dt>
        <dd className="whitespace-pre-line">{destination.instructions}</dd>
      </div>
    </dl>
  );
}
