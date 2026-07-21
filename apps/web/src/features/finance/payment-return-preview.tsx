'use client';

import { useState } from 'react';

import { Alert } from '@/components/feedback/alert';
import { Button } from '@/components/ui/button';
import {
  paymentReturnStates,
  type PaymentReturnState,
} from '@/features/finance/payment-return-state';

const stateOrder: PaymentReturnState[] = ['pending', 'success', 'failed', 'cancelled', 'completed'];

export function PaymentReturnPreview() {
  const [activeState, setActiveState] = useState<PaymentReturnState>('pending');
  const result = paymentReturnStates[activeState];

  return (
    <section aria-labelledby="payment-return-preview-title" className="space-y-4">
      <div>
        <h2 id="payment-return-preview-title" className="text-lg font-black">
          پیش‌نمایش وضعیت بازگشت از درگاه
        </h2>
        <p className="mt-1 text-sm text-muted">
          این کنترل فقط حالت‌های نمایشی مستند را نشان می‌دهد و هیچ تراکنشی ایجاد نمی‌کند.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب وضعیت نمایشی پرداخت">
        {stateOrder.map((state) => (
          <Button
            key={state}
            type="button"
            variant={activeState === state ? 'primary' : 'secondary'}
            aria-pressed={activeState === state}
            onClick={() => setActiveState(state)}
          >
            {paymentReturnStates[state].label}
          </Button>
        ))}
      </div>
      <div aria-live="polite">
        <Alert title={result.title} tone={result.tone}>
          {result.description}
        </Alert>
      </div>
    </section>
  );
}
