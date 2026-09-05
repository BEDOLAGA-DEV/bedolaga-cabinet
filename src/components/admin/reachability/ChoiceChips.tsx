import { cn } from '@/lib/utils';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceChipsProps<T extends string> {
  value: T;
  options: ReadonlyArray<ChoiceOption<T>>;
  onChange: (value: T) => void;
  /** Подпись группы для скринридера (и, если `showLabel`, для глаз). */
  label: string;
  showLabel?: boolean;
  className?: string;
}

/** Ряд чипов «один из» в принятом стиле вкладок кабинета (страница пользователя, LocaleTabs). */
export function ChoiceChips<T extends string>({
  value,
  options,
  onChange,
  label,
  showLabel = false,
  className,
}: ChoiceChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {showLabel && <span className="mr-1 text-xs text-dark-400">{label}</span>}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              active
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 hover:bg-dark-700/50 hover:text-dark-300',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
