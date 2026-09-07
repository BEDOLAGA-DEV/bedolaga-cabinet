import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useSearchParams } from 'react-router';
import type { Batch, ReachabilityStatus } from '@/api/reachability';
import { Button } from '@/components/primitives';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotify } from '@/platform/hooks/useNotify';
import { formatShortDate } from '@/utils/format';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { ListRowSkeleton } from '../components/admin/ListRowSkeleton';
import { SetupGuide } from '../components/admin/reachability/SetupGuide';
import {
  type DeepLink,
  REACHABILITY_HISTORY_PATH,
  REACHABILITY_OTHER_PATH,
  REACHABILITY_SETTINGS_PATH,
  parseReachabilityDeepLink,
} from '../components/admin/reachability/deepLink';
import { BatchAside, BatchRunning } from '../components/admin/reachability/fleet/BatchRunning';
import { BatchScope } from '../components/admin/reachability/fleet/BatchScope';
import { FleetActionBar } from '../components/admin/reachability/fleet/FleetActionBar';
import { FleetList } from '../components/admin/reachability/fleet/FleetList';
import { FleetSummary } from '../components/admin/reachability/fleet/FleetSummary';
import { FleetToolbar } from '../components/admin/reachability/fleet/FleetToolbar';
import { ServerDetails } from '../components/admin/reachability/fleet/ServerDetails';
import { ServerSheet } from '../components/admin/reachability/fleet/ServerSheet';
import {
  batchTargets,
  estimateBatchMinutes,
} from '../components/admin/reachability/fleet/batchProgress';
import {
  type FleetFilter,
  type FleetRow,
  filterRows,
  fleetCounts,
  lastCheckedAt,
} from '../components/admin/reachability/fleet/fleet';
import { useBatch, useCancelBatch } from '../components/admin/reachability/fleet/useBatch';
import { useFleet } from '../components/admin/reachability/fleet/useFleet';
import { useMinWidth } from '../components/admin/reachability/fleet/useMinWidth';
import { formatCredits } from '../components/admin/reachability/money';
import { useReachabilityStatus } from '../components/admin/reachability/useReachabilityStatus';

const DESKTOP_PX = 1024;

type ParamPatch = Record<string, string | null>;

/**
 * BSCHEKER как состояние флота: одно предложение о серверах, список «проблемы сначала»,
 * карточка сервера панелью или шитом, запуск пачки с выбором объёма, живой прогресс.
 * Журнал и одиночные проверки адреса / подсети / подписки — отдельные экраны.
 */
