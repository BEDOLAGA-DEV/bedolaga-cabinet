import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { buttonTap, buttonHover, springTransition } from '@/components/motion/transitions';

const cardVariants = cva(
  [
    'relative overflow-hidden',
    'border border-dark-700/40 bg-dark-900/70',
    'rounded-[var(--bento-radius)]',
    'transition-all duration-200',
    // GPU acceleration
    'transform-gpu',
    // Glass border inset
    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
  ],
  {
    variants: {
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5 sm:p-6',
        xl: 'p-6 sm:p-8',
      },
      variant: {
        default: '',
        glass: 'backdrop-blur-linear bg-dark-900/50',
        solid: 'bg-dark-900',
        outline: 'bg-transparent',
      },
      interactive: {
        true: [
          'cursor-pointer',
          'hover:border-dark-600/50 hover:bg-dark-800/60',
          'active:scale-[0.98]',
        ],
        false: '',
      },
      glow: {
        true: 'hover:border-accent-500/30 hover:shadow-glow',
        false: '',
      },
    },
    defaultVariants: {
      size: 'lg',
      variant: 'default',
      interactive: false,
      glow: false,
    },
  },
);

export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'children'>, VariantProps<typeof cardVariants> {
  children: ReactNode;
  asChild?: boolean;
  haptic?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      size,
      variant,
      interactive,
      glow,
      asChild = false,
      haptic: enableHaptic = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const { haptic } = usePlatform();

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (interactive && enableHaptic) {
        haptic.impact('light');
      }
      onClick?.(e);
    };

    const classes = cn(cardVariants({ size, variant, interactive, glow }), className);

    if (asChild) {
      return (
        <Slot ref={ref} className={classes}>
          {children}
        </Slot>
      );
    }

    if (interactive) {
      return (
        <motion.div
          ref={ref}
          className={classes}
          onClick={handleClick}
          whileHover={buttonHover}
          whileTap={buttonTap}
          transition={springTransition}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div ref={ref} className={classes} {...props}>
        {children}
      </motion.div>
    );
  },
);

Card.displayName = 'Card';

// Card Header
export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5', className)} {...props} />
  ),
);

CardHeader.displayName = 'CardHeader';

// Card Title
export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-dark-100', className)} {...props} />
  ),
);

CardTitle.displayName = 'CardTitle';

// Card Description
export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-dark-400', className)} {...props} />
  ),
);

CardDescription.displayName = 'CardDescription';

// Card Content
export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('pt-4', className)} {...props} />,
);

CardContent.displayName = 'CardContent';

// Card Footer
export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center pt-4', className)} {...props} />
  ),
);

CardFooter.displayName = 'CardFooter';
