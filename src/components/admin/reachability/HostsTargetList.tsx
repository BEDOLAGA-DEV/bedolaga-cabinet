import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type HostTarget, type Purpose, reachabilityApi } from '@/api/reachability';
import { Switch } from '@/components/primitives';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { useHosts, useInvalidateTargets } from './useTargets';

interface HostsTargetListProps {
  selected: HostTarget[];
  onToggle: (host: HostTarget) => void;
  preselected?: string[];
}

const PURPOSES: Purpose[] = ['bs', 'regular', 'unknown'];

function matches(host: HostTarget, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [host.remark, host.address, host.sni ?? '', host.tag ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function HostsTargetList({ selected, onToggle, preselected = [] }: HostsTargetListProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const { data: hosts = [], isLoading, error } = useHosts(includeDisabled);
  const invalidate = useInvalidateTargets();
  const preselectedApplied = useRef(false);

  // Цели из ярлыка (?target=host:<uuid>) отмечаются один раз, когда список загрузился.
  useEffect(() => {
    if (preselectedApplied.current || hosts.length === 0) return;
    preselectedApplied.current = true;
    for (const uuid of preselected) {
      const host = hosts.find((item) => item.uuid === uuid);
      if (host && !selected.some((item) => item.uuid === uuid)) onToggle(host);
    }
  }, [hosts, preselected, selected, onToggle]);

  const setPurpose = useMutation({
    mutationFn: (input: { uuid: string; purpose: Purpose }) =>
      reachabilityApi.updatePref({
        target_kind: 'host',
        target_ref: input.uuid,
        purpose: input.purpose,
      }),
    onSuccess: invalidate,
  });

  const visible = useMemo(() => hosts.filter((host) => matches(host, search)), [hosts, search]);
  const selectedIds = new Set(selected.map((host) => host.uuid));

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.targets.hosts')}>
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="mt-3 h-40 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }

  return (
    <section className="rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold text-dark-100">
          {t('admin.reachability.targets.hosts')}
        </h2>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.reachability.targets.search')}
          aria-label={t('admin.reachability.targets.search')}
          className="input w-full sm:w-56"
        />
        <Switch
          checked={includeDisabled}
          onChange={setIncludeDisabled}
          label={t('admin.reachability.targets.includeDisabled')}
        />
      </div>

      {error && <p className="mt-3 text-sm text-error-400">{getApiErrorMessage(error, '')}</p>}
      {!error && visible.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.targets.empty')}</p>
      )}

      <ul className="mt-3 divide-y divide-dark-700/60">
        {visible.map((host) => (
          <li key={host.uuid} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <label className="flex w-full min-w-0 cursor-pointer items-center gap-3 sm:w-auto sm:flex-1">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-dark-600 accent-accent-500"
                checked={selectedIds.has(host.uuid)}
                onChange={() => onToggle(host)}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-dark-100">
                  {host.remark}
                  {host.is_disabled && (
                    <span className="ml-2 text-xs text-dark-400">
                      {t('admin.reachability.targets.includeDisabled')}
                    </span>
                  )}
                </span>
                <span className="block truncate font-mono text-xs text-dark-400">
                  {host.target_key}
                  {host.sni && host.sni !== host.address ? ` · sni ${host.sni}` : ''}
                </span>
              </span>
            </label>
            <div className="flex w-full items-center justify-end gap-2 pl-7 text-xs sm:w-auto sm:pl-0">
              {host.node_uuids.length > 0 && (
                <span className="text-dark-400">
                  {t('admin.reachability.targets.nodeHosts', { count: host.node_uuids.length })}
                </span>
              )}
              {host.excluded && (
                <span className="text-warning-400">{t('admin.reachability.targets.excluded')}</span>
              )}
              {host.purpose_guessed && (
                <span className="text-dark-400">{t('admin.reachability.purpose.guessed')}</span>
              )}
              <select
                value={host.purpose}
                aria-label={t('admin.reachability.purpose.unknown')}
                disabled={setPurpose.isPending}
                onChange={(event) =>
                  setPurpose.mutate({ uuid: host.uuid, purpose: event.target.value as Purpose })
                }
                className="rounded-lg border border-dark-700 bg-dark-900 px-2 py-1 text-xs text-dark-100"
              >
                {PURPOSES.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {t(`admin.reachability.purpose.${purpose}`)}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
      {setPurpose.isError && (
        <p className="mt-2 text-sm text-error-400">{getApiErrorMessage(setPurpose.error, '')}</p>
      )}
    </section>
  );
}
