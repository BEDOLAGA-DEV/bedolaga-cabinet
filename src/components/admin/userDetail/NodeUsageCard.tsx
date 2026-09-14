import { useTranslation } from 'react-i18next';
import type { UserNodeUsageItem } from '@/api/adminUsers';
import { Card } from '@/components/data-display';
import { ChartIcon, RefreshIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getFlagEmoji } from '../../../utils/subscriptionHelpers';

const PERIODS = [1, 3, 7, 14, 30] as const;

interface NodeUsageCardProps {
  days: number;
  onDaysChange: (days: number) => void;
  items: (UserNodeUsageItem & { total_bytes: number })[];
  onRefresh: () => void;
  formatBytes: (bytes: number) => string;
}

/** Расход по нодам за период: полосы относительно самой нагруженной ноды. */
export function NodeUsageCard({
  days,
  onDaysChange,
  items,
  onRefresh,
  formatBytes,
}: NodeUsageCardProps) {
  const { t } = useTranslation();
  const max = items[0]?.total_bytes ?? 0;

  return (
    <Card size="md" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <ChartIcon className="h-5 w-5 text-accent-400" />
        <h2 className="min-w-[10rem] flex-1 text-lg font-semibold text-dark-100">
          {t('admin.users.detail.nodeUsage')}
        </h2>
        <div className="flex items-center gap-1 rounded-xl bg-dark-800 p-0.5">
          {PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onDaysChange(period)}
              aria-pressed={days === period}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                days === period ? 'bg-dark-700 text-dark-100' : 'text-dark-500 hover:text-dark-300',
              )}
            >
              {t('admin.users.detail.subscription.periodDays', { count: period })}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t('common.refresh')}
          className="btn-ghost p-1.5"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item.node_uuid} className="flex flex-col gap-1">
              <div className="flex justify-between text-xs">
                <span className="text-dark-300">
                  {item.country_code && (
                    <span className="mr-1">{getFlagEmoji(item.country_code)}</span>
                  )}
                  {item.node_name}
                </span>
                <span className="tabular-nums text-dark-400">{formatBytes(item.total_bytes)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-dark-800">
                <div
                  className="h-full rounded-full bg-accent-500/70"
                  style={{ width: `${max > 0 ? (item.total_bytes / max) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-dark-500">{t('admin.users.detail.subscription.noNodeUsage')}</p>
      )}
    </Card>
  );
}
