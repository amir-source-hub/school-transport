'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { layoutSpring } from './motion-config';

export function SharedIndicator({ layoutId, className }: { layoutId: string; className?: string }) {
  return (
    <motion.div
      layoutId={layoutId}
      className={cn('absolute inset-0 rounded-[var(--radius-control)] bg-primary-soft', className)}
      transition={layoutSpring}
      style={{ pointerEvents: 'none' }}
    />
  );
}
