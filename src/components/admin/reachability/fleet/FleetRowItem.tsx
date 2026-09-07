import { useTranslation } from 'react-i18next';
import { CheckIcon, ChevronRightIcon } from '@/components/icons';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { PurposeChip } from '../PurposeChip';
import { relativeAge } from '../relativeAge';
import type { TargetProgress } from './batchProgress';
import type { FleetRow, FleetState } from './fleet';

export const STATE_TEXT: Record<FleetState | 'checking', string> = {
  ok: 'text-success-400',
  partial: 'text-warning-400',
  down: 'text-error-400',
  unchecked: 'text-dark-400',
  checking: 'text-accent-400',
};

export const STATE_DOT: Record<FleetState, string> = {
  ok: 'bg-success-400',
  partial: 'bg-warning-400',
  down: 'bg-error-400',
  unchecked: 'bg-dark-500',
};

interface FleetRowItemProps {
  row: FleetRow;
  picked: boolean;
  onToggle: (ref: string) => void;
  onDetails: (row: FleetRow) => void;
  progress?: TargetProgress;
}

/** Слово-вердикт, счёт «у 7 из 15» и давность — с учётом идущей проверки. */
function useWords(row: FleetRow, progress: TargetProgress | undefined) {
  const { t, i18n } = useTranslation();
  const base = 'admin.reachability';
  if (progress?.state === 'queued') {
    return { word: t(`${base}.batch.queued`), tone: STATE_TEXT.unchecked, count: '', age: '' };
  }
  if (progress?.state === 'checking') {
    const count =
      progress.total > 0
        ? t(`${base}.fleet.ofUnits`, { ok: progress.ok, total: progress.total })
        : '';
    return { word: t(`${base}.fleet.state.checking`), tone: STATE_TEXT.checking, count, age: '' };
  }
  const counted = row.state !== 'unchecked';
  return {
    word: t(`${base}.fleet.state.${row.state}`),
    tone: STATE_TEXT[row.state],
    count: counted ? t(`${base}.fleet.ofUnits`, { ok: row.ok, total: row.total }) : '',
    age: row.checkedAt ? relativeAge(row.checkedAt, i18n.language) : '',
  };
}

/**
 * Строка сервера: чекбокс (это цель проверки), имя, адрес и назначение, слово-вердикт, счёт,
 * давность и «Подробнее». Тап по строке отмечает сервер; шеврон открывает карточку.
 */
export function FleetRowItem({ row, picked, onToggle, onDetails, progress }: FleetRowItemProps) {
  const { t } = useTranslation();
  const { word, tone, count, age } = useWords(row, progress);
  const selectable = row.ref !== null && !progress;
  const lead =
    progress?.state === 'checking' ? (
      <Spinner className="h-4 w-4 shrink-0 text-accent-400" />
    ) : (
      <span
        role="checkbox"
        aria-checked={picked}
        aria-disabled={!selectable}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
          picked ? 'border-accent-500 bg-accent-500 text-on-accent' : 'border-dark-500',
          !selectable && 'opacity-40',
        )}
      >
        {picked && <CheckIcon className="h-3.5 w-3.5" />}
      </span>
    );
  const mobileLine = [word, count, age].filter(Boolean);

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-2 transition-colors',
        picked ? 'bg-accent-500/10' : 'hover:bg-dark-800/40',
      )}
    >
      <button
        type="button"
        disabled={!selectable}
        aria-pressed={picked}
        onClick={() => row.ref && onToggle(row.ref)}
        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left md:grid md:min-h-[52px] md:grid-cols-[1.25rem_minmax(0,1fr)_11rem_5.5rem_7rem] md:gap-3"
      >
        <span className="flex w-5 shrink-0 justify-center">{lead}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-dark-100 md:text-sm">
            {row.label}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-xs text-dark-500">{row.address}</span>
            {row.purpose === 'bs' && <PurposeChip purpose="bs" />}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] md:hidden">
            {mobileLine.map((part, index) => (
              <span
                key={part}
                className={index === 0 ? cn('font-semibold', tone) : 'text-dark-400'}
              >
                {index > 0 ? `· ${part}` : part}
              </span>
            ))}
          </span>
        </span>
        <span className={cn('hidden text-sm font-semibold md:block', tone)}>{word}</span>
        <span className="hidden text-xs text-dark-400 md:block">{count}</span>
        <span className="hidden text-xs text-dark-400 md:block">{age}</span>
      </button>
      <button
        type="button"
        aria-label={t('admin.reachability.fleet.details')}
        onClick={() => onDetails(row)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-800 hover:text-dark-200"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
