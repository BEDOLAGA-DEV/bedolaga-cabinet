import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type Batch,
  type Probes,
  type ReachabilityStatus,
  type ScopeKind,
  type Unit,
  reachabilityApi,
} from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { ProbesRow } from '../ProbesRow';
import { SniHostsField } from '../SniHostsField';
import { UnitsSummary } from '../UnitsSummary';
import { formatCredits, formatMoney } from '../money';
import { DEFAULT_SNI_HOST, parseSniHosts, recallSniHosts, rememberSniHosts } from '../sniNames';
import { pickUnits } from '../unitSelection';
import { type FleetCounts, type FleetRow, scopeRefs } from './fleet';
import { FLEET_PROBES, batchBody } from './scopeDefaults';

interface BatchScopeProps {
  isOpen: boolean;
  onClose: () => void;
  rows: FleetRow[];
  counts: FleetCounts;
  status: ReachabilityStatus | undefined;
  units: Unit[];
  /** Серверы, отмеченные вручную в списке (refs). */
  picked: string[];
  /** «Выбрать вручную» без отмеченных: закрыть шит и включить чекбоксы в списке. */
  onPickManually: () => void;
  onStarted: (batch: Batch) => void;
}

const KINDS: readonly ScopeKind[] = ['problems', 'stale', 'all', 'manual'];
export const BATCH_PREVIEW_KEY = 'admin-reachability-batch-preview';

function defaultKind(counts: FleetCounts): ScopeKind {
  if (counts.partial + counts.down > 0) return 'problems';
  if (counts.stale > 0) return 'stale';
  return 'all';
}

/**
 * «Что проверить?»: объём с числом серверов, для выбранного — цена и примерное время;
 * симки подбираются по назначению серверов, ручной выбор и пробы спрятаны за «Изменить» и
 * «Дополнительно». Запуск списывает деньги только за проверенные симки, поэтому шит и есть
 * подтверждение: в Mini App никакого системного окна.
 */
