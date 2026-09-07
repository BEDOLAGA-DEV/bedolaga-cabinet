import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type BatchCreateRequest,
  type Probes,
  type ReachabilityStatus,
  type ScopeKind,
  reachabilityApi,
} from '@/api/reachability';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import { ListRowSkeleton } from '../../ListRowSkeleton';
import { CheckOptions } from '../CheckOptions';
import { LaunchAside, LaunchBar } from '../LaunchAside';
import { OperatorPicker } from '../OperatorPicker';
import type { DeepLink } from '../deepLink';
import { batchAdapter } from '../launchAdapters';
import { repeatFromJob } from '../repeatFromJob';
import {
  DEFAULT_SNI_HOST,
  parseSniHosts,
  recallSniHosts,
  rememberSniHosts,
  sniNamesForAddresses,
} from '../sniNames';
import { dpiForSelection, mergeKeys, pickUnits, toggleKey } from '../unitSelection';
import { useLaunch } from '../useLaunch';
import { REACHABILITY_JOB_KEY } from '../useReachabilityJob';
import { BatchAside, BatchRunning } from './BatchRunning';
import { FleetActionBar } from './FleetActionBar';
import { FleetList } from './FleetList';
import { FleetSummary } from './FleetSummary';
import { FleetToolbar } from './FleetToolbar';
import { ServerDetails } from './ServerDetails';
import { batchTargets, estimateBatchMinutes } from './batchProgress';
import {
  type FleetFilter,
  type FleetRow,
  filterRows,
  fleetCounts,
  lastCheckedAt,
  scopeKindFor,
  scopeRefs,
} from './fleet';
import { FLEET_PROBES, dpiForRows } from './scopeDefaults';
import { useBatch, useCancelBatch } from './useBatch';
import { useFleet } from './useFleet';

type ParamPatch = Record<string, string | null>;

interface FleetCheckProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  patchParams: (patch: ParamPatch) => void;
}

const QUICK: readonly Exclude<ScopeKind, 'manual'>[] = ['problems', 'stale', 'all'];
const TOGGLE =
  'flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-50';
const TOGGLE_ON = 'border-accent-500/50 bg-accent-500/10 text-dark-50';
const TOGGLE_OFF = 'border-dark-700/50 bg-dark-900/30 text-dark-200 hover:border-dark-600';

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item) => b.includes(item));
}

/**
 * Вкладка «Хосты»: состояние серверов панели и проверка выбранных одной формой, как на bsbord.com:
 * строки серверов с чекбоксами (быстрые выборы «с проблемами / давно / все»), карточка сервера
 * раскрывается под строкой, под списком пробы и операторы по округам, справа «Запуск» с ценой.
 * Идущая проверка занимает место сводки. Никаких модалок и шитов.
 */
