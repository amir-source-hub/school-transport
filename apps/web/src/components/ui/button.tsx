import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/20 shadow-[var(--shadow-raised)] active:translate-y-0 active:scale-[0.97]',
  secondary:
    'border border-border bg-surface text-foreground hover:-translate-y-0.5 hover:border-primary hover:bg-primary-soft/40 hover:text-primary',
  ghost:
    'border border-border/80 bg-surface text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-soft/40 hover:text-primary',
  inverse: 'bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizeStyles: Record<Size, string> = {
  sm: 'min-h-9 gap-1.5 rounded-[var(--radius-control)] px-3.5 py-1.5 text-xs font-bold',
  md: 'min-h-11 gap-2 rounded-[var(--radius-control)] px-5 py-2.5 text-sm font-bold',
  lg: 'min-h-13 gap-2.5 rounded-[var(--radius-control)] px-7 py-3.5 text-base font-bold',
  icon: 'min-h-11 w-11 items-center justify-center rounded-[var(--radius-control)] p-0',
};

const base =
  'inline-flex items-center justify-center gap-2 transition-all duration-[var(--duration-fast)] disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(base, variantStyles[variant], sizeStyles[size], className)}
      data-loading={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(base, variantStyles[variant], sizeStyles[size], className)}>
      {children}
    </Link>
  );
}
