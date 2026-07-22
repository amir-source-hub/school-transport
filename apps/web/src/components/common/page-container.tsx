import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

type Size = 'public' | 'portal' | 'reading' | 'full';

const sizeStyles: Record<Size, string> = {
  public: 'max-w-[var(--width-public)]',
  portal: 'max-w-[var(--width-portal)]',
  reading: 'max-w-[var(--width-reading)]',
  full: 'max-w-none',
};

export function PageContainer({
  size = 'public',
  className = '',
  ...props
}: ComponentPropsWithoutRef<'div'> & { size?: Size }) {
  return (
    <div
      className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeStyles[size], className)}
      {...props}
    />
  );
}
