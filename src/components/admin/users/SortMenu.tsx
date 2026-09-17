import type { DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { SortAscendingIcon, SortDescendingIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

interface SortMenuProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Заголовок блока направления и два его пункта — подписи зависят от ключа («сначала новые»). */
  directionLabel: string;
  direction: 'asc' | 'desc';
  directionOptions: DropdownOption[];
  onDirectionChange: (direction: 'asc' | 'desc') => void;
  /** Выбран не порядок по умолчанию — кнопка подсвечивается, чтобы было видно, что список пересортирован. */
  changed: boolean;
}

const ITEM_CLASS = 'data-[state=checked]:font-medium data-[state=checked]:text-accent-400';

/**
 * Сортировка — кнопка-иконка рядом с поиском: текущий порядок виден в подсказке и в
 * меню с отметкой, а не отдельной широкой кнопкой «Сортировка: по дате регистрации».
 * Под ключами — направление двумя пунктами, иконка кнопки показывает, куда идёт список.
 */
export function SortMenu({
  label,
  value,
  options,
  onChange,
  directionLabel,
  direction,
  directionOptions,
  onDirectionChange,
  changed,
}: SortMenuProps) {
  const current = options.find((option) => option.value === value) ?? options[0];
  const currentDirection = directionOptions.find((option) => option.value === direction);
  const title = `${label}: ${current?.label ?? ''}, ${currentDirection?.label ?? ''}`;
  const Icon = direction === 'asc' ? SortAscendingIcon : SortDescendingIcon;

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
        <Icon className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-dark-500">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className={ITEM_CLASS}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-dark-500">
          {directionLabel}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={direction}
          onValueChange={(next) => onDirectionChange(next as 'asc' | 'desc')}
        >
          {directionOptions.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value} className={ITEM_CLASS}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
