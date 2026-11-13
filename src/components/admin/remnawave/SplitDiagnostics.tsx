import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getSplitDiagnostics, splitDiagnosticQueueKeys } from '@/api/adminSplitDiagnostics';
import { RefreshIcon, WarningCircleIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

const knownWarnings = new Set<string>([
  ...splitDiagnosticQueueKeys,
  'no_fresh_round',
  'round_errors',
  'panel_backoff',
]);
const ns = 'admin.splitDiagnostics';

/** A read-only extension of the existing Remnawave overview. */
export function SplitDiagnostics() {
  const { t, i18n } = useTranslation();
  const query = useQuery({
    queryKey: ['admin-split-diagnostics'],
    queryFn: getSplitDiagnostics,
    retry: false,
  });
  const data = query.data;
  const date = (value: string | null) => {
    if (!value) return t(`${ns}.never`);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? t(`${ns}.never`) : parsed.toLocaleString(i18n.language);
  };

  return (
    <section className="bento-card mb-6 p-4 sm:p-6" aria-labelledby="split-diagnostics-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="split-diagnostics-title" className="text-lg font-semibold text-dark-100">
            {t(`${ns}.title`)}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-dark-300">{t(`${ns}.description`)}</p>
        </div>
        <button
          type="button"
          className="btn-secondary inline-flex shrink-0 items-center gap-2"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshIcon className="h-4 w-4" aria-hidden="true" />
          {t(`${ns}.refresh`)}
        </button>
      </div>
      {query.isPending ? (
        <SkeletonGroup className="mt-5 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-full" />
        </SkeletonGroup>
      ) : query.isError ? (
        <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-error-400">
          <WarningCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(`${ns}.error`)}
        </p>
      ) : data ? (
        <>
          <p aria-live="polite" className="mt-4 text-sm text-dark-300">
            {t(`${ns}.checked`, { date: date(data.checked_at), seconds: data.freshness_seconds })}
          </p>
          <p className="mt-1 text-sm text-dark-300">
            {t(
              `${ns}.runtime.${data.local_runtime_running === null ? 'unknown' : data.local_runtime_running ? 'running' : 'stopped'}`,
            )}
          </p>
          {data.bindings_truncated && (
            <p role="status" className="mt-3 text-sm text-warning-400">
              {t(`${ns}.truncated`, { count: data.active_bindings })}
            </p>
          )}
          {data.unbound_enrollments > 0 && (
            <p className="mt-3 text-sm text-warning-400">
              {t(`${ns}.unbound`, { count: data.unbound_enrollments })}
            </p>
          )}
          {data.scopes.length === 0 && (
            <p className="mt-4 text-sm text-dark-200">{t(`${ns}.empty`)}</p>
          )}
          {data.scopes.map((scope) => (
            <div key={scope.number} className="mt-5 border-t border-dark-700 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-dark-100">
                  {t(`${ns}.scope`, { number: scope.number })}
                </h3>
                <span className={scope.diagnostic_ready ? 'badge-success' : 'badge-warning'}>
                  {t(`${ns}.${scope.diagnostic_ready ? 'ready' : 'attention'}`)}
                </span>
              </div>
              <dl className="mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-dark-300">{t(`${ns}.lastSuccess`)}</dt>
                  <dd className="mt-1 text-dark-100">
                    <bdi>{date(scope.last_success_at)}</bdi>
                  </dd>
                </div>
                <div>
                  <dt className="text-dark-300">{t(`${ns}.phaseLabel`)}</dt>
                  <dd className="mt-1 text-dark-100">
                    {t(`${ns}.phase.${scope.collection_phase ?? 'unknown'}`)}
                  </dd>
                </div>
                {scope.oldest_pending_at && (
                  <div>
                    <dt className="text-dark-300">{t(`${ns}.oldest`)}</dt>
                    <dd className="mt-1 text-dark-100">
                      <bdi>{date(scope.oldest_pending_at)}</bdi>
                    </dd>
                  </div>
                )}
                {scope.pause_until && (
                  <div>
                    <dt className="text-dark-300">{t(`${ns}.pauseUntil`)}</dt>
                    <dd className="mt-1 text-dark-100">
                      <bdi>{date(scope.pause_until)}</bdi>
                    </dd>
                  </div>
                )}
              </dl>
              {scope.warnings.length > 0 ? (
                <ul className="mt-4 space-y-2 text-sm">
                  {scope.warnings.map((warning) => {
                    const count = splitDiagnosticQueueKeys.includes(
                      warning as (typeof splitDiagnosticQueueKeys)[number],
                    )
                      ? scope.queues[warning as (typeof splitDiagnosticQueueKeys)[number]]
                      : undefined;
                    return (
                      <li
                        key={warning}
                        className="flex items-start justify-between gap-4 text-dark-200"
                      >
                        <span>
                          {t(`${ns}.warning.${knownWarnings.has(warning) ? warning : 'unknown'}`)}
                        </span>
                        {count !== undefined && (
                          <span className="shrink-0 font-semibold tabular-nums text-dark-100">
                            {count}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-dark-300">{t(`${ns}.noQueue`)}</p>
              )}
            </div>
          ))}
          <p className="mt-5 max-w-prose text-sm text-dark-300">{t(`${ns}.readinessCaution`)}</p>
          <p className="mt-2 text-sm text-dark-300">
            {t(`${ns}.${data.force_disconnect_enabled ? 'disconnectOn' : 'disconnectOff'}`)}{' '}
            {t(`${ns}.socketCaution`)}
          </p>
        </>
      ) : null}
    </section>
  );
}
