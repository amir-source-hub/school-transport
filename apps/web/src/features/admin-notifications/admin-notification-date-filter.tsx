'use client';

import { useState } from 'react';
import { JalaliDateInput } from '@/components/forms/jalali-date-input';

export function AdminNotificationDateFilter({
  name,
  label,
  initialValue = '',
}: {
  name: 'dateFrom' | 'dateTo';
  label: string;
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="text-sm font-bold">
      <span className="mb-1 block">{label}</span>
      <JalaliDateInput label={label} value={value} onChange={setValue} />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
