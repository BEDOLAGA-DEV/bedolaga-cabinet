import { useTranslation } from 'react-i18next';
import type { TrafficAccountingSummary } from '@/types';
import { formatTraffic } from '@/utils/formatTraffic';
import { uiLocale } from '@/utils/uiLocale';

interface Props {
  subscription: TrafficAccountingSummary;
  refreshed?: TrafficAccountingSummary | null;
  className?: string;
}

const isBalance = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

export default function ManagedTrafficSummary({ subscription, refreshed, className = '' }: Props) {
  const { t } = useTranslation();
  const latest = <K extends keyof TrafficAccountingSummary>(key: K) =>
    refreshed?.[key] !== undefined ? refreshed[key] : subscription[key];
  const remaining = latest('traffic_remaining_gb');
  const base = latest('base_traffic_remaining_gb');
  const next = latest('next_traffic_refresh_at');
  if (latest('traffic_accounting_mode') !== 'managed') return null;
  const nextDate = next ? new Date(next) : null;
  const rows = [
    {
      key: 'available',
      value: isBalance(remaining) ? formatTraffic(remaining) : '—',
      prominent: true,
    },
    ...(isBalance(base)
      ? [{ key: 'baseRemaining', value: formatTraffic(base), prominent: false }]
      : []),
    ...(nextDate && Number.isFinite(nextDate.getTime())
      ? [
          {
            key: 'nextRefresh',
            value: nextDate.toLocaleDateString(uiLocale(), {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
            prominent: false,
          },
        ]
      : []),
  ];
  return (
    <dl
      className={`mt-4 space-y-2 text-sm ${className}`}
      aria-label={t('subscription.accounting.label')}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
        >
          <dt className="min-w-0 text-dark-300">{t(`subscription.accounting.${row.key}`)}</dt>
          <dd
            className={`min-w-0 break-words text-end tabular-nums text-dark-50 ${row.prominent ? 'font-semibold' : ''}`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
