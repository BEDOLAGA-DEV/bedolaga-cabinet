import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CheckResource, type CheckRow, type CheckType, dpicheckerApi } from '@/api/dpichecker';
import { StatCard } from '@/components/stats';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsTelegram } from '@/platform/hooks/usePlatform';
import { usePermissionStore } from '@/store/permissions';
import { getApiErrorMessage } from '@/utils/api-error';
import { isRunning, resourceVerdict, rowNote, sortRows } from './checkView';
import { DpiRegionMap } from './DpiRegionMap';
import { saveBlob } from './download';
import { CHECK_POLL_MS, CHECK_WAIT_SEC } from './pollInterval';
import { regionStates } from './regionMap';
import { usd4 } from './TotalStep';

const ROWS_PREVIEW = 20;
const VERDICT_TONE = {
  available: 'text-success-400',
  partial: 'text-warning-400',
  unavailable: 'text-error-400',
  pending: 'text-dark-400',
} as const;

function formatDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : '';
}

function RowLine({ row, checkType }: { row: CheckRow; checkType: CheckType }) {
  const { t } = useTranslation();
  const note = rowNote(checkType, row);
  const noteText =
    note === null
      ? null
      : 'text' in note
        ? note.text
        : t(`admin.dpichecker.result.notes.${note.key}`);
  const details = [
    row.latency_ms ? t('admin.dpichecker.result.ms', { value: Math.round(row.latency_ms) }) : null,
    ...row.speeds.map((speed) =>
      t('admin.dpichecker.result.speed', { host: speed.host, value: speed.mbps }),
    ),
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-0.5 border-b border-dark-800/60 py-2 last:border-0 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="min-w-0 flex-1 text-sm text-dark-100">{row.region}</span>
      <span className={cn('text-sm font-medium', row.ok ? 'text-success-400' : 'text-error-400')}>
        {row.ok ? t('admin.dpichecker.result.ok') : t('admin.dpichecker.result.fail')}
      </span>
      <span className="text-xs tabular-nums text-dark-400 sm:w-[46%] sm:text-end">
        {[...details, noteText].filter(Boolean).join(' · ')}
      </span>
    </li>
  );
}

function ResourceCard({ resource, checkType }: { resource: CheckResource; checkType: CheckType }) {
  const { t } = useTranslation();
  const [all, setAll] = useState(false);
  const rows = sortRows(resource.rows);
  const shown = all ? rows : rows.slice(0, ROWS_PREVIEW);
  const verdict = resourceVerdict(resource);
  return (
    <section className="bento-card space-y-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="min-w-0 text-base font-semibold text-dark-100">{resource.name}</h3>
        <span className={cn('text-sm font-medium', VERDICT_TONE[verdict])}>
          {t('admin.dpichecker.result.okOf', { ok: resource.ok_count, total: resource.total })}
        </span>
      </div>
      {resource.direct && (
        <p className="text-xs text-dark-400">
          {resource.direct.ok
            ? t('admin.dpichecker.result.abroadOk', {
                value: resource.direct.latency_ms ? Math.round(resource.direct.latency_ms) : '—',
              })
            : t('admin.dpichecker.result.abroadFail')}
        </p>
      )}
      <ul>
        {shown.map((row) => (
          <RowLine key={`${row.pop_id}-${row.region}`} row={row} checkType={checkType} />
        ))}
      </ul>
      {rows.length > ROWS_PREVIEW && (
        <button
          type="button"
          className="btn-ghost min-h-[40px] px-3 text-sm"
          onClick={() => setAll(!all)}
        >
          {all
            ? t('admin.dpichecker.result.showLess')
            : t('admin.dpichecker.result.showAll', { count: rows.length })}
        </button>
      )}
    </section>
  );
}

/** Россия — своя карта регионов с подсказками (данные уже на руках, обновляется по ходу проверки). */
function RussiaResultMap({ resources }: { resources: CheckResource[] }) {
  const pops = useQuery({
    queryKey: ['dpichecker', 'pops', 'russia'],
    queryFn: () => dpicheckerApi.getPops('russia'),
    staleTime: 10 * 60_000,
  });
  const states = useMemo(
    () => regionStates(resources, pops.data?.pops ?? []),
    [resources, pops.data],
  );
  return <DpiRegionMap states={states} />;
}

/** Китай, Иран, Туркменистан — карты регионов у нас нет, берём готовую картинку сервиса. */
function ServiceMapImage({ actionId, finished }: { actionId: number; finished: boolean }) {
  const { t } = useTranslation();
  const image = useQuery({
    queryKey: ['dpichecker', 'check-map', actionId, finished],
    queryFn: () => dpicheckerApi.checkMap(actionId),
    staleTime: finished ? Number.POSITIVE_INFINITY : 0,
  });
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!image.data) return;
    const next = URL.createObjectURL(image.data);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [image.data]);
  if (image.isLoading)
    return <Skeleton variant="card" className="aspect-[2/1] w-full rounded-2xl" />;
  if (!url) return null;
  return (
    <img
      src={url}
      alt={t('admin.dpichecker.result.map')}
      className="w-full rounded-2xl border border-dark-700"
    />
  );
}

/**
 * Результат проверки — как на dpichecker.st: сводка, по каждому ресурсу «N из M доступно», «из-за
 * границы» и регионы (сначала недоступные) с пояснениями словами. Пока идёт — прогресс, в очереди —
 * «Отменить» с возвратом денег; сервис не ответил на запуск — «Спросить ещё раз» тем же ключом.
 */
