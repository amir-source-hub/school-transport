'use client';

import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { sectionReveal } from './motion-config';

type Direction = 'up' | 'down' | 'left' | 'right';

const directionOffset: Record<Direction, { x?: number; y?: number }> = {
  up: { y: 20 },
  down: { y: -20 },
  left: { x: 20 },
  right: { x: -20 },
};

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  once = true,
  className,
}: {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  once?: boolean;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const offset = directionOffset[direction];

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, ...offset }}
      whileInView={{
        opacity: 1,
        x: 0,
        y: 0,
        transition: { ...sectionReveal, delay: Math.min(delay, 0.6) },
      }}
      viewport={{ once, margin: '-60px' }}
    >
      {children}
    </motion.div>
  );
}
