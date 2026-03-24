import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'flex min-h-[44px] items-center',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <div
        className={cn(
          'relative h-8 w-14 rounded-full transition-colors',
          checked ? 'bg-accent-500' : 'bg-dark-600',
        )}
      >
        <div
          className={cn(
            'absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform duration-200',
            checked ? 'translate-x-6' : 'translate-x-0',
          )}
        />
      </div>
    </button>
  );
}
