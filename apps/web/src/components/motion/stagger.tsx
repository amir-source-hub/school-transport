'use client';

import type { ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { staggerContainer, staggerItem, reducedVariants } from './motion-config';

export function StaggerContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={prefersReduced ? reducedVariants : staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={cn(className)}>{children}</div>;
  }

  return (
    <motion.div className={cn(className)} variants={staggerItem}>
      {children}
    </motion.div>
  );
}
