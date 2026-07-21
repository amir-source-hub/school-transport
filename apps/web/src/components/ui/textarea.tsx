import type { TextareaHTMLAttributes } from 'react';

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 w-full resize-y rounded-[var(--radius-sm)] border border-border bg-surface px-3.5 py-3 text-sm text-foreground shadow-[var(--shadow-sm)] transition-colors placeholder:text-muted/70 hover:border-slate-400 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted aria-invalid:border-danger ${className}`}
      {...props}
    />
  );
}
