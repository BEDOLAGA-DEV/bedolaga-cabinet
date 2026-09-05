import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type HostTarget,
  type NodeTarget,
  type Purpose,
  reachabilityApi,
} from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { PurposeChip } from './PurposeChip';
import { SectionHeading } from './SectionHeading';
import { pickByPurpose } from './targetPicks';
import { MAX_CUSTOM_TARGETS, parseTargets } from './targetsInput';
import { useHosts, useInvalidateTargets, useNodes } from './useTargets';

export interface ProbeTargetsProps {
  hosts: HostTarget[];
  onToggleHost: (host: HostTarget) => void;
  nodes: NodeTarget[];
  onToggleNode: (node: NodeTarget) => void;
  own: string;
  onOwnChange: (text: string) => void;
  preselectedHosts?: string[];
  preselectedNodes?: string[];
}

const SHORT_LIST = 8;
const NEXT_PURPOSE: Record<Purpose, Purpose> = { bs: 'regular', regular: 'bs', unknown: 'bs' };

function matches(host: HostTarget, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [host.remark, host.address, host.sni ?? '', host.tag ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

const ROW = 'flex items-center gap-3 rounded-xl border px-3 py-1 transition-colors';
const ROW_ON = 'border-accent-500/40 bg-accent-500/10';
const ROW_OFF = 'border-dark-700/60 bg-dark-900/30 hover:border-dark-600';

function CheckGlyph({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold',
        on ? 'border-accent-500 bg-accent-500 text-on-accent' : 'border-dark-600 text-transparent',
      )}
    >
      ✓
    </span>
  );
}

