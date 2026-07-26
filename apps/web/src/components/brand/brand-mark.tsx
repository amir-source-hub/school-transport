import type { SVGAttributes } from 'react';
import { cn } from '@/lib/cn';

type Size = 24 | 32 | 40;

const sizes: Record<Size, { class: string }> = {
  24: { class: 'h-6 w-6' },
  32: { class: 'h-8 w-8' },
  40: { class: 'h-10 w-10' },
};

export function BrandMark({
  size = 32,
  className,
  ...props
}: SVGAttributes<SVGSVGElement> & { size?: Size }) {
  const cls = sizes[size].class;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(cls, 'text-primary', className)}
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path
        d="M7.5 13.75V9.7c0-1.9 1.55-3.45 3.45-3.45h2.1c1.9 0 3.45 1.55 3.45 3.45v4.05M7 13.75h10M9 16.5h.01M15 16.5h.01M9 9.5h6"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
