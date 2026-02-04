import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/primitives/Button';
import { fadeIn, fadeInTransition } from '@/components/motion/transitions';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon, title, description, action, className }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn('flex flex-col items-center justify-center py-12 text-center', className)}
        variants={fadeIn}
        initial="initial"
        animate="animate"
        transition={fadeInTransition}
      >
        {/* Icon */}
        {icon && (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-dark-800/50 text-dark-400">
            {icon}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-dark-100">{title}</h3>

        {/* Description */}
        {description && <p className="mt-2 max-w-sm text-sm text-dark-400">{description}</p>}

        {/* Action */}
        {action && (
          <div className="mt-6">
            <Button variant={action.variant || 'primary'} onClick={action.onClick}>
              {action.label}
            </Button>
          </div>
        )}
      </motion.div>
    );
  },
);

EmptyState.displayName = 'EmptyState';
