import { useTranslation } from 'react-i18next';
import type { RejectedConfig, SubscriptionConfig } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { PurposeChip } from './PurposeChip';
import { CheckGlyph, ROW, ROW_BUTTON, ROW_OFF, ROW_ON } from './SelectableRow';
import { pickByPurpose } from './targetPicks';

export const MAX_CONFIGS_PER_TEST = 20;

interface SubscriptionConfigsProps {
  configs: SubscriptionConfig[];
  rejected: RejectedConfig[];
  selected: number[];
  onToggle: (index: number) => void;
  onSelectMany: (indexes: number[]) => void;
  onClear: () => void;
}

/** Список серверов подписки с галочками: «✓ Все», «↺ Сбросить», «под БС» — как в оригинале. */
export function SubscriptionConfigs({
  configs,
  rejected,
  selected,
  onToggle,
  onSelectMany,
  onClear,
}: SubscriptionConfigsProps) {
  const { t } = useTranslation();
  const atLimit = selected.length >= MAX_CONFIGS_PER_TEST;
  const room = Math.max(0, MAX_CONFIGS_PER_TEST - selected.length);
  const unselected = (list: SubscriptionConfig[]) =>
    list.filter((config) => !selected.includes(config.index)).slice(0, room);
  const bsUnselected = unselected(pickByPurpose(configs, 'bs'));
  const allUnselected = unselected(configs);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-dark-400">
        <span>
          {t('admin.reachability.subscription.selectedOf', {
            selected: selected.length,
            total: configs.length,
          })}
        </span>
        {rejected.length > 0 && (
          <span title={rejected.map((item) => `${item.reason}: ${item.preview}`).join('\n')}>
            {t('admin.reachability.subscription.rejected', { count: rejected.length })}
          </span>
        )}
        {atLimit && (
          <span className="text-warning-400">{t('admin.reachability.subscription.limit')}</span>
        )}
        <span className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={allUnselected.length === 0}
            onClick={() => onSelectMany(allUnselected.map((config) => config.index))}
          >
            {t('admin.reachability.subscription.pickAll')}
          </button>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={bsUnselected.length === 0}
            onClick={() => onSelectMany(bsUnselected.map((config) => config.index))}
          >
            {t('admin.reachability.subscription.pickBs', { count: bsUnselected.length })}
          </button>
          <button
            type="button"
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={selected.length === 0}
            onClick={onClear}
          >
            {t('admin.reachability.subscription.pickNone')}
          </button>
        </span>
      </div>
      {configs.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.subscription.empty')}</p>
      )}
      <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
        {configs.map((config) => {
          const checked = selected.includes(config.index);
          return (
            <li key={config.index} className={cn(ROW, checked ? ROW_ON : ROW_OFF)}>
              <button
                type="button"
                aria-pressed={checked}
                disabled={!checked && atLimit}
                onClick={() => onToggle(config.index)}
                className={cn(ROW_BUTTON, 'disabled:opacity-50')}
              >
                <CheckGlyph on={checked} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-dark-100">
                    {config.label}
                  </span>
                  <span className="block truncate font-mono text-xs text-dark-400">
                    {config.protocol ? `${config.protocol} · ` : ''}
                    {config.target_key}
                    {config.sni && config.sni !== config.address ? ` · sni ${config.sni}` : ''}
                  </span>
                </span>
              </button>
              <PurposeChip purpose={config.purpose} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
