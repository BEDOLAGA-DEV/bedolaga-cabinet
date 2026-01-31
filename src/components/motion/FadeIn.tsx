import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { fadeIn, fadeInTransition } from './transitions';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  ({ children, delay = 0, duration, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={fadeIn}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          ...fadeInTransition,
          delay,
          ...(duration !== undefined && { duration }),
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  },
);

FadeIn.displayName = 'FadeIn';
