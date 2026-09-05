import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type HostTarget, type Purpose, reachabilityApi } from '@/api/reachability';
import { Toggle } from '@/components/admin/Toggle';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Card } from '@/components/data-display';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { PurposeChip } from './PurposeChip';
import { pickByPurpose } from './targetPicks';
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
  const bsUnselected = pickByPurpose(visible, 'bs').filter((host) => !selectedIds.has(host.uuid));
  const purposeOptions = PURPOSES.map((purpose) => ({
    value: purpose,
    label: t(`admin.reachability.purpose.${purpose}`),
  }));

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.targets.hosts')}>
        <Skeleton variant="card" className="h-40 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }

  return (
    <Card size="md">
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
        <div className="flex items-center gap-2 text-xs text-dark-300">
          <span>{t('admin.reachability.targets.includeDisabled')}</span>
          <Toggle
            checked={includeDisabled}
            onChange={() => setIncludeDisabled((value) => !value)}
            aria-label={t('admin.reachability.targets.includeDisabled')}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={bsUnselected.length === 0}
          onClick={() => {
            for (const host of bsUnselected) onToggle(host);
          }}
        >
          {t('admin.reachability.targets.pickBs', { count: bsUnselected.length })}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-error-400">{getApiErrorMessage(error, '')}</p>}
      {!error && visible.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.targets.empty')}</p>
      )}

      <ul className="mt-2 divide-y divide-dark-700/60">
        {visible.map((host) => (
          <li key={host.uuid} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
            <label className="flex w-full min-w-0 cursor-pointer items-center gap-3 sm:w-auto sm:flex-1">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-dark-600 accent-accent-500"
                checked={selectedIds.has(host.uuid)}
                onChange={() => onToggle(host)}
              />
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-medium text-dark-100">{host.remark}</span>
                  <PurposeChip purpose={host.purpose} guessed={host.purpose_guessed} />
                  {host.is_disabled && (
                    <span className="shrink-0 text-xs text-dark-400">
                      {t('admin.reachability.targets.includeDisabled')}
                    </span>
                  )}
                </span>
                <span className="block break-all font-mono text-xs text-dark-400">
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
              <label className="w-44">
                <span className="sr-only">{t('admin.reachability.targets.purposeLabel')}</span>
                <DropdownSelect
                  value={host.purpose}
                  options={purposeOptions}
                  onChange={(value) =>
                    setPurpose.mutate({ uuid: host.uuid, purpose: value as Purpose })
                  }
                />
              </label>
            </div>
          </li>
        ))}
      </ul>
      {setPurpose.isError && (
        <p className="mt-2 text-sm text-error-400">{getApiErrorMessage(setPurpose.error, '')}</p>
      )}
    </Card>
  );
}
