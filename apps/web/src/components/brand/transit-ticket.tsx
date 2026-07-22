import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function TransitTicket({
  variant = 'primary',
  className,
  children,
}: {
  variant?: 'primary' | 'cutout';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative rounded-[var(--radius-ticket)] border-2 p-5',
        variant === 'primary'
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-surface-paper text-foreground',
        className,
      )}
    >
      {children}
      <div
        className={cn(
          'absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full',
          variant === 'primary' ? 'bg-paper' : 'bg-[var(--paper)]',
        )}
      />
      <div
        className={cn(
          'absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full',
          variant === 'primary' ? 'bg-paper' : 'bg-[var(--paper)]',
        )}
      />
    </div>
  );
}

export function TransitTicketCta({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'group relative flex items-center justify-between rounded-[var(--radius-ticket)] bg-primary px-6 py-4 text-white transition-all duration-[var(--duration-fast)] hover:bg-primary-hover active:scale-[0.98]',
        className,
      )}
    >
      {children}
    </a>
  );
}
