import { Fragment } from 'react';
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
  /** Пары пунктов одного ключа («Сначала новые» / «Сначала старые») — между парами тонкий разделитель. */
  groups: DropdownOption[][];
  onChange: (value: string) => void;
  direction: 'asc' | 'desc';
  /** Выбран не порядок по умолчанию — кнопка подсвечивается, чтобы было видно, что список пересортирован. */
  changed: boolean;
}

/**
 * Сортировка — кнопка-иконка рядом с поиском. Каждый пункт меню — готовый порядок
 * целиком («Больше всего трафика»), выбор одним касанием; стрелка кнопки показывает направление.
 */
export function SortMenu({ label, value, groups, onChange, direction, changed }: SortMenuProps) {
  const current = groups.flat().find((option) => option.value === value);
  const title = `${label}: ${current?.label ?? ''}`;
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
      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[15rem] overflow-y-auto overscroll-contain"
      >
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-dark-500">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {groups.map((group, index) => (
            <Fragment key={group[0]?.value ?? index}>
              {index > 0 && <DropdownMenuSeparator />}
              {group.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value}
                  value={option.value}
                  className="data-[state=checked]:font-medium data-[state=checked]:text-accent-400"
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
