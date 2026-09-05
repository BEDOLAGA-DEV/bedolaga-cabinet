import { useTranslation } from 'react-i18next';
import type { Purpose } from '@/api/reachability';
import { cn } from '@/lib/utils';

const CLASS: Record<Purpose, string> = {
  bs: 'bg-accent-500/15 text-accent-400',
  regular: 'bg-dark-700/60 text-dark-300',
  unknown: 'bg-warning-500/15 text-warning-400',
};

interface PurposeChipProps {
  purpose: Purpose;
  guessed?: boolean;
  /** Если задано, чип становится кнопкой «Сменить назначение». */
  onToggle?: () => void;
  disabled?: boolean;
}

/** Назначение цели. Хосты под Белый список — предмет проверки, они выделены акцентом. */
export function PurposeChip({ purpose, guessed = false, onToggle, disabled }: PurposeChipProps) {
  const { t } = useTranslation();
  const label = `${t(`admin.reachability.purpose.${purpose}`)}${
    guessed ? ` · ${t('admin.reachability.purpose.guessed')}` : ''
  }`;
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
        'min-h-[28px] hover:ring-1 hover:ring-accent-500/40 disabled:opacity-60',
      )}
    >
      {label}
    </button>
  );
}
