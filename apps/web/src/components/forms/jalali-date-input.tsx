'use client';

import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { isoToJalaliDate, jalaliToIsoDate } from '@/lib/jalali-date';

const asciiDigits = (value: string) =>
  value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');

export function formatJalaliDateInput(value: string) {
  const digits = asciiDigits(value).slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('/');
}

const splitJalali = (isoDate: string) => {
  const [year = '', month = '', day = ''] = isoToJalaliDate(isoDate).split('/');
  return { year, month, day };
};

export function JalaliDateInput({
  value,
  onChange,
  required,
  id,
  disabled,
  minDate,
  maxDate,
  label = 'تاریخ شمسی',
}: {
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  id?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  label?: string;
}) {
  const [segments, setSegments] = useState(() => splitJalali(value));
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) setSegments(splitJalali(value));
    });
    return () => {
      active = false;
    };
  }, [value]);

  const display = `${segments.year}/${segments.month}/${segments.day}`;
  const complete =
    segments.year.length === 4 && segments.month.length === 2 && segments.day.length === 2;
  const isoDate = complete ? jalaliToIsoDate(display) : null;
  const outOfRange = Boolean(
    isoDate && ((minDate && isoDate < minDate) || (maxDate && isoDate > maxDate)),
  );
  const invalid = Object.values(segments).some(Boolean) && (!complete || !isoDate || outOfRange);
  const errorMessage = outOfRange
    ? maxDate && isoDate && isoDate > maxDate
      ? 'تاریخ نمی‌تواند در آینده باشد.'
      : 'تاریخ از بازه مجاز قدیمی‌تر است.'
    : 'تاریخ شمسی معتبر را به شکل سال، ماه و روز وارد کنید.';

  const update = (part: 'year' | 'month' | 'day', raw: string) => {
    let digits = asciiDigits(raw);
    if (part === 'year' && digits.length > 4) {
      const packed = digits.slice(0, 8);
      const next = {
        year: packed.slice(0, 4),
        month: packed.slice(4, 6),
        day: packed.slice(6, 8),
      };
      setSegments(next);
      const iso = jalaliToIsoDate(`${next.year}/${next.month}/${next.day}`);
      onChange(iso && (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate) ? iso : '');
      document.getElementById(`${inputId}-day`)?.focus();
      return;
    }
    digits = digits.slice(0, part === 'year' ? 4 : 2);
    const next = { ...segments, [part]: digits };
    setSegments(next);
    const iso = jalaliToIsoDate(`${next.year}/${next.month}/${next.day}`);
    onChange(iso && (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate) ? iso : '');
    if (part === 'year' && digits.length === 4) {
      document.getElementById(`${inputId}-month`)?.focus();
    }
    if (part === 'month' && digits.length === 2) {
      document.getElementById(`${inputId}-day`)?.focus();
    }
  };

  const backTo = (event: React.KeyboardEvent<HTMLInputElement>, part: 'month' | 'day') => {
    if (event.key !== 'Backspace' || event.currentTarget.value) return;
    event.preventDefault();
    document.getElementById(`${inputId}-${part === 'day' ? 'month' : 'year'}`)?.focus();
  };

  const common = {
    dir: 'ltr' as const,
    inputMode: 'numeric' as const,
    disabled,
    required,
    'aria-invalid': invalid,
    'aria-describedby': invalid ? errorId : undefined,
    className: 'text-center tabular-nums',
  };

  return (
    <div>
      <div role="group" aria-label={label} className="flex items-center gap-2" dir="ltr">
        <Input
          {...common}
          id={`${inputId}-year`}
          aria-label="سال"
          autoComplete="bday-year"
          placeholder="____"
          maxLength={4}
          value={segments.year}
          onChange={(event) => update('year', event.target.value)}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text');
            if (asciiDigits(pasted).length <= 4) return;
            event.preventDefault();
            update('year', pasted);
          }}
        />
        <span aria-hidden="true">/</span>
        <Input
          {...common}
          id={`${inputId}-month`}
          aria-label="ماه"
          autoComplete="bday-month"
          placeholder="__"
          maxLength={2}
          value={segments.month}
          onChange={(event) => update('month', event.target.value)}
          onKeyDown={(event) => backTo(event, 'month')}
        />
        <span aria-hidden="true">/</span>
        <Input
          {...common}
          id={`${inputId}-day`}
          aria-label="روز"
          autoComplete="bday-day"
          placeholder="__"
          maxLength={2}
          value={segments.day}
          onChange={(event) => update('day', event.target.value)}
          onKeyDown={(event) => backTo(event, 'day')}
        />
      </div>
      {invalid && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {errorMessage}
        </p>
      )}
      {isoDate && !outOfRange && (
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          تاریخ انتخاب‌شده: <span dir="ltr">{display}</span>
        </p>
      )}
    </div>
  );
}
