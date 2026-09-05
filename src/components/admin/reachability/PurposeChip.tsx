import { useTranslation } from 'react-i18next';
import type { Purpose } from '@/api/reachability';
import { cn } from '@/lib/utils';

const CLASS: Record<Purpose, string> = {
  bs: 'bg-accent-500/15 text-accent-400',
  regular: 'bg-dark-700/60 text-dark-300',
  unknown: 'bg-warning-500/15 text-warning-400',
};

/** Назначение цели. Хосты под Белый список — предмет проверки, они выделены акцентом. */
export function PurposeChip({ purpose, guessed = false }: { purpose: Purpose; guessed?: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium',
        CLASS[purpose],
      )}
    >
      {t(`admin.reachability.purpose.${purpose}`)}
      {guessed ? ` · ${t('admin.reachability.purpose.guessed')}` : ''}
    </span>
  );
}
