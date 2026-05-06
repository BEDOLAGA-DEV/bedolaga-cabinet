import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';

export interface SwitchProps extends Omit<
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
  'onChange'
> {
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  haptic?: boolean;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, label, description, onChange, onCheckedChange, haptic = true, ...props }, ref) => {
    const { haptic: platformHaptic } = usePlatform();

    const handleCheckedChange = (checked: boolean) => {
      if (haptic) {
        platformHaptic.impact('light');
      }
      onCheckedChange?.(checked);
      onChange?.(checked);
    };

    const switchElement = (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(
          'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full',
          'border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'data-[state=checked]:bg-accent-500 data-[state=unchecked]:bg-dark-700',
          className,
        )}
        onCheckedChange={handleCheckedChange}
        {...props}
      >
        <SwitchPrimitive.Thumb asChild>
          <span
            className={cn(
              'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
              'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
            )}
          />
        </SwitchPrimitive.Thumb>
      </SwitchPrimitive.Root>
    );

    if (!label) {
      return switchElement;
    }

    return (
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-dark-100">{label}</span>
          {description && <span className="mt-0.5 block text-sm text-dark-400">{description}</span>}
        </div>
        {switchElement}
      </label>
    );
  },
);

Switch.displayName = 'Switch';
