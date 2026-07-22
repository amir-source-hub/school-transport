import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'min-h-12 w-full rounded-[var(--radius-control)] border border-border bg-surface-paper px-3.5 text-sm text-foreground shadow-[var(--shadow-raised)] transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-muted/70 hover:border-strong focus:border-primary focus:shadow-[var(--shadow-focus)] focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-inset disabled:text-muted aria-invalid:border-danger aria-invalid:shadow-[0_0_0_3px_rgba(180_35_47_/0.15)]',
        className,
      )}
      {...props}
    />
  );
}
