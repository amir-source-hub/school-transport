'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';

export function RouteLine({
  current,
  total,
  className,
}: {
  current: number;
  total: number;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();
  const progress = total > 1 ? (current - 1) / (total - 1) : 1;

  return (
    <div className={cn('relative h-full w-0.5 bg-border', className)} role="none">
      <motion.div
        className="absolute bottom-0 left-0 w-full bg-primary"
        initial={false}
        animate={{ height: `${progress * 100}%` }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export function RouteCheckpoint({
  index,
  current,
  completed,
  label,
  description,
}: {
  index: number;
  current: number;
  completed: boolean;
  label: string;
  description?: string;
}) {
  const isActive = index === current;
  const isDone = completed;

  return (
    <li
      className={cn('flex items-start gap-3', !isDone && 'opacity-50')}
      aria-current={isActive ? 'step' : undefined}
    >
      <span
        className={cn(
          'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isDone && 'bg-primary text-white',
          isActive && 'border-2 border-primary bg-primary-soft text-primary',
          !isDone && !isActive && 'border border-border bg-surface text-muted',
        )}
      >
        {isDone ? '✓' : index + 1}
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </li>
  );
}

export function JourneyLine({ children, className }: { children: ReactNode; className?: string }) {
  return <ol className={cn('flex flex-col gap-6', className)}>{children}</ol>;
}
