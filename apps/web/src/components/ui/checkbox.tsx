import type { InputHTMLAttributes, ReactNode } from 'react';

export function Checkbox({
  label,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-2 text-sm">
      <input
        type="checkbox"
        className={`mt-0.5 size-5 shrink-0 accent-primary ${className}`}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
