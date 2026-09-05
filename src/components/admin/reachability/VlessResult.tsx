import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { VerdictBadge } from './VerdictBadge';
import { vlessLegView } from './resultShapes';

export function VlessResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const legs = useMemo(() => job.legs.map(vlessLegView), [job.legs]);

  if (legs.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  return (
    <ul className="space-y-2">
      {legs.map((leg) => (
        <li
          key={`${leg.server}|${leg.opKey}`}
          className="rounded-xl border border-dark-700/60 bg-dark-900/40 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-dark-100">{leg.server}</span>
            <span className="font-mono text-xs text-dark-400">{leg.opKey}</span>
            <VerdictBadge verdict={leg.verdict} matches={leg.matches} className="ml-auto" />
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-300">
            {leg.tunnelUp !== null && (
              <div>
                <dt className="inline text-dark-400">{t('admin.reachability.result.tunnel')}: </dt>
                <dd className="inline">{leg.tunnelUp ? '✓' : '✗'}</dd>
              </div>
            )}
            {leg.targetsTotal > 0 && (
              <div>
                <dd className="inline">
                  {t('admin.reachability.result.targetsOk', {
                    ok: leg.targetsOk,
                    total: leg.targetsTotal,
                  })}
                </dd>
              </div>
            )}
            {leg.latencyMs !== null && (
              <div>
                <dd className="inline">
                  {t('admin.reachability.result.latency', { ms: leg.latencyMs })}
                </dd>
              </div>
            )}
            {leg.core && (
              <div>
                <dd className="inline">
                  {t('admin.reachability.result.core', { core: leg.core })}
                </dd>
              </div>
            )}
            {leg.failReason && (
              <div>
                <dt className="inline text-dark-400">
                  {t('admin.reachability.result.failReason')}:{' '}
                </dt>
                <dd className="inline font-mono">{leg.failReason}</dd>
              </div>
            )}
          </dl>
          {leg.diagnosis && (
            <p className="mt-2 text-sm text-dark-200">
              <span className="text-dark-400">{t('admin.reachability.result.diagnosis')}: </span>
              {leg.diagnosis}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
