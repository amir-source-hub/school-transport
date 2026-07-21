import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

export function TableContainer({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'max-w-full overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface',
        className,
      )}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentPropsWithoutRef<'table'>) {
  return (
    <table className={cn('w-full min-w-[40rem] border-collapse text-sm', className)} {...props} />
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return <thead className={cn('bg-surface-muted text-foreground', className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      scope="col"
      className={cn('h-12 px-4 text-start text-xs font-black', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={cn('border-b border-border last:border-b-0 hover:bg-surface-muted/60', className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />;
}
