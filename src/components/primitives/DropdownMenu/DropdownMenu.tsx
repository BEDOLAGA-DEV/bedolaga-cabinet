import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
import { dropdown, dropdownTransition } from '../../motion/transitions';

// Icons
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.5 8.5L6.5 11.5L12.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" fill="currentColor" />
  </svg>
);

// Root
export const DropdownMenu = DropdownMenuPrimitive.Root;

// Trigger
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

// Group
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

// Portal
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

// Sub
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

// RadioGroup
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

// SubTrigger
export interface DropdownMenuSubTriggerProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

export const DropdownMenuSubTrigger = forwardRef<HTMLDivElement, DropdownMenuSubTriggerProps>(
  ({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-linear px-2 py-2',
        'text-sm text-dark-200 outline-none',
        'focus:bg-dark-800/80 focus:text-dark-100',
        'data-[state=open]:bg-dark-800/80',
        inset && 'pl-8',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon />
    </DropdownMenuPrimitive.SubTrigger>
  ),
);

DropdownMenuSubTrigger.displayName = 'DropdownMenuSubTrigger';

// SubContent
export type DropdownMenuSubContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.SubContent
>;

export const DropdownMenuSubContent = forwardRef<HTMLDivElement, DropdownMenuSubContentProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden',
        'rounded-linear-lg border border-dark-700/50 bg-dark-900/95 backdrop-blur-linear',
        'p-1 text-dark-100 shadow-linear-lg',
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
      />
    </DropdownMenuPrimitive.SubContent>
  ),
);

DropdownMenuSubContent.displayName = 'DropdownMenuSubContent';

// Content
export type DropdownMenuContentProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Content
>;

export const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, sideOffset = 4, ...props }, ref) => {
    const { haptic } = usePlatform();

    return (
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(
            'z-50 min-w-[8rem] overflow-hidden',
            'rounded-linear-lg border border-dark-700/50 bg-dark-900/95 backdrop-blur-linear',
            'p-1 text-dark-100 shadow-linear-lg',
            className,
          )}
          onCloseAutoFocus={() => haptic.impact('light')}
          asChild
          {...props}
        >
          <motion.div
            variants={dropdown}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={dropdownTransition}
          />
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    );
  },
);

DropdownMenuContent.displayName = 'DropdownMenuContent';

// Item
export interface DropdownMenuItemProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Item
> {
  inset?: boolean;
  destructive?: boolean;
}

export const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, inset, destructive, ...props }, ref) => {
    const { haptic } = usePlatform();

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
          'relative flex cursor-pointer select-none items-center gap-2 rounded-linear px-2 py-2',
          'text-sm outline-none transition-colors duration-150',
          destructive
            ? 'text-error-400 focus:bg-error-500/10 focus:text-error-300'
            : 'text-dark-200 focus:bg-dark-800/80 focus:text-dark-100',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className,
        )}
        onClick={() => haptic.impact('light')}
        {...props}
      />
    );
  },
);

DropdownMenuItem.displayName = 'DropdownMenuItem';

// CheckboxItem
export type DropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.CheckboxItem
>;

export const DropdownMenuCheckboxItem = forwardRef<HTMLDivElement, DropdownMenuCheckboxItemProps>(
  ({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-linear py-2 pl-8 pr-2',
        'text-sm text-dark-200 outline-none transition-colors duration-150',
        'focus:bg-dark-800/80 focus:text-dark-100',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  ),
);

DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

// RadioItem
export type DropdownMenuRadioItemProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.RadioItem
>;

export const DropdownMenuRadioItem = forwardRef<HTMLDivElement, DropdownMenuRadioItemProps>(
  ({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-linear py-2 pl-8 pr-2',
        'text-sm text-dark-200 outline-none transition-colors duration-150',
        'focus:bg-dark-800/80 focus:text-dark-100',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <DotIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  ),
);

DropdownMenuRadioItem.displayName = 'DropdownMenuRadioItem';

// Label
export interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

export const DropdownMenuLabel = forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-2 py-1.5 text-xs font-medium text-dark-400', inset && 'pl-8', className)}
      {...props}
    />
  ),
);

DropdownMenuLabel.displayName = 'DropdownMenuLabel';

// Separator
export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Separator
>;

export const DropdownMenuSeparator = forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-dark-700/50', className)}
      {...props}
    />
  ),
);

DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

// Shortcut
export type DropdownMenuShortcutProps = React.HTMLAttributes<HTMLSpanElement>;

export const DropdownMenuShortcut = ({ className, ...props }: DropdownMenuShortcutProps) => (
  <span className={cn('ml-auto text-xs tracking-widest text-dark-400', className)} {...props} />
);

DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
