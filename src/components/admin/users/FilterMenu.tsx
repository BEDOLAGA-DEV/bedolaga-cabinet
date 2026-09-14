import type { DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { ChevronDownIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

interface FilterMenuProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Выбрано не значение по умолчанию — чип подсвечивается, как в референсе. */
  active?: boolean;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Чип «Статус: любой ▾»: подпись и текущее значение видны без раскрытия, список —
 * меню на Radix (клавиатура, фокус, закрытие по Esc и снаружи). Ширина по содержимому,
 * а не по самому длинному пункту, как было у нативного select.
 */
export function FilterMenu({
  label,
  value,
  options,
  onChange,
  active = value !== '',
  align = 'start',
  className,
}: FilterMenuProps) {
  const current = options.find((option) => option.value === value) ?? options[0];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40',
          'data-[state=open]:border-accent-500/40',
          active
            ? 'border-accent-500/30 bg-accent-500/10 text-dark-200'
            : 'border-dark-700/70 bg-dark-800/50 text-dark-300 hover:border-dark-600',
          className,
        )}
      >
        <span className="text-dark-400">{label}:</span>
        <span className={cn('font-medium', active ? 'text-accent-400' : 'text-dark-100')}>
          {current?.label}
        </span>
        <ChevronDownIcon className="h-3.5 w-3.5 text-dark-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="max-h-[min(22rem,var(--radix-dropdown-menu-content-available-height))] min-w-[12rem] overflow-y-auto"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value || '__any'} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
