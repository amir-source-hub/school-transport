'use client';

import { useEffect, useId, useRef, useState } from 'react';
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

const validSegment = (
  part: 'year' | 'month' | 'day',
  digits: string,
  segments: { year: string; month: string; day: string },
) => {
  if (!digits) return true;
  const number = Number(digits);
  if (part === 'year') return digits.length < 4 || number >= 1300;
  if (part === 'month') return digits.length < 2 || (number >= 1 && number <= 12);
  if (digits.length < 2 || number < 1 || number > 31) return digits.length < 2;
  if (segments.year.length === 4 && segments.month.length === 2) {
    return Boolean(
      jalaliToIsoDate(`${segments.year}/${segments.month}/${digits.padStart(2, '0')}`),
    );
  }
  return true;
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
  const initialJalali = splitJalali(value || maxDate || new Date().toISOString().slice(0, 10));
  const [calendarYear, setCalendarYear] = useState(Number(initialJalali.year) || 1405);
  const [calendarMonth, setCalendarMonth] = useState(Number(initialJalali.month) || 1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDetailsElement>(null);
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
      if (
        !validSegment('year', next.year, next) ||
        !validSegment('month', next.month, next) ||
        !validSegment('day', next.day, next)
      )
        return;
      setSegments(next);
      const iso = jalaliToIsoDate(`${next.year}/${next.month}/${next.day}`);
      onChange(iso && (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate) ? iso : '');
      document.getElementById(`${inputId}-day`)?.focus();
      return;
    }
    digits = digits.slice(0, part === 'year' ? 4 : 2);
    if (!validSegment(part, digits, segments)) return;
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

  const minYear = Number(splitJalali(minDate ?? '1921-03-21').year) || 1300;
  const maxYear = Number(splitJalali(maxDate ?? '2122-03-20').year) || 1500;
  const years = Array.from(
    { length: Math.max(1, maxYear - minYear + 1) },
    (_, index) => maxYear - index,
  );
  const monthNames = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];
  const calendarDays = Array.from({ length: 31 }, (_, index) => index + 1).filter((day) =>
    Boolean(
      jalaliToIsoDate(
        `${calendarYear}/${String(calendarMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`,
      ),
    ),
  );

  const selectCalendarDay = (day: number) => {
    const jalali = `${calendarYear}/${String(calendarMonth).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
    const iso = jalaliToIsoDate(jalali);
    if (!iso || (minDate && iso < minDate) || (maxDate && iso > maxDate)) return;
    setSegments(splitJalali(iso));
    onChange(iso);
    if (calendarRef.current) calendarRef.current.open = false;
  };

  return (
    <div className={calendarOpen ? 'min-h-[22rem]' : undefined}>
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
      <details
        ref={calendarRef}
        className="mt-2 w-full"
        onToggle={(event) => setCalendarOpen(event.currentTarget.open)}
      >
        <summary className="inline-flex cursor-pointer list-none items-center rounded-lg border border-border bg-surface-paper px-3 py-2 text-xs font-bold text-primary hover:bg-surface-inset">
          انتخاب از تقویم شمسی
        </summary>
        <div
          className="mt-2 w-full max-w-sm rounded-xl border border-border bg-surface-paper p-3 shadow-lg"
          dir="rtl"
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold">
              سال تقویم
              <select
                aria-label="سال تقویم"
                className="mt-1 min-h-10 w-full rounded-lg border border-input bg-background px-2"
                value={calendarYear}
                onChange={(event) => setCalendarYear(Number(event.target.value))}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year.toLocaleString('fa-IR', { useGrouping: false })}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              ماه تقویم
              <select
                aria-label="ماه تقویم"
                className="mt-1 min-h-10 w-full rounded-lg border border-input bg-background px-2"
                value={calendarMonth}
                onChange={(event) => setCalendarMonth(Number(event.target.value))}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1" aria-label="روزهای ماه">
            {calendarDays.map((day) => {
              const iso = jalaliToIsoDate(`${calendarYear}/${calendarMonth}/${day}`);
              const unavailable =
                !iso || Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
              const selected =
                segments.year === String(calendarYear) &&
                Number(segments.month) === calendarMonth &&
                Number(segments.day) === day;
              return (
                <button
                  key={day}
                  type="button"
                  disabled={unavailable}
                  aria-pressed={selected}
                  onClick={() => selectCalendarDay(day)}
                  className="aspect-square rounded-md text-xs font-bold hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 aria-pressed:bg-primary aria-pressed:text-white"
                >
                  {day.toLocaleString('fa-IR')}
                </button>
              );
            })}
          </div>
        </div>
      </details>
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
