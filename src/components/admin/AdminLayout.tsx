import { motion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Centralized animation config for all admin pages.
 * Change animations here to affect all admin pages at once.
 */
export const adminPageTransition: Transition = {
  duration: 0.15,
  ease: [0.16, 1, 0.3, 1] as const, // easeOutExpo
};

export const adminPageVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * AdminLayout - wrapper for all admin pages with consistent animations.
 * Use this to wrap admin page content for unified transitions.
 */
export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <motion.div
      variants={adminPageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={adminPageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Admin content animations for lists and cards.
 * Use with staggered children.
 */
export const adminStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const adminStaggerItem: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
