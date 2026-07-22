import type { SVGAttributes } from 'react';
import { cn } from '@/lib/cn';

type Size = 24 | 32 | 40;

const sizes: Record<Size, { viewBox: string; class: string }> = {
  24: { viewBox: '0 0 24 24', class: 'h-6 w-6' },
  32: { viewBox: '0 0 32 32', class: 'h-8 w-8' },
  40: { viewBox: '0 0 40 40', class: 'h-10 w-10' },
};

export function BrandMark({
  size = 32,
  className,
  ...props
}: SVGAttributes<SVGSVGElement> & { size?: Size }) {
  const vw = sizes[size].viewBox;
  const cls = sizes[size].class;

  return (
    <svg
      viewBox={vw}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(cls, 'text-primary', className)}
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
      <path
        d="M8 14 Q12 6 16 14 Q18 18 12 18 Q6 18 8 14Z"
        fill="white"
        opacity="0.9"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}
