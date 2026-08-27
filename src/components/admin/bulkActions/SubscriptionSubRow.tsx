import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CheckIcon } from '@/components/icons';
import type { UserListItemSubscription } from '../../../api/adminUsers';

// ──────────────────────────────────────────────────────────────────
// SubscriptionSubRow + StatusBadge
//
// SubscriptionSubRow: the expanded per-user secondary <tr> rendered
// under a user row when the operator drills into multi-subscription
// users. Shows tariff, status, days remaining, traffic bar, devices.
//
// StatusBadge: the pill used both inside the sub-row and in the
// primary user-table column (subscription_status). Co-located here
// because both consumers want the same visual contract.
// ──────────────────────────────────────────────────────────────────

export interface SubscriptionSubRowProps {
  subscription: UserListItemSubscription;
  isSelected: boolean;
  onToggleSelect: () => void;
  isMultiTariff: boolean;
}

export function SubscriptionSubRow({
  subscription,
  isSelected,
  onToggleSelect,
  isMultiTariff,
}: SubscriptionSubRowProps) {
  const { t } = useTranslation();

  const days = subscription.days_remaining;
  const daysColor =
    days === 0 ? 'text-error-400' : days <= 7 ? 'text-warning-400' : 'text-success-400';

  const trafficPercent =
    subscription.traffic_limit_gb > 0
      ? Math.min(100, (subscription.traffic_used_gb / subscription.traffic_limit_gb) * 100)
      : 0;
  const trafficBarColor =
    trafficPercent >= 90
      ? 'bg-error-400'
      : trafficPercent >= 70
        ? 'bg-warning-400'
        : 'bg-accent-400';

  return (
    <tr
      className={cn(
        'border-b border-dark-700/30 transition-colors',
        isSelected ? 'bg-accent-500/8' : 'bg-dark-850/40 hover:bg-dark-800/60',
      )}
    >
      <td className="px-3 py-2">
        {isMultiTariff && (
          <div className="flex items-center justify-center">
            <button
              onClick={onToggleSelect}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                isSelected
                  ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                  : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
              )}
              aria-label={
                isSelected
                  ? t('admin.bulkActions.deselectUser', { name: subscription.tariff_name || '' })
                  : t('admin.bulkActions.selectUser', { name: subscription.tariff_name || '' })
              }
            >
              {isSelected && <CheckIcon className="h-3 w-3 text-white" />}
            </button>
          </div>
        )}
      </td>

      <td colSpan={7} className="px-3 py-2">
        <div className="flex items-center gap-3 pl-9">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-dark-500" aria-hidden="true">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-dark-200">
              {subscription.tariff_name || '—'}
            </span>
          </div>

          <StatusBadge status={subscription.status} />

          <span className={cn('text-xs font-medium tabular-nums', daysColor)}>
            {days}
            <span className="ml-0.5 text-[10px] font-normal text-dark-500">
              {t('admin.bulkActions.daysUnit')}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-dark-400">
              {subscription.traffic_used_gb.toFixed(1)} {t('admin.bulkActions.trafficOf')}{' '}
              {subscription.traffic_limit_gb} {t('admin.bulkActions.trafficGbUnit')}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-dark-700/60">
              <div
                className={cn('h-full rounded-full transition-all duration-300', trafficBarColor)}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
          </div>

          <span className="flex items-center gap-1 text-xs text-dark-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            {subscription.device_limit}
          </span>
        </div>
      </td>
    </tr>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();

  const config: Record<string, { class: string; labelKey: string }> = {
    active: {
      class: 'border-success-500/30 bg-success-500/15 text-success-400',
      labelKey: 'admin.bulkActions.statuses.active',
    },
    expired: {
      class: 'border-error-500/30 bg-error-500/15 text-error-400',
      labelKey: 'admin.bulkActions.statuses.expired',
    },
    trial: {
      class: 'border-warning-500/30 bg-warning-500/15 text-warning-400',
      labelKey: 'admin.bulkActions.statuses.trial',
    },
    limited: {
      class: 'border-warning-500/30 bg-warning-500/15 text-warning-400',
      labelKey: 'admin.bulkActions.statuses.limited',
    },
    disabled: {
      class: 'border-dark-500/30 bg-dark-500/15 text-dark-400',
      labelKey: 'admin.bulkActions.statuses.disabled',
    },
  };

  const c = config[status || ''] || config.disabled;

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight',
        c.class,
      )}
    >
      {t(c.labelKey, status || '')}
    </span>
  );
}
