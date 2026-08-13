'use client';

import { useEffect, useState } from 'react';
import { getApiErrorFeedback } from '@/lib/api-error-feedback';
import { getOfflineDestination, type OfflineDestination } from './payments-api';

export function OfflinePaymentDestinationCard({
  mode = 'panel',
}: {
  mode?: 'panel' | 'onboarding';
}) {
  const [destination, setDestination] = useState<OfflineDestination>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    getOfflineDestination(mode)
      .then((value) => active && setDestination(value))
      .catch((caught) => active && setError(getApiErrorFeedback(caught).message));
    return () => {
      active = false;
    };
  }, [mode]);

  if (error) return <p className="text-sm text-danger">{error}</p>;
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
      </div>
      {destination.iban && (
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
          <dt className="text-muted">شماره شبا</dt>
          <dd className="break-all font-bold" dir="ltr">
            {destination.iban}
          </dd>
        </div>
      )}
      {destination.accountNumber && (
        <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
          <dt className="text-muted">شماره حساب</dt>
          <dd className="font-bold" dir="ltr">
            {destination.accountNumber}
          </dd>
        </div>
      )}
      <div className="rounded-2xl bg-navy p-4 text-white sm:col-span-2">
        <dt className="font-black text-sun">راهنمای پرداخت</dt>
        <dd className="whitespace-pre-line">{destination.instructions}</dd>
      </div>
    </dl>
  );
}
