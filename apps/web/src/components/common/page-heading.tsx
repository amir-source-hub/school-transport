import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Mode = 'spacious' | 'compact';

export function PageHeading({
  title,
  description,
  eyebrow,
  status,
  meta,
  actions,
  mode = 'spacious',
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  status?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  mode?: Mode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'relative mb-7 flex flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-white/80 bg-white px-5 py-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,.45)] sm:flex-row sm:items-center sm:justify-between sm:px-7',
        mode === 'compact' && 'mb-4',
        className,
      )}
    >
      <span className="pointer-events-none absolute -left-10 -top-16 size-40 rounded-full bg-primary/8 blur-2xl" />
      <div className="relative min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'font-black',
            mode === 'spacious' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
          )}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
        )}
        {status && <div className="mt-2">{status}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {meta && <div className="text-xs text-muted">{meta}</div>}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
