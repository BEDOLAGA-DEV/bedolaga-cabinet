import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { RefreshIcon, ShuffleIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { type RecheckState, recheckButtons } from './geoRecheck';
import type { GeoRow } from './geoRowsView';

const ICONS = { refresh: RefreshIcon, shuffle: ShuffleIcon } as const;

interface RecheckButtonsProps {
  job: Pick<Job, 'finished_at'>;
  row: Pick<GeoRow, 'sid' | 'sid_hold_s' | 'exit_ip'>;
  state: RecheckState;
  onStart: (sameExit: boolean) => void;
  className?: string;
}

/**
 * Повтор проваленного города — логика оригинала bsbord.com, вид кабинета: две обычные кнопки
 * с иконками из общего набора; пока идёт — «Идёт проверка…», после — «Перепроверено».
 */
export function RecheckButtons({ job, row, state, onStart, className }: RecheckButtonsProps) {
  const { t } = useTranslation();
  const KEY = 'admin.reachability.geo.recheck';
  if (state === 'none') return null;
  if (state === 'busy') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-dark-400', className)}>
        <RefreshIcon spinning className="h-3.5 w-3.5" />
        {t(`${KEY}.busy`)}
      </span>
    );
  }
  if (state === 'rechecked') {
    return (
      <span className={cn('text-xs text-dark-400', className)} title={t(`${KEY}.doneTitle`)}>
        {t(`${KEY}.done`)}
      </span>
    );
  }
  return (
    <span className={cn('flex flex-wrap gap-1.5', className)}>
      {recheckButtons(job, row, t).map((button) => {
        const Icon = ICONS[button.icon];
        return (
          <button
            key={button.label}
            type="button"
            title={button.title}
            onClick={() => onStart(button.sameExit)}
            className="btn-secondary gap-1.5 px-3 py-1.5 text-xs"
          >
            <Icon className="h-3.5 w-3.5" />
            {button.label}
          </button>
        );
      })}
    </span>
  );
}