export function CheckResult({ actionId }: { actionId: number }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isTelegram = useIsTelegram();
  const canRun = usePermissionStore((state) => state.hasPermission('dpichecker:run'));
  const key = ['dpichecker', 'check', actionId];

  const query = useQuery({
    queryKey: key,
    queryFn: ({ queryKey }) => {
      const previous = queryClient.getQueryData<{ check: { status: string } }>(queryKey);
      // Пока идёт — бот ждёт у сервиса (long-poll), результат появляется сам.
      return dpicheckerApi.getCheck(
        actionId,
        previous && isRunning(previous.check.status) ? CHECK_WAIT_SEC : 0,
      );
    },
    refetchInterval: (state) =>
      state.state.data && isRunning(state.state.data.check.status) ? CHECK_POLL_MS : false,
  });
  const cancel = useMutation({
    mutationFn: () => dpicheckerApi.cancelCheck(actionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
  const resubmit = useMutation({
    mutationFn: () => dpicheckerApi.resubmit(actionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  if (query.isLoading) {
    return (
      <SkeletonGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} variant="card" className="h-20" />
        ))}
      </SkeletonGroup>
    );
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-error-400">
        {getApiErrorMessage(query.error, t('admin.dpichecker.result.loadFailed'))}
      </p>
    );
  }

  const { action, check } = query.data;
  const status = check.status;
  const refunded = cancel.data?.refunded_usd ?? action.refunded_usd;
  const progress = check.progress;
  const failure = cancel.error ?? resubmit.error;

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-dark-100">
          {t(`admin.dpichecker.result.title.${action.check_type ?? 'ip'}`)} · {action.label}
        </h2>
        <p className="text-xs text-dark-400">
          {[
            t(`admin.dpichecker.locations.${action.location ?? 'russia'}`),
            t('admin.dpichecker.result.points', { count: action.pop_count }),
            t('admin.dpichecker.result.resources', { count: action.resource_count }),
            action.cost_usd !== null
              ? t('admin.dpichecker.result.charged', { value: usd4(action.cost_usd) })
              : null,
            [formatDate(check.created_at ?? action.created_at), formatDate(check.completed_at)]
              .filter(Boolean)
              .join(' → '),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="text-sm font-medium text-dark-200">
          {t(`admin.dpichecker.status.${status}`, { defaultValue: status })}
        </p>
      </header>

      {status === 'pending' && canRun && (
        <button
          type="button"
          className="btn-danger min-h-[44px] px-4 text-sm"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {t('admin.dpichecker.result.cancel')}
        </button>
      )}
      {refunded !== null && refunded !== undefined && (
        <p className="text-sm text-success-400">
          {t('admin.dpichecker.result.refunded', { value: usd4(refunded) })}
        </p>
      )}
      {(status === 'unknown' || status === 'submitting') && canRun && (
        <div className="space-y-2 rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4">
          <p className="text-sm text-dark-200">{t('admin.dpichecker.result.unknownHint')}</p>
          <button
            type="button"
            className="btn-primary min-h-[44px] px-4 text-sm"
            disabled={resubmit.isPending}
            onClick={() => resubmit.mutate()}
          >
            {t('admin.dpichecker.result.resubmit')}
          </button>
        </div>
      )}
      {status === 'rejected' && action.error_code && (
        <p className="text-sm text-error-400">{t('admin.dpichecker.result.rejected')}</p>
      )}
      {isRunning(status) && progress.total ? (
        <div className="space-y-1" role="status">
          <div className="h-2 overflow-hidden rounded-full bg-dark-800">
            <div
              className="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${progress.percent ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-dark-400">
            {t('admin.dpichecker.result.progress', {
              done: progress.done ?? 0,
              total: progress.total,
            })}
          </p>
        </div>
      ) : null}

      {check.resources.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label={t('admin.dpichecker.result.available')}
              value={check.summary.available}
              tone="success"
            />
            <StatCard
              label={t('admin.dpichecker.result.partial')}
              value={check.summary.partial}
              tone="warning"
            />
            <StatCard
              label={t('admin.dpichecker.result.unavailable')}
              value={check.summary.unavailable}
              tone="error"
            />
            <StatCard
              label={t('admin.dpichecker.result.avgLatency')}
              value={
                check.summary.avg_latency_ms !== null
                  ? t('admin.dpichecker.result.ms', { value: check.summary.avg_latency_ms })
                  : '—'
              }
            />
          </div>
          {(action.location ?? 'russia') === 'russia' ? (
            <RussiaResultMap resources={check.resources} />
          ) : (
            <ServiceMapImage actionId={actionId} finished={!isRunning(status)} />
          )}
          {!isTelegram && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary min-h-[40px] px-4 text-sm"
                onClick={async () =>
                  saveBlob(await dpicheckerApi.reportCsv(actionId), `dpichecker_${actionId}.csv`)
                }
              >
                {t('admin.dpichecker.result.csv')}
              </button>
            </div>
          )}
          {check.resources.map((resource) => (
            <ResourceCard key={resource.index} resource={resource} checkType={check.check_type} />
          ))}
        </>
      )}
      {failure && (
        <p className="text-sm text-error-400">
          {getApiErrorMessage(failure, t('admin.dpichecker.form.failed'))}
        </p>
      )}
    </div>
  );
}