export function FleetCheck({ status, link, patchParams }: FleetCheckProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const base = 'admin.reachability';
  const fleet = useFleet();
  const now = useMemo(() => new Date(), []);
  const [filter, setFilter] = useState<FleetFilter>('all');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [manualUnits, setManualUnits] = useState<string[] | null>(null);
  const [probes, setProbes] = useState<Probes>({ ...FLEET_PROBES });
  const [sniText, setSniText] = useState(
    () => recallSniHosts() ?? status?.default_sni ?? DEFAULT_SNI_HOST,
  );
  const changeSni = (value: string) => {
    setSniText(value);
    rememberSniHosts(value);
  };

  const counts = useMemo(() => fleetCounts(fleet.rows, now), [fleet.rows, now]);
  const visible = useMemo(() => filterRows(fleet.rows, filter, query), [fleet.rows, filter, query]);

  // Ярлык с карточки ноды (?target=host:<uuid>) отмечает свои серверы один раз, когда список загрузился.
  const preselectKey = link.targets
    .filter((target) => target.kind === 'host')
    .map((target) => target.ref)
    .join(',');
  const appliedPreselect = useRef<string | null>(null);
  useEffect(() => {
    if (!preselectKey || appliedPreselect.current === preselectKey || fleet.rows.length === 0)
      return;
    appliedPreselect.current = preselectKey;
    const known = new Set(fleet.rows.map((row) => row.ref));
    setPicked((current) =>
      mergeKeys(
        current,
        preselectKey.split(',').filter((ref) => known.has(ref)),
      ),
    );
  }, [preselectKey, fleet.rows]);

  // «Повторить» из журнала: серверы, симки, пробы и SNI прошлой проверки подставляются в форму.
  const repeat = useQuery({
    queryKey: [REACHABILITY_JOB_KEY, 'repeat', link.repeatJobId],
    queryFn: () => reachabilityApi.getJob(link.repeatJobId as number),
    enabled: link.repeatJobId !== null,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const appliedRepeat = useRef<number | null>(null);
  useEffect(() => {
    if (!repeat.data || appliedRepeat.current === repeat.data.id) return;
    appliedRepeat.current = repeat.data.id;
    const state = repeatFromJob(repeat.data);
    setPicked(state.hosts);
    setManualUnits(state.units);
    if (state.probes) setProbes(state.probes);
    if (state.sniHosts) setSniText(state.sniHosts);
  }, [repeat.data]);

  const activeBatchId = link.batchId ?? status?.active_batch?.id ?? null;
  const { batch, isActive } = useBatch(activeBatchId);
  const cancel = useCancelBatch();
  const progress = useMemo(
    () => (isActive && batch ? batchTargets(batch) : undefined),
    [isActive, batch],
  );
  const alive = useMemo(() => fleet.units.filter((unit) => unit.probeable), [fleet.units]);
  const estimatedMinutes = batch
    ? estimateBatchMinutes(batch.total_targets, Math.max(1, alive.length / 2))
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
      if (batch.status === 'failed') notify.error(t(`${base}.batch.${key}`));
      else notify.success(t(`${base}.batch.${key}`));
      if (link.batchId !== null) patchParams({ batch: null });
    }
    wasActive.current = isActive;
  }, [isActive, batch, link.batchId, notify, patchParams, t]);

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const selectedRows = useMemo(
    () => fleet.rows.filter((row) => row.ref !== null && pickedSet.has(row.ref)),
    [fleet.rows, pickedSet],
  );
  // Симки по назначению выбранных серверов, пока человек не выбрал сам.
  const scopeDpi = dpiForRows(selectedRows);
  const autoKeys = useMemo(
    () => (scopeDpi === 'any' ? alive.map((unit) => unit.op_key) : pickUnits(alive, scopeDpi)),
    [alive, scopeDpi],
  );
  const selectedUnits = manualUnits ?? autoKeys;
  const autoSniNames = useMemo(
    () => sniNamesForAddresses(selectedRows.map((row) => row.address)),
    [selectedRows],
  );
  const body = useMemo<BatchCreateRequest | null>(() => {
    if (selectedRows.length === 0) return null;
    return {
      host_refs: selectedRows.map((row) => row.ref as string),
      units: [...selectedUnits],
      dpi: dpiForSelection(alive, selectedUnits),
      probes: { ...probes },
      sni_hosts: probes.sni ? parseSniHosts(sniText).names : [],
      scope_kind: scopeKindFor(fleet.rows, picked, now),
    };
  }, [selectedRows, selectedUnits, alive, probes, sniText, fleet.rows, picked, now]);
  const launch = useLaunch(
    body,
    status,
    (started) => {
      setPicked([]);
      patchParams({ batch: String(started.id), server: null });
    },
    batchAdapter,
  );

  const quickRefs = useMemo(
    () =>
      Object.fromEntries(
        QUICK.map((kind) => [kind, scopeRefs(fleet.rows, kind, now, [])]),
      ) as Record<(typeof QUICK)[number], string[]>,
    [fleet.rows, now],
  );
  const selectedForDetails = useMemo(
    () => (link.serverKey ? (fleet.rows.find((row) => row.key === link.serverKey) ?? null) : null),
    [fleet.rows, link.serverKey],
  );
  const summaryRow = selectedForDetails
    ? fleet.summary?.rows.find((row) => row.target_key === selectedForDetails.key)
    : undefined;
  const openDetails = (row: FleetRow) =>
    patchParams({ server: link.serverKey === row.key ? null : row.key });
  const closeDetails = () => patchParams({ server: null });
  const checkOne = () => {
    if (selectedForDetails?.ref) setPicked([selectedForDetails.ref]);
    closeDetails();
  };
  const stop = () => {
    if (batch) cancel.mutate(batch.id);
  };

  const onAir = alive.length
    ? t(`${base}.fleet.onAir`, {
        count: alive.length,
        total: alive.length,
        bs: alive.filter((unit) => unit.dpi === 'on').length,
        regular: alive.filter((unit) => unit.dpi !== 'on').length,
      })
    : '';
  const unitsLine = onAir ? onAir.charAt(0).toLowerCase() + onAir.slice(1) : '';

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
      <div className="space-y-6">
        {isActive && batch ? (
          <BatchRunning
            batch={batch}
            onStop={stop}
            stopping={cancel.isPending}
            estimatedMinutes={estimatedMinutes}
          />
        ) : (
          <FleetSummary
            counts={counts}
            checkedAt={lastCheckedAt(fleet.rows)}
            unitsLine={unitsLine}
          />
        )}

        <section className="space-y-3" aria-label={t(`${base}.fleet.targets`)}>
          <div
            role="group"
            aria-label={t(`${base}.fleet.quickLabel`)}
            className="flex flex-wrap items-center gap-2"
          >
            {QUICK.map((kind) => {
              const refs = quickRefs[kind];
              const on = refs.length > 0 && sameSet(refs, picked);
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={on}
                  disabled={refs.length === 0 || Boolean(isActive && batch)}
                  onClick={() => setPicked(on ? [] : [...refs])}
                  className={cn(TOGGLE, on ? TOGGLE_ON : TOGGLE_OFF)}
                >
                  {t(`${base}.fleet.pick.${kind}`)}{' '}
                  <span className="text-xs tabular-nums text-dark-400">{refs.length}</span>
                </button>
              );
            })}
            {picked.length > 0 && (
              <button
                type="button"
                onClick={() => setPicked([])}
                className="ms-auto min-h-[36px] text-sm text-dark-400 hover:text-dark-200"
              >
                {t(`${base}.fleet.clear`)}
              </button>
            )}
          </div>
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
              picked={pickedSet}
              onToggle={(ref) => setPicked((current) => toggleKey(current, ref))}
              onDetails={openDetails}
              expandedKey={link.serverKey}
              renderDetails={(row) => (
                <ServerDetails
                  row={row}
                  summaryRow={summaryRow}
                  units={fleet.units}
                  status={status}
                  onClose={closeDetails}
                  onCheck={checkOne}
                  withHeader={false}
                />
              )}
              progress={progress}
              emptyText={t(`${base}.fleet.empty`)}
            />
          )}
        </section>

        <CheckOptions
          probes={probes}
          onProbesChange={setProbes}
          sniHosts={sniText}
          onSniChange={changeSni}
          autoSniNames={autoSniNames}
          showSni={probes.sni}
        />

        <OperatorPicker
          kind="probe"
          units={fleet.units}
          selected={selectedUnits}
          onChange={setManualUnits}
          loading={fleet.isLoading}
        />
      </div>

      <div className="hidden lg:block">
        {isActive && batch ? (
          <BatchAside batch={batch} rows={fleet.rows} />
        ) : (
          <LaunchAside launch={launch} hint={t(`${base}.batch.onlyChecked`)} />
        )}
      </div>
      <div className="lg:hidden">
        {isActive && batch ? (
          <FleetActionBar
            title={t(`${base}.batch.progressDone`, {
              done: batch.done_targets,
              total: batch.total_targets,
            })}
            subtitle={t(`${base}.batch.canLeave`)}
            action={
              <Button variant="secondary" loading={cancel.isPending} onClick={stop}>
                {t(`${base}.batch.stop`)}
              </Button>
            }
          />
        ) : (
          picked.length > 0 && <LaunchBar launch={launch} />
        )}
      </div>
    </div>
  );
}
