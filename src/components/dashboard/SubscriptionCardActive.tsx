import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import { useTheme } from '../../hooks/useTheme';
import { formatTraffic } from '../../utils/formatTraffic';
import { getGlassColors } from '../../utils/glassTheme';
import { useHaptic } from '../../platform';
import type { Subscription } from '../../types';

interface SubscriptionCardActiveProps {
  subscription: Subscription;
  trafficData: {
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null;
  refreshTrafficMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trafficRefreshCooldown: number;
  connectedDevices: number;
}

const RefreshIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

export default function SubscriptionCardActive({
  subscription,
  trafficData,
  refreshTrafficMutation,
  trafficRefreshCooldown,
  connectedDevices,
}: SubscriptionCardActiveProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const usedPercent = trafficData?.traffic_used_percent ?? subscription.traffic_used_percent;
  const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
  const isUnlimited = trafficData?.is_unlimited ?? subscription.traffic_limit_gb === 0;
  const haptic = useHaptic();

  const isAtDeviceLimit =
    subscription.device_limit > 0 && connectedDevices >= subscription.device_limit;

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();
  const daysLeft = subscription.days_left;
  const safePercent = Math.min(Math.max(usedPercent, 0), 100);
  const trafficLabel = isUnlimited
    ? t('dashboard.simple.unlimitedTraffic')
    : t('dashboard.simple.trafficUsed', {
        used: formatTraffic(usedGb),
        limit: formatTraffic(subscription.traffic_limit_gb),
      });

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: g.cardBg,
        border: `1px solid ${g.cardBorder}`,
        padding: '24px',
        boxShadow: g.shadow,
      }}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success-500/15 text-success-400">
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-tight text-dark-50">
            {t('dashboard.simple.activeTitle')}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-dark-300">
            {t('dashboard.simple.activeDescription', {
              tariff: subscription.tariff_name || t('subscription.currentPlan'),
              date: formattedDate,
            })}
          </p>
          {subscription.is_trial && (
            <p className="mt-2 inline-flex rounded-full bg-accent-500/15 px-3 py-1 text-sm font-semibold text-accent-300">
              {t('subscription.trialStatus')}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div>
          <div className="text-sm text-dark-400">{t('dashboard.simple.daysLeft')}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none text-dark-50">{daysLeft}</span>
            <span className="text-base font-semibold text-dark-300">
              {t('subscription.daysShort')}
            </span>
          </div>
        </div>
        <div>
          <div className="text-sm text-dark-400">{t('dashboard.simple.connectedDevices')}</div>
          <div className="mt-1 text-4xl font-bold leading-none text-dark-50">
            {subscription.device_limit === 0
              ? connectedDevices
              : `${connectedDevices}/${subscription.device_limit}`}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-dark-300">{t('dashboard.simple.traffic')}</span>
          <span className="text-right text-sm text-dark-400">{trafficLabel}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-dark-700/60">
          <div
            className="h-full rounded-full bg-accent-400 transition-all duration-500"
            style={{ width: isUnlimited ? '100%' : `${safePercent}%` }}
          />
        </div>
      </div>

      {subscription.subscription_url && (
        <button
          type="button"
          disabled={isAtDeviceLimit}
          onClick={() => {
            if (isAtDeviceLimit) {
              haptic.notification('error');
              return;
            }
            navigate(`/connection?sub=${subscription.id}`);
          }}
          className={`mb-3 flex w-full items-center justify-center gap-3 rounded-2xl bg-accent-500 px-5 py-4 text-lg font-bold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50`}
          data-onboarding="connect-devices"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M12 18v3M8 21h8" />
          </svg>
          {t('dashboard.simple.connectMain')}
        </button>
      )}

      {isAtDeviceLimit && (
        <p className="mb-3 rounded-xl bg-warning-500/10 p-3 text-center text-sm font-medium text-warning-300">
          {t('dashboard.deviceLimitReached')}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          to={`/subscriptions/${subscription.id}`}
          className="flex flex-1 items-center justify-center rounded-xl border border-dark-700/60 px-4 py-3 text-base font-semibold text-dark-200"
        >
          {t('dashboard.simple.details')}
        </Link>
        <button
          type="button"
          onClick={() => refreshTrafficMutation.mutate()}
          disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-dark-700/60 px-4 py-3 text-base font-semibold text-dark-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('common.refresh')}
        >
          <RefreshIcon
            className={`h-4 w-4 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
          />
          {trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
        </button>
      </div>
    </div>
  );
}
