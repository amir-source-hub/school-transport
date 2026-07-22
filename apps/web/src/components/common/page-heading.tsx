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
        'mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        mode === 'compact' && 'mb-4',
        className,
      )}
    >
      <div className="min-w-0">
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
