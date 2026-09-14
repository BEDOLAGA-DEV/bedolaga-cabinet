import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserDetailResponse, UserSubscriptionInfo } from '@/api/adminUsers';
import {
  type ChipTone,
  SUBSCRIPTION_STATE_TONE,
  useMoney,
  useTrafficLabel,
} from '@/components/admin/users';
import {
  CalendarIcon,
  DevicesIcon,
  ReceiptIcon,
  TrafficIcon,
  WalletIcon,
} from '@/components/icons';
import { StatCard } from '@/components/stats';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';

interface UserFactsProps {
  user: UserDetailResponse;
  subscription: UserSubscriptionInfo | null;
  devicesTotal: number | null;
}

interface Tile {
  key: string;
  label: string;
  value: string;
  subValue?: string;
  icon: ReactNode;
  tone: ChipTone;
  /** На телефоне — во всю ширину: пятая плитка в сетке 2×2. */
  wide?: boolean;
}

const TRAFFIC_WARN_SHARE = 0.8;

function trafficTone(usedGb: number, limitGb: number): ChipTone {
  if (limitGb <= 0) return 'accent';
  const share = usedGb / limitGb;
  if (share >= 1) return 'error';
  return share >= TRAFFIC_WARN_SHARE ? 'warning' : 'accent';
}

/**
 * Плитки под шапкой — тот же `StatCard` с иконкой, что на остальных страницах админки:
 * баланс, подписка (тариф и состояние подписью), трафик, устройства, потрачено.
 * Цветом говорит только иконка; числа — обычным текстом, чтобы не пестрило.
 */
export function UserFacts({ user, subscription, devicesTotal }: UserFactsProps) {
  const { t } = useTranslation();
  const money = useMoney();
  const trafficLabel = useTrafficLabel();
  const ns = 'admin.users.detail.facts';

  const tariff = subscription?.tariff_name ?? t('admin.users.detail.subscription.notSpecified');
  // Сначала то, что важнее: сколько осталось (или что с подпиской), потом тариф —
  // на телефоне плитка узкая, и обрезается хвост, а не дни.
  const stateKey =
    subscription && subscription.status in SUBSCRIPTION_STATE_TONE ? subscription.status : 'other';
  const subscriptionNote = subscription
    ? `${
        subscription.status === 'active' && subscription.days_remaining > 0
          ? t(`${ns}.days`, { count: subscription.days_remaining })
          : t(`admin.users.subscriptionState.${stateKey}`)
      } · ${tariff}`
    : undefined;
  const devicesFull =
    subscription !== null && devicesTotal !== null && devicesTotal >= subscription.device_limit;

  const tiles: Tile[] = [
    {
      key: 'balance',
      label: t(`${ns}.balance`),
      value: money(user.balance_rubles),
      icon: <WalletIcon />,
      tone: 'accent',
    },
    {
      key: 'until',
      label: t(`${ns}.until`),
      value: subscription?.end_date
        ? formatShortDate(subscription.end_date)
        : t(`${ns}.noSubscription`),
      subValue: subscriptionNote,
      icon: <CalendarIcon />,
      tone: subscription ? (SUBSCRIPTION_STATE_TONE[subscription.status] ?? 'neutral') : 'neutral',
    },
    {
      key: 'traffic',
      label: t(`${ns}.traffic`),
      value: subscription
        ? trafficLabel(subscription.traffic_used_gb, subscription.traffic_limit_gb)
        : '—',
      icon: <TrafficIcon />,
      tone: subscription
        ? trafficTone(subscription.traffic_used_gb, subscription.traffic_limit_gb)
        : 'neutral',
    },
    {
      key: 'devices',
      label: t(`${ns}.devices`),
      value:
        subscription && devicesTotal !== null
          ? t(`${ns}.devicesValue`, { used: devicesTotal, limit: subscription.device_limit })
          : '—',
      icon: <DevicesIcon />,
      tone: devicesFull ? 'warning' : 'neutral',
    },
    {
      key: 'spent',
      label: t(`${ns}.spent`),
      value: money(user.total_spent_kopeks / 100),
      subValue: t('admin.users.purchaseCount', { count: user.purchase_count }),
      icon: <ReceiptIcon />,
      tone: 'neutral',
      wide: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <div key={tile.key} className={cn('min-w-0', tile.wide && 'col-span-2 lg:col-span-1')}>
          <StatCard
            label={tile.label}
            value={tile.value}
            subValue={tile.subValue}
            icon={tile.icon}
            tone={tile.tone}
            valueClassName="text-dark-100 tabular-nums"
          />
        </div>
      ))}
    </div>
  );
}
