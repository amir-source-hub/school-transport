import Image from 'next/image';
import type { HTMLAttributes } from 'react';
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
}: HTMLAttributes<HTMLSpanElement> & { size?: Size }) {
  const cls = sizes[size].class;

  return (
    <span
      className={cn(cls, 'relative inline-block shrink-0 overflow-hidden rounded-lg', className)}
      aria-hidden="true"
      {...props}
    >
      <Image src="/samin-gasht-logo.png" alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
