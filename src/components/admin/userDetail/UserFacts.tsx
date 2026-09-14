import { useTranslation } from 'react-i18next';
import type { UserDetailResponse, UserSubscriptionInfo } from '@/api/adminUsers';
import { useMoney, useTrafficLabel } from '@/components/admin/users';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';

interface UserFactsProps {
  user: UserDetailResponse;
  subscription: UserSubscriptionInfo | null;
  devicesTotal: number | null;
}

interface Fact {
  key: string;
  label: string;
  value: string;
  note?: string;
  /** На телефоне прячется: сетка 2×2, «Потрачено» есть во вкладке «Баланс». */
  wideOnly?: boolean;
}

/** Факты под шапкой: баланс, срок, трафик, устройства, потрачено. */
export function UserFacts({ user, subscription, devicesTotal }: UserFactsProps) {
  const { t } = useTranslation();
  const money = useMoney();
  const trafficLabel = useTrafficLabel();

  const facts: Fact[] = [
    {
      key: 'balance',
      label: t('admin.users.detail.facts.balance'),
      value: money(user.balance_rubles),
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
        ? trafficLabel(subscription.traffic_used_gb, subscription.traffic_limit_gb)
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
      value: money(user.total_spent_kopeks / 100),
      note: t('admin.users.purchaseCount', { count: user.purchase_count }),
      wideOnly: true,
    },
  ];

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40 md:grid-cols-5">
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          className={cn(
            'min-w-0 flex-col gap-0.5 border-dark-800 px-4 py-3',
            fact.wideOnly ? 'hidden md:flex' : 'flex',
            // Телефон 2×2: правая граница у левой колонки, нижняя у первой строки.
            index % 2 === 0 && 'border-r',
            index < 2 && 'border-b md:border-b-0',
            'md:border-r md:last:border-r-0',
          )}
        >
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-dark-500">
            {fact.label}
          </dt>
          <dd className="m-0 truncate text-base font-semibold tabular-nums text-dark-100">
            {fact.value}
            {fact.note && (
              <span className="ml-1.5 text-xs font-medium text-dark-400">{fact.note}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