export default function AdminReachability() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const link = useMemo(() => parseReachabilityDeepLink(searchParams), [searchParams]);
  const { data: status, isLoading } = useReachabilityStatus();
  const ready = Boolean(status?.enabled && status?.configured);

  // Ссылки «Повторить» из журнала и старые адреса с вкладкой ведут на экран одиночных проверок.
  if (link.repeatJobId !== null || (searchParams.has('kind') && link.mode !== 'hosts')) {
    return <Navigate to={`${REACHABILITY_OTHER_PATH}?${searchParams.toString()}`} replace />;
  }

  const patchParams = (patch: ParamPatch) => {
    const next = new URLSearchParams(searchParams);
    for (const [name, value] of Object.entries(patch)) {
      if (value === null) next.delete(name);
      else next.set(name, value);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <header className="flex flex-wrap items-center gap-3">
        <AdminBackButton />
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-dark-50">{t('admin.reachability.title')}</h1>
          <p className="text-xs text-dark-400">
            {t('admin.reachability.subtitle')}
            {status?.tier &&
              ` · ${t('admin.reachability.status.tierUntil', {
                tier: status.tier.charAt(0).toUpperCase() + status.tier.slice(1),
                date: status.tier_expires_at ? formatShortDate(status.tier_expires_at) : '—',
              })}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {ready && (
            <nav className="hidden items-center gap-4 text-sm md:flex">
              <Link to={REACHABILITY_HISTORY_PATH} className="text-accent-400 hover:underline">
                {t('admin.reachability.fleet.history')}
              </Link>
              <Link to={REACHABILITY_OTHER_PATH} className="text-accent-400 hover:underline">
                {t('admin.reachability.fleet.other')}
              </Link>
            </nav>
          )}
          {isLoading && <Skeleton className="h-6 w-28" />}
          {status && ready && (
            <span className="text-sm font-semibold tabular-nums text-dark-100">
              {formatCredits(status.balance_kopeks)}
            </span>
          )}
        </div>
        {status && !status.healthy && status.health_message && (
          <p className="w-full text-sm text-error-400">
            {status.health_message} ·{' '}
            <Link to={REACHABILITY_SETTINGS_PATH} className="text-accent-400 hover:underline">
              {t('admin.reachability.setup.openSettings')}
            </Link>
          </p>
        )}
      </header>

      {status && !ready && <SetupGuide status={status} />}
      {ready && <FleetView status={status} link={link} patchParams={patchParams} />}
    </div>
  );
}

interface FleetViewProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  patchParams: (patch: ParamPatch) => void;
}

function FleetView({ status, link, patchParams }: FleetViewProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const isDesktop = useMinWidth(DESKTOP_PX);
  const fleet = useFleet();
  const [filter, setFilter] = useState<FleetFilter>('all');
  const [query, setQuery] = useState('');
  const [scopeOpen, setScopeOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const counts = useMemo(() => fleetCounts(fleet.rows, new Date()), [fleet.rows]);
  const visible = useMemo(() => filterRows(fleet.rows, filter, query), [fleet.rows, filter, query]);
  const selected = useMemo(
    () => (link.serverKey ? (fleet.rows.find((row) => row.key === link.serverKey) ?? null) : null),
    [fleet.rows, link.serverKey],
  );
  const summaryRow = selected
    ? fleet.summary?.rows.find((row) => row.target_key === selected.key)
    : undefined;

  const activeBatchId = link.batchId ?? status?.active_batch?.id ?? null;
  const { batch, isActive } = useBatch(activeBatchId);
  const cancel = useCancelBatch();
  const progress = useMemo(
    () => (isActive && batch ? batchTargets(batch) : undefined),
    [isActive, batch],
  );
  const estimatedMinutes = batch
    ? estimateBatchMinutes(
        batch.total_targets,
        Math.max(1, fleet.units.filter((u) => u.probeable).length / 2),
      )
    : null;

  // Завершение пачки: слово о результате и адрес без ?batch=.
  const wasActive = useRef(isActive);
  useEffect(() => {
    if (wasActive.current && !isActive && batch) {
      const key =
        batch.status === 'done'
          ? 'finishedOk'
          : batch.status === 'cancelled'
            ? 'finishedCancelled'
            : 'finishedFailed';
      if (batch.status === 'failed') notify.error(t(`admin.reachability.batch.${key}`));
      else notify.success(t(`admin.reachability.batch.${key}`));
      if (link.batchId !== null) patchParams({ batch: null });
    }
    wasActive.current = isActive;
  }, [isActive, batch, link.batchId, notify, patchParams, t]);

  const alive = fleet.units.filter((unit) => unit.probeable);
  const unitsLine =
    alive.length > 0
      ? t('admin.reachability.fleet.onAir', {
          count: alive.length,
          total: alive.length,
          bs: alive.filter((unit) => unit.dpi === 'on').length,
          regular: alive.filter((unit) => unit.dpi !== 'on').length,
        })
      : '';

  const openServer = (row: FleetRow) => patchParams({ server: row.key });
  const closeServer = () => patchParams({ server: null });
  const startPicking = () => {
    setScopeOpen(false);
    patchParams({ pick: '1', server: null });
  };
  const stopPicking = () => {
    setPicked([]);
    patchParams({ pick: null });
  };
  const togglePicked = (ref: string) =>
    setPicked((current) =>
      current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref],
    );
  const onStarted = (started: Batch) => {
    setScopeOpen(false);
    setPicked([]);
    patchParams({ batch: String(started.id), pick: null, server: null });
  };
  const onRunningOne = (batchId: number) => patchParams({ batch: String(batchId), server: null });
  const stop = () => {
    if (batch) cancel.mutate(batch.id);
  };

  const problems = counts.partial + counts.down;
  const details = selected ? (
    <ServerDetails
      row={selected}
      summaryRow={summaryRow}
      units={fleet.units}
      status={status}
      onClose={closeServer}
      onRunning={onRunningOne}
    />
  ) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {isActive && batch ? (
          <BatchRunning
            batch={batch}
            onStop={stop}
            stopping={cancel.isPending}
            estimatedMinutes={estimatedMinutes}
          />
        ) : (
          <>
            <FleetSummary
              counts={counts}
              checkedAt={lastCheckedAt(fleet.rows)}
              unitsLine={unitsLine}
            />
            {counts.total > 0 && !link.picking && (
              <Button
                variant="primary"
                size="lg"
                className="hidden lg:inline-flex"
                onClick={() => setScopeOpen(true)}
              >
                {t('admin.reachability.fleet.check')}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:items-start lg:gap-6">
        <div className="space-y-4">
          <FleetToolbar
            counts={counts}
            filter={filter}
            onFilter={setFilter}
            query={query}
            onQuery={setQuery}
          />
          {fleet.isLoading ? (
            <ListRowSkeleton count={5} />
          ) : (
            <FleetList
              rows={visible}
              selectedKey={selected?.key ?? null}
              onSelect={openServer}
              progress={progress}
              picking={
                link.picking ? { picked: new Set(picked), onToggle: togglePicked } : undefined
              }
              emptyText={t('admin.reachability.fleet.empty')}
            />
          )}
          {link.picking && (
            <div className="hidden items-center gap-3 lg:flex">
              <Button
                variant="primary"
                disabled={picked.length === 0}
                onClick={() => setScopeOpen(true)}
              >
                {t('admin.reachability.fleet.picked', { count: picked.length })}
              </Button>
              <Button variant="ghost" onClick={stopPicking}>
                {t('common.cancel')}
              </Button>
            </div>
          )}
          <nav className="flex flex-wrap gap-4 text-sm md:hidden">
            <Link to={REACHABILITY_HISTORY_PATH} className="text-accent-400 hover:underline">
              {t('admin.reachability.fleet.history')}
            </Link>
            <Link to={REACHABILITY_OTHER_PATH} className="text-accent-400 hover:underline">
              {t('admin.reachability.fleet.other')}
            </Link>
          </nav>
        </div>
        <aside className="hidden lg:sticky lg:top-24 lg:block">
          {isDesktop && isActive && batch && <BatchAside batch={batch} rows={fleet.rows} />}
          {isDesktop && !(isActive && batch) && details && (
            <div className="rounded-2xl border border-dark-700/40 bg-dark-900/60 p-5">
              {details}
            </div>
          )}
        </aside>
      </div>

      {!isDesktop && selected && (
        <ServerSheet
          isOpen
          row={selected}
          summaryRow={summaryRow}
          units={fleet.units}
          status={status}
          onClose={closeServer}
          onRunning={onRunningOne}
        />
      )}

      <BatchScope
        isOpen={scopeOpen}
        onClose={() => setScopeOpen(false)}
        rows={fleet.rows}
        counts={counts}
        status={status}
        units={fleet.units}
        picked={picked}
        onPickManually={startPicking}
        onStarted={onStarted}
      />

      {isActive && batch ? (
        <FleetActionBar
          title={t('admin.reachability.batch.progressDone', {
            done: batch.done_targets,
            total: batch.total_targets,
          })}
          subtitle={t('admin.reachability.batch.canLeave')}
          action={
            <Button variant="secondary" loading={cancel.isPending} onClick={stop}>
              {t('admin.reachability.batch.stop')}
            </Button>
          }
        />
      ) : link.picking ? (
        <FleetActionBar
          title={t('admin.reachability.fleet.picked', { count: picked.length })}
          subtitle={t('admin.reachability.batch.scope.manualHint')}
          action={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={stopPicking}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                disabled={picked.length === 0}
                onClick={() => setScopeOpen(true)}
              >
                {t('admin.reachability.fleet.pickDone')}
              </Button>
            </div>
          }
        />
      ) : (
        counts.total > 0 && (
          <FleetActionBar
            title={t('admin.reachability.fleet.check')}
            subtitle={
              problems > 0
                ? t('admin.reachability.fleet.filter.problems', { count: problems })
                : undefined
            }
            action={
              <Button variant="primary" onClick={() => setScopeOpen(true)}>
                {t('admin.reachability.fleet.checkShort')}
              </Button>
            }
          />
        )
      )}
    </>
  );
}