/** Цели проверки хостов: хосты панели, а под «Дополнительно» ноды и свои адреса. */
export function ProbeTargets(props: ProbeTargetsProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { data: allHosts = [], isLoading, error } = useHosts(false);
  const { data: allNodes = [] } = useNodes();
  const invalidate = useInvalidateTargets();
  const preselectedApplied = useRef(false);

  // Цели из ярлыка (?target=host:<uuid>) отмечаются один раз, когда списки загрузились.
  useEffect(() => {
    if (preselectedApplied.current || (allHosts.length === 0 && allNodes.length === 0)) return;
    preselectedApplied.current = true;
    for (const uuid of props.preselectedHosts ?? []) {
      const host = allHosts.find((item) => item.uuid === uuid);
      if (host && !props.hosts.some((item) => item.uuid === uuid)) props.onToggleHost(host);
    }
    for (const uuid of props.preselectedNodes ?? []) {
      const node = allNodes.find((item) => item.uuid === uuid);
      if (node && !props.nodes.some((item) => item.uuid === uuid)) props.onToggleNode(node);
    }
  }, [allHosts, allNodes, props]);

  const setPurpose = useMutation({
    mutationFn: (input: { uuid: string; purpose: Purpose }) =>
      reachabilityApi.updatePref({
        target_kind: 'host',
        target_ref: input.uuid,
        purpose: input.purpose,
      }),
    onSuccess: invalidate,
  });

  const filtered = useMemo(
    () => allHosts.filter((host) => matches(host, search)),
    [allHosts, search],
  );
  const visible = showAll || search ? filtered : filtered.slice(0, SHORT_LIST);
  const selectedIds = new Set(props.hosts.map((host) => host.uuid));
  const bsUnselected = pickByPurpose(allHosts, 'bs').filter((host) => !selectedIds.has(host.uuid));
  const own = parseTargets(props.own);
  const total = props.hosts.length + props.nodes.length + own.targets.length;

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.sections.targets')}>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-3 h-12 w-full rounded-xl" />
        <Skeleton className="mt-2 h-12 w-full rounded-xl" />
      </SkeletonGroup>
    );
  }

  return (
    <section aria-labelledby="reachability-targets" className="space-y-3">
      <SectionHeading
        id="reachability-targets"
        title={t('admin.reachability.sections.targets')}
        hint={t('admin.reachability.switch.probeHint')}
        aside={t('admin.reachability.targets.count', { count: total })}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          className="btn-secondary min-h-[40px] px-3 text-sm"
          disabled={bsUnselected.length === 0}
          onClick={() => {
            for (const host of bsUnselected) props.onToggleHost(host);
          }}
        >
          {t('admin.reachability.targets.pickAllBs')}
        </button>
        {allHosts.length > SHORT_LIST && (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.reachability.targets.search')}
            aria-label={t('admin.reachability.targets.search')}
            className="input min-h-[40px] sm:ml-auto sm:w-64"
          />
        )}
      </div>

      {error && <p className="text-sm text-error-400">{getApiErrorMessage(error, '')}</p>}
      {!error && filtered.length === 0 && (
        <p className="text-sm text-dark-400">{t('admin.reachability.targets.empty')}</p>
      )}

      <ul className="space-y-1.5">
        {visible.map((host) => {
          const on = selectedIds.has(host.uuid);
          return (
            <li key={host.uuid} className={cn(ROW, on ? ROW_ON : ROW_OFF)}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => props.onToggleHost(host)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left"
              >
                <CheckGlyph on={on} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-dark-100">
                      {host.remark}
                    </span>
                    {host.is_disabled && (
                      <span className="shrink-0 text-xs text-dark-400">
                        {t('admin.reachability.targets.includeDisabled')}
                      </span>
                    )}
                  </span>
                  <span className="block truncate font-mono text-xs text-dark-400">
                    {host.target_key}
                    {host.sni && host.sni !== host.address ? ` · sni ${host.sni}` : ''}
                  </span>
                </span>
              </button>
              <PurposeChip
                purpose={host.purpose}
                guessed={host.purpose_guessed}
                disabled={setPurpose.isPending}
                onToggle={() =>
                  setPurpose.mutate({ uuid: host.uuid, purpose: NEXT_PURPOSE[host.purpose] })
                }
              />
            </li>
          );
        })}
      </ul>
      {setPurpose.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(setPurpose.error, '')}</p>
      )}
      {!search && filtered.length > SHORT_LIST && (
        <button
          type="button"
          className="text-sm text-accent-400 hover:underline"
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll
            ? t('admin.reachability.targets.showLess')
            : t('admin.reachability.targets.showAll', { count: filtered.length })}
        </button>
      )}

      <details className="group rounded-xl border border-dark-700/60 bg-dark-900/30">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-medium text-dark-200">
          <span>
            {t('admin.reachability.sections.more')}
            <span className="ml-2 text-xs font-normal text-dark-400">
              {t('admin.reachability.targets.nodesTitle')} ·{' '}
              {t('admin.reachability.targets.ownAddresses')}
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-dark-400 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="space-y-4 border-t border-dark-700/60 p-3">
          {allNodes.length > 0 && (
            <div>
              <p className="text-sm font-medium text-dark-200">
                {t('admin.reachability.targets.nodesTitle')}
                <span className="ml-2 text-xs font-normal text-dark-400">
                  {t('admin.reachability.targets.nodesHint')}
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {allNodes.map((node) => {
                  const on = props.nodes.some((item) => item.uuid === node.uuid);
                  return (
                    <button
                      key={node.uuid}
                      type="button"
                      aria-pressed={on}
                      onClick={() => props.onToggleNode(node)}
                      className={cn(
                        'flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-sm',
                        on ? ROW_ON : ROW_OFF,
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          node.is_connected ? 'bg-success-500' : 'bg-dark-500',
                        )}
                      />
                      <span className="text-dark-100">{node.name}</span>
                      <span className="font-mono text-xs text-dark-400">{node.address}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label htmlFor="reachability-own" className="text-sm font-medium text-dark-200">
              {t('admin.reachability.targets.ownAddresses')}
            </label>
            <textarea
              id="reachability-own"
              value={props.own}
              onChange={(event) => props.onOwnChange(event.target.value)}
              rows={2}
              placeholder={t('admin.reachability.targets.ownPlaceholder')}
              className="input mt-1 w-full font-mono text-sm"
            />
            <p className="mt-1 text-xs text-dark-400">
              {t('admin.reachability.targets.ownHint')} · {MAX_CUSTOM_TARGETS}
            </p>
            {own.overLimit > 0 && (
              <p className="mt-1 text-xs text-warning-400">
                {t('admin.reachability.targets.overLimit', { count: own.overLimit })}
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
