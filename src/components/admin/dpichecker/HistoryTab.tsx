import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { type ActionKind, type ActionOut, type CheckType, dpicheckerApi } from '@/api/dpichecker';
import { Toggle } from '@/components/admin/Toggle';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Segmented } from '../Segmented';
import { AccountRuns } from './AccountRuns';
import { buildLink } from './deepLink';
import { DeliveriesLog } from './DeliveriesLog';
import { formatDate, HISTORY_GRID, toneOf } from './historyStyle';
import { usd4 } from './TotalStep';

type Filter = 'all' | CheckType | 'noisy' | 'probe';
const FILTERS: Filter[] = ['all', 'vpn', 'ip', 'mtproto', 'noisy', 'probe'];
const PAGE = 25;

function query(filter: Filter): { kind?: ActionKind; check_type?: CheckType } {
  if (filter === 'all') return {};
  if (filter === 'noisy' || filter === 'probe') return { kind: filter };
  return { kind: 'check', check_type: filter };
}

function Row({ action, onOpen }: { action: ActionOut; onOpen: () => void }) {
  const { t } = useTranslation();
  const type = action.check_type ?? action.kind;
  const tone = toneOf(action.status);
  const where = [
    action.location ? t(`admin.dpichecker.locations.${action.location}`) : null,
    action.pop_count ? t('admin.dpichecker.result.points', { count: action.pop_count }) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="border-b border-dark-800/60 last:border-0">
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full flex-col gap-1 rounded-xl px-3 py-2.5 text-start hover:bg-dark-800/50',
          HISTORY_GRID,
        )}
      >
        <span className="hidden text-xs tabular-nums text-dark-500 sm:block">#{action.id}</span>
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="min-w-0 truncate text-sm font-medium text-dark-100">{action.label}</span>
          <span className="shrink-0 rounded-md bg-dark-800 px-1.5 py-0.5 text-[11px] text-dark-200">
            {t(`admin.dpichecker.tabs.${type}`, { defaultValue: type })}
          </span>
        </span>
        <span className="text-xs text-dark-400">
          <span className="sm:hidden">#{action.id} · </span>
          {where}
        </span>
        <span className="hidden text-xs tabular-nums text-dark-300 sm:block">
          {action.resource_count
            ? t('admin.dpichecker.result.resources', { count: action.resource_count })
            : ''}
        </span>
        {/* Телефон: деньги, кто и когда — одной строкой, итог справа; с sm обёртки растворяются в колонки. */}
        <span className="flex items-start justify-between gap-3 sm:contents">
          <span className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 sm:contents">
            <span className="text-xs tabular-nums text-dark-200">
              {action.cost_usd !== null
                ? t('admin.dpichecker.money.usd', { value: usd4(action.cost_usd) })
                : ''}
              {action.refunded_usd ? (
                <span className="block text-success-400">
                  {t('admin.dpichecker.result.refunded', { value: usd4(action.refunded_usd) })}
                </span>
              ) : null}
            </span>
            <span className="min-w-0 truncate text-xs text-dark-200">
              {action.admin_name ?? '—'}
            </span>
            <span className="text-xs tabular-nums text-dark-400">
              {formatDate(action.created_at)}
            </span>
          </span>
          <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-medium', tone.text)}>
            <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone.dot)} />
            {t(`admin.dpichecker.status.${action.status}`, { defaultValue: action.status })}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * История запусков из кабинета — как история dpichecker.st: фильтры со счётчиками, строка — что,
 * где, сколько ресурсов, во что обошлось, кто запустил, когда и чем кончилось; клик — к результату.
 */
function CabinetHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [mine, setMine] = useState(false);
  // Страницами по offset: у бота limit не больше 100 — растить limit «Показать ещё» было нельзя.
  const history = useInfiniteQuery({
    queryKey: ['dpichecker', 'history', filter, mine],
    queryFn: ({ pageParam }) =>
      dpicheckerApi.listChecks({ ...query(filter), mine, limit: PAGE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });
  const items = history.data?.pages.flatMap((page) => page.items) ?? [];
  const counts = history.data?.pages[0]?.counts;
  const open = (action: ActionOut) =>
    navigate(
      action.kind === 'check'
        ? buildLink({ tab: 'history', check: action.id })
        : action.kind === 'monitor'
          ? buildLink({ tab: 'monitors' })
          : buildLink({ tab: 'history', scan: action.id }),
    );
  const labelOf = (value: Filter) => {
    const name =
      value === 'all' ? t('admin.dpichecker.history.all') : t(`admin.dpichecker.tabs.${value}`);
    const count = counts?.[value];
    return count === undefined ? name : t('admin.dpichecker.history.withCount', { name, count });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          options={FILTERS.map((value) => ({ value, label: labelOf(value) }))}
          onChange={setFilter}
          label={t('admin.dpichecker.history.filter')}
          size="md"
        />
        <label className="flex items-center gap-2 text-sm text-dark-200">
          <Toggle
            checked={mine}
            onChange={() => setMine(!mine)}
            aria-label={t('admin.dpichecker.history.mine')}
          />
          {t('admin.dpichecker.history.mine')}
        </label>
      </div>
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
            <span>{t('admin.dpichecker.history.columns.who')}</span>
            <span>{t('admin.dpichecker.history.columns.when')}</span>
            <span>{t('admin.dpichecker.history.columns.status')}</span>
          </div>
        )}
        {history.isLoading && (
          <SkeletonGroup className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </SkeletonGroup>
        )}
        {history.data && items.length === 0 && (
          <p className="p-3 text-sm text-dark-400">{t('admin.dpichecker.history.empty')}</p>
        )}
        <ul>
          {items.map((action) => (
            <Row key={action.id} action={action} onOpen={() => open(action)} />
          ))}
        </ul>
        {history.hasNextPage && (
          <button
            type="button"
            className="btn-ghost min-h-[40px] w-full text-sm"
            disabled={history.isFetchingNextPage}
            onClick={() => void history.fetchNextPage()}
          >
            {t('admin.dpichecker.history.more')}
          </button>
        )}
      </section>
    </div>
  );
}

type Scope = 'cabinet' | 'account';

/** История: запуски из кабинета или весь аккаунт у сервиса; внизу — журнал уведомлений сервиса боту. */
export function HistoryTab() {
  const { t } = useTranslation();
  const [scope, setScope] = useState<Scope>('cabinet');
  return (
    <div className="space-y-4">
      <Segmented
        value={scope}
        options={[
          { value: 'cabinet', label: t('admin.dpichecker.history.scopeCabinet') },
          { value: 'account', label: t('admin.dpichecker.history.scopeAccount') },
        ]}
        onChange={setScope}
        label={t('admin.dpichecker.history.scope')}
        size="md"
      />
      {scope === 'cabinet' ? <CabinetHistory /> : <AccountRuns />}
      <DeliveriesLog />
    </div>
  );
}
