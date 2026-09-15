import type { DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { SortAscendingIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

interface SortMenuProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Выбран не порядок по умолчанию — кнопка подсвечивается, чтобы было видно, что список пересортирован. */
  changed: boolean;
}

/**
 * Сортировка — кнопка-иконка рядом с поиском: текущий порядок виден в подсказке и в
 * меню с отметкой, а не отдельной широкой кнопкой «Сортировка: по дате регистрации».
 */
export function SortMenu({ label, value, options, onChange, changed }: SortMenuProps) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const title = `${label}: ${current?.label ?? ''}`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={title}
        title={title}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40',
          changed
            ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
            : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600 hover:text-dark-100',
        )}
      >
        <SortAscendingIcon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-dark-500">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="data-[state=checked]:font-medium data-[state=checked]:text-accent-400"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
