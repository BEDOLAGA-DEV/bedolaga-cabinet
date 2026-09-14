import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * Переключатель «один из» для фильтров внутри секции: «Все · Пополнения · Списания».
 * На узком экране листается по горизонтали, не переносится в две строки.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'scrollbar-hide flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-xl bg-dark-800 p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-dark-700 text-dark-100'
              : 'text-dark-400 hover:text-dark-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
