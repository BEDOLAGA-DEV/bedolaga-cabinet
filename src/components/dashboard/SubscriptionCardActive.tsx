import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import TrafficProgressBar from './TrafficProgressBar';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { getTrafficZone } from '../../utils/trafficZone';
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

const DeviceIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
    />
  </svg>
);

export default function SubscriptionCardActive({
  subscription,
  trafficData,
  refreshTrafficMutation,
  trafficRefreshCooldown,
}: SubscriptionCardActiveProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const usedPercent = trafficData?.traffic_used_percent ?? subscription.traffic_used_percent;
  const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
  const isUnlimited = trafficData?.is_unlimited ?? subscription.traffic_limit_gb === 0;
  const zone = getTrafficZone(usedPercent);
  const animatedPercent = useAnimatedNumber(usedPercent);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  return (
    <div
      className={`bento-card ${subscription.is_trial ? 'animate-trial-glow border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent' : ''}`}
    >
      {/* Top row: zone indicator + tariff info */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Animated zone dot */}
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${zone.dotClass}`}
            />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${zone.dotClass}`} />
          </span>
          <span className={`text-sm font-medium ${zone.textClass}`}>
            {isUnlimited ? t('dashboard.unlimited') : t(zone.labelKey)}
          </span>
        </div>

        <span
          className={
            subscription.is_trial
              ? 'badge-warning'
              : subscription.is_active
                ? 'badge-success'
                : 'badge-error'
          }
        >
          {subscription.is_trial
            ? t('subscription.trialStatus')
            : subscription.is_active
              ? t('subscription.active')
              : t('subscription.expired')}
        </span>
      </div>

      {/* Tariff info line */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-dark-400">
        {subscription.tariff_name && (
          <>
            <span className="text-accent-400">{subscription.tariff_name}</span>
            <span className="text-dark-600">&middot;</span>
          </>
        )}
        <span>{t('dashboard.validUntil', { date: formattedDate })}</span>
        <span className="text-dark-600">&middot;</span>
        <span>
          {subscription.device_limit} {t('subscription.devices')}
        </span>
      </div>

      {/* Big percentage or infinity */}
      <div className="mb-1 flex items-end gap-3">
        {isUnlimited ? (
          <span className="font-display text-4xl font-bold text-accent-400">&#8734;</span>
        ) : (
          <span className={`font-display text-4xl font-bold ${zone.textClass}`}>
            {animatedPercent.toFixed(1)}
            <span className="text-2xl text-dark-500">%</span>
          </span>
        )}
      </div>

      {/* Traffic used line with refresh */}
      <div className="mb-3 flex items-center gap-2">
        <span className="font-mono text-sm text-dark-400">
          {isUnlimited
            ? `${usedGb.toFixed(1)} ${t('common.units.gb')}`
            : `${usedGb.toFixed(1)} / ${subscription.traffic_limit_gb} ${t('common.units.gb')}`}
        </span>
        <button
          onClick={() => refreshTrafficMutation.mutate()}
          disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
          className="rounded-full p-1 text-dark-500 transition-colors hover:bg-dark-700/50 hover:text-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('common.refresh')}
          title={trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
        >
          <RefreshIcon
            className={`h-3.5 w-3.5 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Progress bar */}
      <TrafficProgressBar
        usedGb={usedGb}
        limitGb={subscription.traffic_limit_gb}
        percent={usedPercent}
        isUnlimited={isUnlimited}
        showScale={!isUnlimited && subscription.traffic_limit_gb > 0}
        showThresholds={!isUnlimited}
      />

      {/* Connect device button */}
      {subscription.subscription_url && (
        <div className="mt-5">
          <HoverBorderGradient
            onClick={() => navigate('/connection')}
            containerClassName="w-full"
            className="flex w-full items-center justify-center gap-3 py-3"
            data-onboarding="connect-devices"
          >
            <DeviceIcon />
            <span>{t('dashboard.connectDevice')}</span>
          </HoverBorderGradient>
        </div>
      )}

      {/* Bottom link */}
      <div className="mt-5 flex items-center justify-end">
        <Link
          to="/subscription"
          className="text-sm font-medium text-accent-400 transition-colors hover:text-accent-300"
        >
          {t('dashboard.viewSubscription')} &rarr;
        </Link>
      </div>
    </div>
  );
}
