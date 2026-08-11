'use client';

import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { isoToJalaliDate, jalaliToIsoDate } from '@/lib/jalali-date';

export function formatJalaliDateInput(value: string) {
  const digits = value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '')
    .slice(0, 8);

  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('/');
}

export function JalaliDateInput({
  value,
  onChange,
  required,
  id,
  disabled,
  maxDate,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  maxDate?: string;
}) {
  const [display, setDisplay] = useState(() => isoToJalaliDate(value));
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  useEffect(() => setDisplay(isoToJalaliDate(value)), [value]);
  const isoDate = display ? jalaliToIsoDate(display) : null;
  const valid = !display || (isoDate !== null && (!maxDate || isoDate <= maxDate));
  const errorMessage =
    isoDate && maxDate && isoDate > maxDate
      ? 'تاریخ نمی‌تواند در آینده باشد.'
      : 'تاریخ شمسی را به شکل ۱۴۰۵/۰۱/۰۱ وارد کنید.';

  return (
    <div>
      <Input
        id={inputId}
        dir="ltr"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        placeholder="۱۴۰۵/۰۱/۰۱"
        value={display}
        aria-invalid={!valid}
        aria-describedby={!valid ? errorId : undefined}
        onChange={(event) => {
          const next = formatJalaliDateInput(event.target.value);
          setDisplay(next);
          const iso = jalaliToIsoDate(next);
          onChange(iso ?? '');
        }}
      />
      {!valid && (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
