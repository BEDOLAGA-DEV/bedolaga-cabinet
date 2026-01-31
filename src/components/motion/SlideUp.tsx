import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ReactNode } from 'react';
import { slideUp, slideUpTransition } from './transitions';

interface SlideUpProps extends Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'exit'> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const SlideUp = forwardRef<HTMLDivElement, SlideUpProps>(
  ({ children, delay = 0, duration, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={slideUp}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          ...slideUpTransition,
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

SlideUp.displayName = 'SlideUp';
