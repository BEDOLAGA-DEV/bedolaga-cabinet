import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives';
import { cn } from '@/lib/utils';

/** Частые сроки продления. Админское продление бесплатное — цен в меню нет. */
export const EXTEND_PRESETS = [7, 30, 90] as const;

interface ExtendMenuProps {
  disabled?: boolean;
  onPick: (days: number) => void;
  /** «другой срок…» — форма с числом дней во вкладке «Подписка». */
  onCustom: () => void;
  className?: string;
  align?: 'start' | 'end';
}

/** «Продлить ▾»: три частых срока и «другой срок…» — одно нажатие вместо формы. */
export function ExtendMenu({
  disabled,
  onPick,
  onCustom,
  className,
  align = 'start',
}: ExtendMenuProps) {
  const { t } = useTranslation();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger disabled={disabled} className={cn('btn-primary', className)}>
        {t('admin.users.detail.subscription.extend')}
        <ChevronDownIcon className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[12rem]">
        {EXTEND_PRESETS.map((days) => (
          <DropdownMenuItem key={days} onSelect={() => onPick(days)}>
            {t('admin.users.detail.subscription.extendBy', { count: days })}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCustom}>
          {t('admin.users.detail.subscription.customDays')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
