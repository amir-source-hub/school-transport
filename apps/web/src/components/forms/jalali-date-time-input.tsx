'use client';

import { JalaliDateInput } from './jalali-date-input';
import { Input } from '@/components/ui/input';

export function JalaliDateTimeInput({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const [date = '', time = ''] = value.split('T');
  const update = (nextDate: string, nextTime: string) => onChange(`${nextDate}T${nextTime}`);

  return (
    <div className="space-y-2">
      <span className="text-sm font-bold">{label}</span>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-start">
        <JalaliDateInput
          label={`${label}، تاریخ شمسی`}
          value={date}
          onChange={(nextDate) => update(nextDate, time)}
          required={required}
        />
        <label className="space-y-1 text-xs font-bold">
          ساعت
          <Input
            type="time"
            dir="ltr"
            required={required}
            value={time}
            onChange={(event) => update(date, event.target.value)}
            className="text-center tabular-nums"
          />
        </label>
      </div>
    </div>
  );
}
