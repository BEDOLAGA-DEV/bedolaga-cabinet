import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { GeoMap } from './GeoMap';
import { GeoRows } from './GeoRows';
import { useGeoRecheck } from './useGeoRecheck';
import { CloseIcon } from '@/components/icons';
import { type MapPick, filterGeoRows, geoRowsOf, geoSummaryOf, sortGeoRows } from './geoRowsView';
import { GEO_VERDICTS, TONE_DOT, isResultVerdict, verdictTone } from './geoVerdicts';

const KEY = 'admin.reachability.geo';

/** Результат GEO: фраза-вывод, чипы вердиктов (фильтр списка и подсветка точек), карта, поиск, города. */
export function GeoResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const rows = useMemo(() => sortGeoRows(geoRowsOf(job)), [job]);
  const recheck = useGeoRecheck(job);
  const summary = geoSummaryOf(job);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Телефон: касание на карте сужает список до города или региона; чип над списком снимает.
  // Прокрутки к списку нет: владелец счёл её бесполезной — листала криво и мимо списка.
  const [pick, setPick] = useState<MapPick | null>(null);
  const shown = useMemo(
    () => filterGeoRows(rows, { verdict, query, pick }),
    [rows, verdict, query, pick],
  );
  if (!summary) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }
  const counts = summary.byVerdict;
  const running = job.status === 'running' || job.status === 'pending';
  return (
    <div className="space-y-4">
      {summary.note && <p className="text-sm text-warning-400">{summary.note}</p>}
      {summary.conclusion && (
        <p className="text-sm font-medium text-dark-100">{summary.conclusion}</p>
      )}
      {summary.progress && running && (
        <p className="text-xs text-dark-400">{t(`${KEY}.result.progress`, summary.progress)}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {GEO_VERDICTS.filter((item) => counts[item]).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={verdict === item}
            onClick={() => setVerdict(verdict === item ? null : item)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
              verdict === item
                ? 'border-accent-500/40 bg-accent-500/10 text-accent-400'
                : 'border-dark-700/60 text-dark-200',
              !isResultVerdict(item) && 'opacity-70',
            )}
          >
            <span
              className={cn('inline-block h-2 w-2 rounded-full', TONE_DOT[verdictTone(item)])}
            />
            {t(`${KEY}.verdicts.${item}`)} · {counts[item]}
          </button>
        ))}
        {summary.noiseRows > 0 && (
          <span className="self-center text-xs text-dark-400">
            {t(`${KEY}.result.noise`, { count: summary.noiseRows })}
          </span>
        )}
      </div>
      <GeoMap
        rows={rows}
        highlightVerdict={verdict}
        job={job}
        recheck={recheck}
        onPick={setPick}
        picked={pick}
      />
      {pick && (
        <div className="flex items-center gap-2 text-sm text-dark-200">
          <span className="min-w-0 truncate">
            {t(`${KEY}.result.picked`, { label: pick.label, count: shown.length })}
          </span>
          <button
            type="button"
            onClick={() => setPick(null)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-accent-400 hover:underline"
          >
            {t(`${KEY}.result.pickedClear`)}
            <CloseIcon className="h-3 w-3" />
          </button>
        </div>
      )}
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t(`${KEY}.result.find`)}
        placeholder={t(`${KEY}.result.find`)}
        className="input w-full text-sm"
      />
      <GeoRows rows={shown} job={job} recheck={recheck} />
    </div>
  );
}
