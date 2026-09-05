import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { NodeTarget } from '@/api/reachability';
import { Card } from '@/components/data-display';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { useNodes } from './useTargets';

interface NodesTargetListProps {
  selected: NodeTarget[];
  onToggle: (node: NodeTarget) => void;
  preselected?: string[];
}

export function NodesTargetList({ selected, onToggle, preselected = [] }: NodesTargetListProps) {
  const { t } = useTranslation();
  const { data: nodes = [], isLoading, error } = useNodes();
  const preselectedApplied = useRef(false);

  useEffect(() => {
    if (preselectedApplied.current || nodes.length === 0) return;
    preselectedApplied.current = true;
    for (const uuid of preselected) {
      const node = nodes.find((item) => item.uuid === uuid);
      if (node && !selected.some((item) => item.uuid === uuid)) onToggle(node);
    }
  }, [nodes, preselected, selected, onToggle]);

  const selectedIds = new Set(selected.map((node) => node.uuid));

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.targets.nodes')}>
        <Skeleton variant="card" className="h-24 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }

  return (
    <Card size="md">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-lg font-semibold text-dark-100">
          {t('admin.reachability.targets.nodes')}
        </h2>
        <span className="text-xs text-dark-400">{t('admin.reachability.targets.nodePing')}</span>
      </div>
      {error && <p className="mt-3 text-sm text-error-400">{getApiErrorMessage(error, '')}</p>}
      {!error && nodes.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.targets.nodesEmpty')}</p>
      )}
      <ul className="mt-2 divide-y divide-dark-700/60">
        {nodes.map((node) => (
          <li key={node.uuid} className="py-2">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-dark-600 accent-accent-500"
                checked={selectedIds.has(node.uuid)}
                onChange={() => onToggle(node)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  node.is_connected ? 'bg-success-500' : 'bg-dark-500',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-dark-100">
                  {node.name}
                </span>
                <span className="block break-all font-mono text-xs text-dark-400">
                  {node.address}
                </span>
              </span>
              <span className="shrink-0 text-xs text-dark-400">
                {t('admin.reachability.targets.nodeHosts', { count: node.host_uuids.length })}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
