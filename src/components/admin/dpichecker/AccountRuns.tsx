import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { type AccountKind, type CheckType, dpicheckerApi, type RemoteRun } from '@/api/dpichecker';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { Segmented } from '../Segmented';
import { buildLink } from './deepLink';
import { formatDate, HISTORY_GRID, toneOf } from './historyStyle';
import { usd4 } from './TotalStep';

type AccountFilter = 'check' | CheckType | 'noisy' | 'probe';
const FILTERS: AccountFilter[] = ['check', 'vpn', 'ip', 'mtproto', 'noisy', 'probe'];
const PAGE = 25;

function request(filter: AccountFilter): { kind: AccountKind; check_type?: CheckType } {
  if (filter === 'check' || filter === 'noisy' || filter === 'probe') return { kind: filter };
  return { kind: 'check', check_type: filter };
}

function RunRow({
  run,
  kind,
  busy,
  onOpen,
}: {
  run: RemoteRun;
  kind: AccountKind;
  busy: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const tone = toneOf(run.status);
  const what =
    kind === 'check'
      ? t(`admin.dpichecker.tabs.${run.check_type ?? 'ip'}`)
      : (run.raw_target ?? run.cidr ?? '');
  const where = [
    run.location ? t(`admin.dpichecker.locations.${run.location}`) : null,
    run.pop_count ? t('admin.dpichecker.result.points', { count: run.pop_count }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="border-b border-dark-800/60 last:border-0">
      <button
        type="button"
        onClick={onOpen}
        disabled={busy}
        className={cn(
          'flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-start hover:bg-dark-800/50 disabled:opacity-60',
          HISTORY_GRID,
        )}
      >
        <span className="text-xs tabular-nums text-dark-400">#{run.id}</span>
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-dark-100">{what}</span>
          {kind !== 'check' && (
            <span className="shrink-0 rounded-md bg-dark-800 px-1.5 py-0.5 text-[11px] text-dark-200">
              {t(`admin.dpichecker.tabs.${kind}`)}
            </span>
          )}
        </span>
        <span className="text-xs text-dark-400">{where}</span>
        <span className="hidden text-xs tabular-nums text-dark-300 sm:block">
          {run.resource_count
            ? t('admin.dpichecker.result.resources', { count: run.resource_count })
            : ''}
        </span>
        <span className="flex items-start justify-between gap-3 sm:contents">
          <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 sm:contents">
            <span className="text-xs tabular-nums text-dark-200">
              {run.usd_cost !== null && run.usd_cost !== undefined
                ? t('admin.dpichecker.money.usd', { value: usd4(run.usd_cost) })
                : ''}
            </span>
            <span className="min-w-0 truncate text-xs text-dark-200">
              {t(`admin.dpichecker.history.sources.${run.source}`, { defaultValue: run.source })}
            </span>
            <span className="text-xs tabular-nums text-dark-400">{formatDate(run.created_at)}</span>
          </span>
          <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-medium', tone.text)}>
            <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone.dot)} />
            {t(`admin.dpichecker.status.${run.status}`, { defaultValue: run.status })}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Весь аккаунт у DPI//CHECKER: запуски с сайта, из их бота, через API и прогоны мониторов. Строка уже
 * в истории кабинета — ведёт к ней; нет — кабинет сначала берёт запуск себе, дальше он как свой.
 */
export function AccountRuns() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<AccountFilter>('check');
  const { kind, check_type } = request(filter);
  // Страницами по offset: у бота limit не больше 100, «Показать ещё» растит offset, а не limit.
  const runs = useInfiniteQuery({
    queryKey: ['dpichecker', 'account', kind, check_type ?? null],
    queryFn: ({ pageParam }) =>
      dpicheckerApi.accountRuns(kind, { check_type, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });
  const items = runs.data?.pages.flatMap((page) => page.items) ?? [];
  const goTo = (actionId: number) =>
    navigate(
      kind === 'check'
        ? buildLink({ tab: 'history', check: actionId })
        : buildLink({ tab: 'history', scan: actionId }),
    );
  const open = useMutation({
    mutationFn: (run: RemoteRun) => dpicheckerApi.openRemote(kind, run.id),
    onSuccess: (action) => goTo(action.id),
  });
  const onOpen = (run: RemoteRun) => (run.action_id ? goTo(run.action_id) : open.mutate(run));
  const labelOf = (value: AccountFilter) =>
    value === 'check'
      ? t('admin.dpichecker.history.allChecks')
      : t(`admin.dpichecker.tabs.${value}`);

  return (
    <div className="space-y-3">
      <p className="text-sm text-dark-300">{t('admin.dpichecker.history.accountHint')}</p>
      <Segmented
        value={filter}
        options={FILTERS.map((value) => ({ value, label: labelOf(value) }))}
        onChange={setFilter}
        label={t('admin.dpichecker.history.filter')}
        size="md"
      />
      <section className="bento-card p-2 sm:p-3">
        {items.length > 0 && (
          <div
            aria-hidden="true"
            className={cn(
              'hidden border-b border-dark-800/60 px-3 pb-2 text-[11px] uppercase tracking-wide text-dark-500',
              HISTORY_GRID,
            )}
          >
            <span>#</span>
            <span>{t('admin.dpichecker.history.columns.what')}</span>
            <span>{t('admin.dpichecker.history.columns.where')}</span>
            <span>{t('admin.dpichecker.history.columns.resources')}</span>
            <span>{t('admin.dpichecker.history.columns.cost')}</span>
            <span>{t('admin.dpichecker.history.columns.source')}</span>
            <span>{t('admin.dpichecker.history.columns.when')}</span>
            <span>{t('admin.dpichecker.history.columns.status')}</span>
          </div>
        )}
        {runs.isLoading && (
          <SkeletonGroup className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </SkeletonGroup>
        )}
        {runs.isError && (
          <p className="p-3 text-sm text-error-400">
            {getApiErrorMessage(runs.error, t('admin.dpichecker.result.loadFailed'))}
          </p>
        )}
        {runs.data && items.length === 0 && (
          <p className="p-3 text-sm text-dark-400">{t('admin.dpichecker.history.empty')}</p>
        )}
        <ul>
          {items.map((run) => (
            <RunRow
              key={run.id}
              run={run}
              kind={kind}
              busy={open.isPending && open.variables?.id === run.id}
              onOpen={() => onOpen(run)}
            />
          ))}
        </ul>
        {open.isError && (
          <p className="p-3 text-sm text-error-400">
            {getApiErrorMessage(open.error, t('admin.dpichecker.history.openFailed'))}
          </p>
        )}
        {runs.hasNextPage && (
          <button
            type="button"
            className="btn-ghost min-h-[40px] w-full text-sm"
            disabled={runs.isFetchingNextPage}
            onClick={() => void runs.fetchNextPage()}
          >
            {t('admin.dpichecker.history.more')}
          </button>
        )}
      </section>
    </div>
  );
}
