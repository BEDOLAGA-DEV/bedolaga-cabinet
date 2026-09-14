import { useTranslation } from 'react-i18next';
import type { UserDetailResponse, UserSubscriptionInfo } from '@/api/adminUsers';
import { useCurrency } from '@/hooks/useCurrency';
import { formatShortDate } from '@/utils/format';
import { formatTraffic } from '@/utils/formatTraffic';

interface UserFactsProps {
  user: UserDetailResponse;
  subscription: UserSubscriptionInfo | null;
  devicesTotal: number | null;
}

/** Пять фактов под шапкой: баланс, срок, трафик, устройства, потрачено. */
export function UserFacts({ user, subscription, devicesTotal }: UserFactsProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const compact = (gb: number) => formatTraffic(gb).replace(/\.0(\s)/, '$1');

  const facts: { key: string; label: string; value: string; note?: string }[] = [
    {
      key: 'balance',
      label: t('admin.users.detail.facts.balance'),
      value: formatWithCurrency(user.balance_rubles),
    },
    {
      key: 'until',
      label: t('admin.users.detail.facts.until'),
      value: subscription?.end_date
        ? formatShortDate(subscription.end_date)
        : t('admin.users.detail.facts.noSubscription'),
      note:
        subscription && subscription.days_remaining > 0
          ? t('admin.users.detail.facts.days', { count: subscription.days_remaining })
          : undefined,
    },
    {
      key: 'traffic',
      label: t('admin.users.detail.facts.traffic'),
      value: subscription
        ? subscription.traffic_limit_gb > 0
          ? `${compact(subscription.traffic_used_gb)} / ${compact(subscription.traffic_limit_gb)}`
          : `${compact(subscription.traffic_used_gb)} · ${t('admin.users.unlimited')}`
        : '—',
    },
    {
      key: 'devices',
      label: t('admin.users.detail.facts.devices'),
      value:
        subscription && devicesTotal !== null
          ? t('admin.users.detail.facts.devicesValue', {
              used: devicesTotal,
              limit: subscription.device_limit,
            })
          : '—',
    },
    {
      key: 'spent',
      label: t('admin.users.detail.facts.spent'),
      value: formatWithCurrency(user.total_spent_kopeks / 100),
      note: t('admin.users.purchaseCount', { count: user.purchase_count }),
    },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40 md:grid-cols-5">
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          className={[
            'flex flex-col gap-0.5 px-4 py-3',
            // Пятый факт на телефоне — один в ряду: растягиваем на обе колонки.
            index === facts.length - 1 && facts.length % 2 === 1
              ? 'col-span-2 md:col-span-1'
              : index % 2 === 0
                ? 'border-r border-dark-800'
                : '',
            index < facts.length - 1 ? 'border-b border-dark-800 md:border-b-0' : '',
            'md:border-r md:border-dark-800 md:last:border-r-0',
          ].join(' ')}
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-dark-500">
            {fact.label}
          </dt>
          <dd className="m-0 break-words text-base font-semibold tabular-nums text-dark-100">
            {fact.value}
            {fact.note && (
              <span className="block text-xs font-medium text-dark-400 sm:ml-1.5 sm:inline">
                {fact.note}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
