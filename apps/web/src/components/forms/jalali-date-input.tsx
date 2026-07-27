'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { isoToJalaliDate, jalaliToIsoDate } from '@/lib/jalali-date';

export function JalaliDateInput({
  value,
  onChange,
  required,
  id,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  id?: string;
}) {
  const [display, setDisplay] = useState(() => isoToJalaliDate(value));
  const valid = !display || jalaliToIsoDate(display) !== null;

  return (
    <div>
      <Input
        id={id}
        dir="ltr"
        inputMode="numeric"
        required={required}
        placeholder="۱۴۰۵/۰۱/۰۱"
        value={display}
        aria-invalid={!valid}
        onChange={(event) => {
          const next = event.target.value;
          setDisplay(next);
          const iso = jalaliToIsoDate(next);
          onChange(iso ?? '');
        }}
      />
      {!valid && (
        <p className="mt-1 text-xs text-danger">تاریخ شمسی را به شکل ۱۴۰۵/۰۱/۰۱ وارد کنید.</p>
      )}
    </div>
  );
}
