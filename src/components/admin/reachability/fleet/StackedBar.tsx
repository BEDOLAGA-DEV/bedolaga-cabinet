import { cn } from '@/lib/utils';

export interface StackedBarPart {
  count: number;
  className: string;
}

interface StackedBarProps {
  parts: StackedBarPart[];
  /** Что означает полоска, словами: цвет не единственный носитель смысла. */
  label: string;
  className?: string;
}

/** Тонкая полоска долей: сегменты растут пропорционально числу, пустые не рисуются. */
export function StackedBar({ parts, label, className }: StackedBarProps) {
  const visible = parts.filter((part) => part.count > 0);
  if (visible.length === 0) return null;
  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex h-2 w-full gap-0.5 overflow-hidden rounded-full', className)}
    >
      {visible.map((part) => (
        <span
          key={part.className}
          className={cn('block h-full', part.className)}
          style={{ flexGrow: part.count, flexBasis: 0 }}
        />
      ))}
    </div>
  );
}
