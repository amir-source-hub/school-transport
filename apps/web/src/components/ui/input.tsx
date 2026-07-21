import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-12 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 text-sm text-foreground shadow-[var(--shadow-sm)] transition-colors placeholder:text-muted/70 hover:border-slate-400 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15 ${className}`}
      {...props}
    />
  );
}
