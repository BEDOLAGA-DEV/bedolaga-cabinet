import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { SALES_STATS } from '../../constants/salesStats';

export interface BreakdownItem {
  key: string;
  label: string;
  value: number;
  color?: string;
  icon?: ReactNode;
}

interface BreakdownListProps {
  title: string;
  items: BreakdownItem[];
  /** Formats the value shown on the right (e.g. money). Defaults to the raw number. */
  valueFormatter?: (value: number) => string;
}

/**
 * Categorical breakdown rendered as a ranked list instead of a bar chart:
 * icon/colour dot + label + value + share-% + a proportional mini bar. Far more
 * readable than a recharts bar for "by method / by tariff / by package" data.
 */
export function BreakdownList({ title, items, valueFormatter }: BreakdownListProps) {
  const { t } = useTranslation();

  const { sorted, total, max } = useMemo(() => {
    const sortedItems = [...items].sort((a, b) => b.value - a.value);
    const totalValue = sortedItems.reduce((sum, item) => sum + item.value, 0);
    const maxValue = sortedItems.length > 0 ? sortedItems[0].value : 0;
    return { sorted: sortedItems, total: totalValue, max: maxValue };
  }, [items]);

  return (
    <div className="bento-card">
      <h4 className="mb-3 text-sm font-semibold text-dark-200">{title}</h4>
      {sorted.length === 0 ? (
        <div className="py-6 text-center text-sm text-dark-400">{t('common.noData')}</div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((item, index) => {
            const color =
              item.color || SALES_STATS.BAR_COLORS[index % SALES_STATS.BAR_COLORS.length];
            const share = total > 0 ? (item.value / total) * 100 : 0;
            const barWidth = max > 0 ? (item.value / max) * 100 : 0;
            return (
              <div key={item.key}>
                <div className="flex items-center gap-2">
                  {item.icon ?? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-dark-200">
                    {item.label}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-dark-100">
                    {valueFormatter ? valueFormatter(item.value) : item.value}
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs tabular-nums text-dark-500">
                    {share.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-dark-800/60">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
