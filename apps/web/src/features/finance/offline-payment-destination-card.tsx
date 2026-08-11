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
    <dl className="grid gap-3 rounded-xl border border-border bg-white p-4 text-sm sm:grid-cols-2">
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
        <dd className="font-bold" dir="ltr">{destination.cardNumber}</dd>
      </div>
      {destination.iban && (
        <div>
          <dt className="text-muted">شماره شبا</dt>
          <dd className="break-all font-bold" dir="ltr">{destination.iban}</dd>
        </div>
      )}
      {destination.accountNumber && (
        <div>
          <dt className="text-muted">شماره حساب</dt>
          <dd className="font-bold" dir="ltr">{destination.accountNumber}</dd>
        </div>
      )}
      <div className="sm:col-span-2">
        <dt className="text-muted">راهنمای پرداخت</dt>
        <dd className="whitespace-pre-line">{destination.instructions}</dd>
      </div>
    </dl>
  );
}
