import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'raised' | 'outlined' | 'inset' | 'dark' | 'transparent';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const variantStyles: Record<Variant, string> = {
  raised: 'border border-white/80 bg-surface-paper shadow-[0_18px_55px_-38px_rgba(15,23,42,.38)]',
  outlined:
    'border border-border/80 bg-surface-paper shadow-[0_12px_35px_-32px_rgba(15,23,42,.28)]',
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
        'rounded-[1.25rem] transition-[transform,box-shadow,border-color] duration-200',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    />
  );
}
