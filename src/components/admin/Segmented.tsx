import { cn } from '@/lib/utils';

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  /** `md` — выборки страницы («Все · Истекают · Онлайн»), `sm` — фильтр внутри секции. */
  size?: 'sm' | 'md';
  className?: string;
}

const ITEM = {
  sm: 'h-7 px-3 text-xs',
  md: 'h-8 px-3.5 text-sm',
} as const;

/**
 * Переключатель «один из»: «Все · Пополнения · Списания». Выбранное — залито акцентом:
 * бледная подсветка на кастомных темах сливалась с соседями, и не было видно, что нажато.
 * На узком экране листается по горизонтали, не переносится в две строки.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = 'sm',
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'scrollbar-hide flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-dark-800/70 p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50',
              ITEM[size],
              selected
                ? // Заливка — как у главной кнопки (.btn-primary), и в светлой теме тоже.
                  'bg-accent-500 text-on-accent shadow-sm light:bg-champagne-700 light:text-white'
                : 'text-dark-400 hover:bg-dark-700/60 hover:text-dark-100',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
