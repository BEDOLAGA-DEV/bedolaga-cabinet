import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { UnitBadge } from './ResultTable';
import { VerdictBadge } from './VerdictBadge';
import { unitLabel } from './unitLabel';
import { useUnits } from './useUnits';

/**
 * Пока проверка идёт: список симок, и у каждой либо уже вердикт (VLESS и скан отдают леги
 * по мере ответа), либо «ждём…». Человек видит, что дело движется, а не мигающую полосу.
 */
export function ProgressUnits({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const keys = job.units_effective ?? job.units_resolved ?? job.units_requested ?? [];
  if (keys.length === 0) return null;
  const legsByKey = new Map(job.legs.map((leg) => [leg.op_key, leg]));
  const answered = keys.filter((key) => legsByKey.has(key)).length;
  return (
    <div className="space-y-2">
      <p className="text-xs text-dark-400">
        {t('admin.reachability.progress.answered', { answered, total: keys.length })}
      </p>
      <ul
        aria-label={t('admin.reachability.progress.units')}
        className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        {keys.map((key) => {
          const leg = legsByKey.get(key);
          const [operator, region = ''] = key.split('|');
          const label = unitLabel({ op_key: key, operator, region }, catalog);
          return (
            <li key={key} className="flex min-h-[32px] items-center gap-2 text-sm">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <UnitBadge label={label} noBs={key.endsWith('|off')} />
              </span>
              {leg ? (
                <VerdictBadge verdict={leg.verdict} matches={leg.matches_expectation} />
              ) : (
                <span className="text-xs text-dark-500">
                  {t('admin.reachability.progress.waitingUnit')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
