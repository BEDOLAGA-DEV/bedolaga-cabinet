import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { RejectedConfig, SubscriptionConfig } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { PurposeChip } from './PurposeChip';
import { CheckGlyph, ROW, ROW_BUTTON, ROW_OFF, ROW_ON } from './SelectableRow';
import { pickByPurpose } from './targetPicks';

export const MAX_CONFIGS_PER_TEST = 20;
/** С какого размера списка показывать поиск: в подписке бывает и 10 тысяч серверов. */
export const FILTER_FROM = 20;

function matches(config: SubscriptionConfig, needle: string): boolean {
  return (
    config.label.toLowerCase().includes(needle) ||
    config.target_key.toLowerCase().includes(needle) ||
    (config.sni ?? '').toLowerCase().includes(needle)
  );
}

interface SubscriptionConfigsProps {
  configs: SubscriptionConfig[];
  rejected: RejectedConfig[];
  selected: number[];
  /** Панель на что-то жалуется: истекла, отключена, трафик исчерпан. */
  note?: string | null;
  onToggle: (index: number) => void;
  onSelectMany: (indexes: number[]) => void;
  onClear: () => void;
}

/** Список серверов подписки с галочками: «✓ Все», «↺ Сбросить», «под БС» — как в оригинале. */
export function SubscriptionConfigs({
  configs,
  rejected,
  selected,
  note,
  onToggle,
  onSelectMany,
  onClear,
}: SubscriptionConfigsProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const needle = filter.trim().toLowerCase();
  // Поиск — по видимому списку работают и «Все», и «под БС»: отметить «все найденные».
  const visible = useMemo(
    () => (needle ? configs.filter((config) => matches(config, needle)) : configs),
    [configs, needle],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const atLimit = selected.length >= MAX_CONFIGS_PER_TEST;
  const room = Math.max(0, MAX_CONFIGS_PER_TEST - selected.length);
  const unselected = (list: SubscriptionConfig[]) =>
    list.filter((config) => !selectedSet.has(config.index)).slice(0, room);
  const bsUnselected = unselected(pickByPurpose(visible, 'bs'));
  const allUnselected = unselected(visible);
  // Балансировщик «АВТО» повторяет те же серверы отдельными записями — помечаем, бот при
  // запуске сведёт их к одной цели.
  const firstByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const config of configs) {
      if (!map.has(config.target_key)) map.set(config.target_key, config.index);
    }
    return map;
  }, [configs]);

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
      {note && (
        <p role="status" className="mt-2 text-xs text-warning-400">
          {note}
        </p>
      )}
      {configs.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">{t('admin.reachability.subscription.empty')}</p>
      )}
      {configs.length > FILTER_FROM && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <input
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label={t('admin.reachability.subscription.filter')}
            placeholder={t('admin.reachability.subscription.filter')}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="input min-w-0 flex-1 text-sm"
          />
          {needle && (
            <span className="text-xs text-dark-400">
              {t('admin.reachability.subscription.filterShown', {
                shown: visible.length,
                total: configs.length,
              })}
            </span>
          )}
        </div>
      )}
      {configs.length > 0 && visible.length === 0 && (
        <p className="mt-3 text-sm text-dark-400">
          {t('admin.reachability.subscription.filterNone')}
        </p>
      )}
      <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
        {visible.map((config) => {
          const checked = selectedSet.has(config.index);
          return (
            <li
              key={config.index}
              // Строки за пределами прокрутки браузер не раскладывает: список на тысячи
              // серверов открывается сразу, а не через секунды.
              className={cn(
                ROW,
                '[contain-intrinsic-size:auto_52px] [content-visibility:auto]',
                checked ? ROW_ON : ROW_OFF,
              )}
            >
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
              {firstByKey.get(config.target_key) !== config.index && (
                <span
                  title={t('admin.reachability.subscription.duplicateHint')}
                  className="rounded-md bg-dark-700/60 px-1.5 py-0.5 text-xs text-dark-300"
                >
                  {t('admin.reachability.subscription.duplicate')}
                </span>
              )}
              <PurposeChip purpose={config.purpose} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
