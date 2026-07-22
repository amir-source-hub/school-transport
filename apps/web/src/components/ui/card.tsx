import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'raised' | 'outlined' | 'inset' | 'dark' | 'transparent';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  raised: 'bg-surface-paper shadow-[var(--shadow-raised)]',
  outlined: 'border border-border bg-surface-paper',
  inset: 'surface-inset',
  dark: 'surface-dark',
  transparent: 'bg-transparent',
};

const paddingStyles: Record<Padding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
};

export function Card({
  variant = 'raised',
  padding = 'md',
  className = '',
  ...props
}: ComponentPropsWithoutRef<'div'> & {
  variant?: Variant;
  padding?: Padding;
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-card)]',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    />
  );
}
