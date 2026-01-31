import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { tooltip, tooltipTransition } from '../../motion/transitions';

// Provider - wrap your app with this
export const TooltipProvider = TooltipPrimitive.Provider;

// Root
export const Tooltip = TooltipPrimitive.Root;

// Trigger
export const TooltipTrigger = TooltipPrimitive.Trigger;

// Content
export type TooltipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;

export const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, sideOffset = 4, children, ...props }, ref) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden',
          'rounded-linear px-3 py-1.5',
          'border border-dark-700/50 bg-dark-800',
          'text-xs text-dark-100 shadow-linear',
          className,
        )}
        asChild
        {...props}
      >
        <motion.div
          variants={tooltip}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={tooltipTransition}
        >
          {children}
        </motion.div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
);

TooltipContent.displayName = 'TooltipContent';

// Convenience wrapper component
export interface SimpleTooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
}

export const SimpleTooltip = ({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className,
}: SimpleTooltipProps) => (
  <Tooltip delayDuration={delayDuration}>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side={side} align={align} className={className}>
      {content}
    </TooltipContent>
  </Tooltip>
);
