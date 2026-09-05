import { useTranslation } from 'react-i18next';
import type { SubscriptionConfigs as SubscriptionConfigsData } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { PurposeChip } from './PurposeChip';
import { pickByPurpose } from './targetPicks';

export const MAX_CONFIGS_PER_TEST = 20;

interface SubscriptionConfigsProps {
  data: SubscriptionConfigsData | undefined;
  isLoading: boolean;
  error: unknown;
  selected: number[];
  onToggle: (index: number) => void;
}

export function SubscriptionConfigs({
  data,
  isLoading,
  error,
  selected,
  onToggle,
}: SubscriptionConfigsProps) {
  const { t } = useTranslation();
  const atLimit = selected.length >= MAX_CONFIGS_PER_TEST;

  if (isLoading) {
    return (
      <SkeletonGroup aria-label={t('admin.reachability.subscription.title')}>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </SkeletonGroup>
    );
  }
  if (error) {
    return <p className="text-sm text-error-400">{getApiErrorMessage(error, '')}</p>;
  }
  if (!data) return null;

  const bsUnselected = pickByPurpose(data.configs, 'bs')
    .filter((config) => !selected.includes(config.index))
    .slice(0, Math.max(0, MAX_CONFIGS_PER_TEST - selected.length));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-dark-400">
        <span>{t('admin.reachability.subscription.configs', { count: data.configs.length })}</span>
        {data.rejected.length > 0 && (
          <span title={data.rejected.map((item) => `${item.reason}: ${item.preview}`).join('\n')}>
            {t('admin.reachability.subscription.rejected', { count: data.rejected.length })}
          </span>
        )}
        {atLimit && (
          <span className="text-warning-400">{t('admin.reachability.subscription.limit')}</span>
        )}
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={bsUnselected.length === 0}
          onClick={() => {
            for (const config of bsUnselected) onToggle(config.index);
          }}
        >
          {t('admin.reachability.subscription.pickBs', { count: bsUnselected.length })}
        </button>
      </div>
      {data.configs.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.subscription.empty')}</p>
      )}
      <ul className="mt-3 divide-y divide-dark-700/60">
        {data.configs.map((config) => {
          const checked = selected.includes(config.index);
          return (
            <li key={config.index} className="py-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-dark-600 accent-accent-500"
                  checked={checked}
                  disabled={!checked && atLimit}
                  onChange={() => onToggle(config.index)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-dark-100">
                      {config.label}
                    </span>
                    <PurposeChip purpose={config.purpose} />
                  </span>
                  <span className="block break-all font-mono text-xs text-dark-400">
                    {config.protocol ? `${config.protocol} · ` : ''}
                    {config.target_key}
                    {config.sni && config.sni !== config.address ? ` · sni ${config.sni}` : ''}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