export function BatchScope({
  isOpen,
  onClose,
  rows,
  counts,
  status,
  units,
  picked,
  onPickManually,
  onStarted,
}: BatchScopeProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const base = 'admin.reachability';
  const now = useMemo(() => new Date(), []);
  const [kind, setKind] = useState<ScopeKind>(() => defaultKind(counts));
  const [manualUnits, setManualUnits] = useState<string[] | null>(null);
  const [probes, setProbes] = useState<Probes>({ ...FLEET_PROBES });
  const [sniText, setSniText] = useState(
    () => recallSniHosts() ?? status?.default_sni ?? DEFAULT_SNI_HOST,
  );
  const [advanced, setAdvanced] = useState(false);

  const refsByKind = useMemo(
    () =>
      Object.fromEntries(KINDS.map((k) => [k, scopeRefs(rows, k, now, picked)])) as Record<
        ScopeKind,
        string[]
      >,
    [rows, now, picked],
  );
  const selected = useMemo(() => {
    const wanted = new Set(refsByKind[kind]);
    return rows.filter((row) => row.ref !== null && wanted.has(row.ref));
  }, [rows, refsByKind, kind]);

  const body = useMemo(() => {
    const draft = batchBody(selected, kind, status, manualUnits);
    return { ...draft, probes: { ...probes }, sni_hosts: parseSniHosts(sniText).names };
  }, [selected, kind, status, manualUnits, probes, sniText]);
  const alive = useMemo(() => units.filter((u) => u.probeable), [units]);
  const autoKeys = useMemo(
    () => (body.dpi === 'any' ? alive.map((u) => u.op_key) : pickUnits(alive, body.dpi)),
    [alive, body.dpi],
  );

  const preview = useQuery({
    queryKey: [BATCH_PREVIEW_KEY, body],
    queryFn: () => reachabilityApi.previewBatch(body),
    enabled: isOpen && body.host_refs.length > 0,
    staleTime: 30_000,
    retry: false,
  });
  const run = useMutation({
    mutationFn: () => reachabilityApi.createBatch(body),
    onSuccess: (batch) => {
      rememberSniHosts(sniText);
      notify.success(t(`${base}.batch.started`));
      onStarted(batch);
    },
    onError: (error) => notify.error(getApiErrorMessage(error, '')),
  });

  const cost = preview.data?.cost_kopeks ?? null;
  const price = cost !== null ? formatCredits(cost) : null;
  const balanceAfter =
    preview.data && preview.data.balance_kopeks !== null && cost !== null
      ? preview.data.balance_kopeks - cost
      : null;

  const pick = (next: ScopeKind) => {
    if (next === 'manual' && picked.length === 0) {
      onPickManually();
      return;
    }
    setKind(next);
  };

  const optionSub = (k: ScopeKind): string => {
    const count = refsByKind[k].length;
    if (k === 'manual' && picked.length === 0) return t(`${base}.batch.scope.manualHint`);
    const parts = [t(`${base}.batch.servers`, { count })];
    if (k === 'stale') parts.push(t(`${base}.batch.scope.staleHint`));
    if (k === kind && preview.data)
      parts.push(t(`${base}.batch.minutes`, { count: preview.data.estimated_minutes }));
    return parts.join(' · ');
  };

  const advancedSummary = `${[probes.icmp && 'ICMP', probes.tcp && 'TCP', probes.sni && 'TLS-SNI'].filter(Boolean).join(', ')} · SNI ${sniText}`;

  return (
    <ResponsiveSheet isOpen={isOpen} onClose={onClose} title={t(`${base}.batch.title`)}>
      <div className="space-y-4">
        <div role="radiogroup" aria-label={t(`${base}.batch.title`)} className="space-y-2">
          {KINDS.map((k) => {
            const active = k === kind;
            const disabled = k !== 'manual' && refsByKind[k].length === 0;
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={disabled}
                onClick={() => pick(k)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50',
                  active
                    ? 'border-accent-500/60 bg-accent-500/10'
                    : 'border-dark-700/40 hover:bg-dark-800/40',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border',
                    active ? 'border-[5px] border-accent-500 bg-white' : 'border-dark-500',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-dark-100">
                    {t(`${base}.batch.scope.${k}`)}
                  </span>
                  <span className="block text-xs text-dark-400">
                    {disabled ? t(`${base}.batch.nothingToCheck`) : optionSub(k)}
                  </span>
                </span>
                {active && preview.isLoading && <Skeleton className="h-4 w-20" />}
                {active && price && (
                  <span className="text-[13px] font-semibold tabular-nums text-dark-200">
                    {price}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <UnitsSummary
          kind="probe"
          selected={manualUnits ?? autoKeys}
          auto={manualUnits === null}
          onChange={setManualUnits}
          onReset={() => setManualUnits(null)}
        />

        <div className="space-y-3">
          <button
            type="button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left text-[13px] text-dark-400 hover:text-dark-200"
          >
            <span>{t(`${base}.batch.advanced`, { summary: advancedSummary })}</span>
            <ChevronDownIcon
              className={cn('h-4 w-4 shrink-0 transition-transform', advanced && 'rotate-180')}
            />
          </button>
          {advanced && (
            <div className="space-y-3">
              <ProbesRow probes={probes} onChange={setProbes} />
              <SniHostsField value={sniText} onChange={setSniText} autoNames={[]} />
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-dark-700/40 pt-3 text-xs text-dark-400">
          {balanceAfter !== null && (
            <p>{t(`${base}.batch.balanceAfter`, { balance: formatMoney(balanceAfter) })}</p>
          )}
          {preview.data?.warnings.map((warning) => (
            <p key={warning} className="text-warning-400">
              {warning}
            </p>
          ))}
          <p>{t(`${base}.batch.onlyChecked`)}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} className="hidden sm:inline-flex">
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            loading={run.isPending}
            disabled={body.host_refs.length === 0 || price === null}
            onClick={() => run.mutate()}
          >
            {t(`${base}.batch.run`, { price: price ?? '…' })}
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
