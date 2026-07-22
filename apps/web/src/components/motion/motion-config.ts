import type { Transition, Variants } from 'motion/react';

export const uiTransition: Transition = {
  duration: 0.26,
  ease: [0.16, 1, 0.3, 1],
};

export const layoutSpring: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.8,
};

export const sectionReveal: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1],
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

export const reducedVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};
