import { Slot } from '@radix-ui/react-slot';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { buttonTap, buttonHover, springTransition } from '../../motion/transitions';
import { buttonVariants, type ButtonVariants } from './Button.variants';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>, ButtonVariants {
  children: ReactNode;
  asChild?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  haptic?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      haptic = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const { haptic: platformHaptic } = usePlatform();
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !isDisabled) {
        platformHaptic.impact('light');
      }
      onClick?.(e);
    };

    const classes = cn(buttonVariants({ variant, size, fullWidth }), className);

    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={classes}
        disabled={isDisabled}
        onClick={handleClick}
        whileHover={!isDisabled ? buttonHover : undefined}
        whileTap={!isDisabled ? buttonTap : undefined}
        transition={springTransition}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
