import { useTranslation } from 'react-i18next';
import type { Purpose } from '@/api/reachability';
import { PencilIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const CLASS: Record<Purpose, string> = {
  bs: 'bg-accent-500/15 text-accent-400',
  regular: 'bg-dark-700/60 text-dark-300',
  unknown: 'bg-warning-500/15 text-warning-400',
};

interface PurposeChipProps {
  purpose: Purpose;
  /** Назначение угадано по имени хоста; в интерфейсе не выделяется, чип всё равно переключаемый. */
  guessed?: boolean;
  /** Если задано, чип становится кнопкой «Сменить назначение». */
  onToggle?: () => void;
  disabled?: boolean;
  /** Метка в строке списка: короткое «БС», полное название в подсказке. */
  compact?: boolean;
}

/** Назначение цели. Хосты под Белый список — предмет проверки, они выделены акцентом. */
export function PurposeChip({ purpose, onToggle, disabled, compact = false }: PurposeChipProps) {
  const { t } = useTranslation();
  const label = t(`admin.reachability.purpose.${purpose}`);
  if (compact) {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn('shrink-0 rounded px-1 py-px text-[11px] font-semibold', CLASS[purpose])}
      >
        {t(`admin.reachability.purposeShort.${purpose}`)}
      </span>
    );
  }
  const className = cn(
    'shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium',
    CLASS[purpose],
  );
  if (!onToggle) return <span className={className}>{label}</span>;
  return (
    <button
      type="button"
      title={t('admin.reachability.targets.purposeToggle')}
      aria-label={`${t('admin.reachability.targets.purposeToggle')}: ${label}`}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        className,
        'inline-flex min-h-[28px] items-center gap-1 hover:ring-1 hover:ring-accent-500/40 disabled:opacity-60',
      )}
    >
      {label}
      <PencilIcon className="h-3 w-3 opacity-70" />
    </button>
  );
}
