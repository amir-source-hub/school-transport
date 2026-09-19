'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { normalizeDigits } from '@/features/enrollment/national-id';

export function tomanToRials(value: string): number {
  return Number(normalizeDigits(value).replace(/[^0-9]/g, '')) * 10;
}

export function RoutePriceInput({ defaultRials }: { defaultRials?: number | null }) {
  const [digits, setDigits] = useState(
    defaultRials == null ? '' : String(Math.floor(defaultRials / 10)),
  );
  return (
    <div className="relative">
      <Input
        name="contractPriceTomans"
        value={digits ? Number(digits).toLocaleString('en-US') : ''}
        onChange={(event) =>
          setDigits(
            normalizeDigits(event.target.value)
              .replace(/[^0-9]/g, '')
              .slice(0, 13),
          )
        }
        inputMode="numeric"
        dir="ltr"
        required
        className="pl-16"
        aria-label="مبلغ ماهانه قرارداد به تومان"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
        تومان
      </span>
    </div>
  );
}
