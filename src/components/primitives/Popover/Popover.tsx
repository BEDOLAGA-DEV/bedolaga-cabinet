import * as PopoverPrimitive from '@radix-ui/react-popover';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { dropdown, dropdownTransition } from '../../motion/transitions';

export {
  Root as Popover,
  Trigger as PopoverTrigger,
  Anchor as PopoverAnchor,
  Close as PopoverClose,
} from '@radix-ui/react-popover';

// Content
export interface PopoverContentProps extends ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> {
  showCloseButton?: boolean;
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    { className, children, align = 'center', sideOffset = 4, showCloseButton = false, ...props },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 overflow-hidden',
          'rounded-linear-lg border border-dark-700/50 bg-dark-900/95 backdrop-blur-linear',
          'p-4 text-dark-100 shadow-linear-lg outline-none',
          className,
        )}
        asChild
        {...props}
      >
        <motion.div
          variants={dropdown}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={dropdownTransition}
        >
          {children}
          {showCloseButton && (
            <PopoverPrimitive.Close
              className={cn(
                'absolute right-2 top-2 rounded-linear p-1.5',
                'text-dark-400 opacity-70 transition-all',
                'hover:bg-dark-800/80 hover:opacity-100',
                'focus:outline-none focus:ring-2 focus:ring-accent-500/50',
              )}
            >
              <CloseIcon />
              <span className="sr-only">Close</span>
            </PopoverPrimitive.Close>
          )}
        </motion.div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  ),
);

PopoverContent.displayName = 'PopoverContent';

// Arrow
export type PopoverArrowProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Arrow>;

export const PopoverArrow = forwardRef<SVGSVGElement, PopoverArrowProps>(
  ({ className, ...props }, ref) => (
    <PopoverPrimitive.Arrow ref={ref} className={cn('fill-dark-800', className)} {...props} />
  ),
);

PopoverArrow.displayName = 'PopoverArrow';
