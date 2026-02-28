import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import TrafficProgressBar from './TrafficProgressBar';
import Sparkline from './Sparkline';
import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { useTheme } from '../../hooks/useTheme';
import { getTrafficZone } from '../../utils/trafficZone';
import { formatTraffic } from '../../utils/formatTraffic';
import { getGlassColors } from '../../utils/glassTheme';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
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
  const zone = useMemo(() => getTrafficZone(usedPercent), [usedPercent]);
  const animatedPercent = useAnimatedNumber(usedPercent);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();
  const daysLeft = subscription.days_left;

  // Sparkline placeholder data (hidden until API provides daily usage)
  const dailyUsage: number[] = [];

  return (
    <div
      className="relative overflow-hidden rounded-3xl backdrop-blur-xl"
      style={{
        background: g.cardBg,
        border: subscription.is_trial
          ? '1px solid rgba(62,219,176,0.15)'
          : isDark
            ? `1px solid ${g.cardBorder}`
            : `1px solid ${zone.mainHex}25`,
        padding: '28px 28px 24px',
        boxShadow: isDark ? g.shadow : `0 2px 16px ${zone.mainHex}12, 0 0 0 1px ${zone.mainHex}08`,
      }}
    >
      {/* Trial shimmer border */}
      {subscription.is_trial && (
        <div
          className="pointer-events-none absolute inset-[-1px] animate-trial-glow rounded-3xl"
          aria-hidden="true"
        />
      )}

      {/* Background glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${zone.mainHex}${g.glowAlpha} 0%, transparent 70%)`,
          transition: 'background 0.8s ease',
        }}
        aria-hidden="true"
      />

      {/* ─── Header ─── */}
      <div className="mb-7 flex items-start justify-between">
        <div>
          {/* Zone indicator */}
          <div className="mb-1 flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: zone.mainHex,
                boxShadow: `0 0 8px ${zone.mainHex}80`,
                transition: 'all 0.6s ease',
              }}
              aria-hidden="true"
            />
            <span
              className="font-mono text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: zone.mainHex, transition: 'color 0.6s ease' }}
            >
              {isUnlimited ? t('dashboard.unlimited') : t(zone.labelKey)}
            </span>
            {subscription.is_trial && (
              <span
                className="inline-flex animate-trial-glow items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(62,219,176,0.15), rgba(62,219,176,0.06))',
                  border: '1px solid rgba(62,219,176,0.2)',
                  color: '#3EDBB0',
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('subscription.trialStatus')}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-lg font-bold tracking-tight text-dark-50">
            {t('dashboard.trafficUsageTitle')}
          </h2>
        </div>

        {/* Big percentage / infinity */}
        <div className="text-right">
          {isUnlimited ? (
            <>
              <div
                className="font-display text-[28px] font-extrabold leading-none tracking-tight"
                style={{ color: zone.mainHex }}
              >
                &#8734;
              </div>
              <div className="mt-1 font-mono text-[11px] text-dark-50/30">
                {formatTraffic(usedGb)} {t('dashboard.usedSuffix')}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-[38px] font-extrabold leading-none tracking-tight text-dark-50">
                {animatedPercent.toFixed(0)}
                <span className="ml-px text-lg font-medium text-dark-50/35">%</span>
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-dark-50/30">
                {formatTraffic(usedGb)} / {formatTraffic(subscription.traffic_limit_gb)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── Progress Bar ─── */}
      <div className="mb-6">
        <TrafficProgressBar
          usedGb={usedGb}
          limitGb={subscription.traffic_limit_gb}
          percent={usedPercent}
          isUnlimited={isUnlimited}
        />
      </div>

      {/* ─── Connect Device Button ─── */}
      {subscription.subscription_url && (
        <HoverBorderGradient
          as="button"
          accentColor={zone.mainHex}
          onClick={() => navigate('/connection')}
          className="mb-2.5 flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition-shadow duration-300"
          data-onboarding="connect-devices"
          style={{ fontFamily: 'inherit' }}
        >
          {/* Monitor icon */}
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] transition-colors duration-500"
            style={{ background: `${zone.mainHex}12` }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={zone.mainHex}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M12 17v4M8 21h8" />
              <path d="M12 8v4M10 10h4" opacity="0.7" />
            </svg>
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold tracking-tight text-dark-50">
              {t('dashboard.connectDevice')}
            </div>
            <div className="mt-0.5 text-[11px] text-dark-50/30">
              {t('dashboard.devicesOfMax', {
                used: connectedDevices,
                max: subscription.device_limit,
              })}
            </div>
          </div>

          {/* Device indicator */}
          {subscription.device_limit <= 10 ? (
            <div className="flex flex-shrink-0 gap-1.5" aria-hidden="true">
              {Array.from({ length: subscription.device_limit }, (_, i) => (
                <div
                  key={i}
                  className="h-[7px] w-[7px] rounded-full transition-all duration-300"
                  style={{
                    background: i < connectedDevices ? zone.mainHex : g.textGhost,
                    boxShadow: i < connectedDevices ? `0 0 6px ${zone.mainHex}50` : 'none',
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex w-16 flex-shrink-0 items-center" aria-hidden="true">
              <div
                className="h-[6px] w-full overflow-hidden rounded-full"
                style={{ background: g.textGhost }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round((connectedDevices / subscription.device_limit) * 100)}%`,
                    background: zone.mainHex,
                    boxShadow: `0 0 8px ${zone.mainHex}40`,
                    minWidth: connectedDevices > 0 ? '4px' : '0px',
                  }}
                />
              </div>
            </div>
          )}
        </HoverBorderGradient>
      )}

      {/* ─── Stats row: Tariff + Days Left ─── */}
      <div className="mb-5 flex gap-2.5">
        {/* Tariff badge — clickable */}
        <Link
          to="/subscription"
          className="flex-1 rounded-[14px] p-3.5 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${zone.mainHex}12, ${zone.mainHex}06)`,
            border: `1px solid ${zone.mainHex}18`,
          }}
        >
          <div
            className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70 transition-colors duration-500"
            style={{ color: zone.mainHex }}
          >
            {t('dashboard.tariff')}
          </div>
          <div className="text-base font-bold leading-tight tracking-tight text-dark-50">
            {subscription.tariff_name || t('subscription.currentPlan')}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-dark-50/30">
            {t('dashboard.validUntil', { date: formattedDate })}
          </div>
        </Link>

        {/* Days remaining */}
        <div
          className="flex-1 rounded-[14px] p-3.5 transition-colors duration-300"
          style={{
            background: g.innerBg,
            border: daysLeft <= 3 ? '1px solid rgba(255,184,0,0.2)' : `1px solid ${g.innerBorder}`,
          }}
        >
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-dark-50/35">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-[7px] transition-colors duration-300"
              style={{
                background: daysLeft <= 3 ? 'rgba(255,184,0,0.1)' : g.hoverBg,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke={daysLeft <= 3 ? '#FFB800' : g.textSecondary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            {t('dashboard.remaining')}
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-[22px] font-bold tracking-tight transition-colors duration-300"
              style={{ color: daysLeft <= 3 ? '#FFB800' : g.text }}
            >
              {daysLeft}
            </span>
            <span className="text-xs font-medium text-dark-50/25">
              {t('subscription.daysShort')}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Traffic Refresh ─── */}
      <div className="mb-5 flex items-center justify-between px-0.5">
        <button
          onClick={() => refreshTrafficMutation.mutate()}
          disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-dark-50/35 transition-colors hover:bg-dark-50/[0.05] hover:text-dark-50/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('common.refresh')}
        >
          <RefreshIcon
            className={`h-3 w-3 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
          />
          {trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
        </button>
        <Link
          to="/subscription"
          className="text-[11px] font-medium text-dark-50/25 transition-colors hover:text-dark-50/40"
        >
          {t('dashboard.viewSubscription')} &rarr;
        </Link>
      </div>

      {/* ─── Sparkline ─── */}
      {dailyUsage.length >= 2 && (
        <div
          className="rounded-[14px] p-3.5 pb-3"
          style={{ background: g.innerBg, border: `1px solid ${g.innerBorder}` }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-dark-50/40">
              {t('dashboard.usageLast14Days')}
            </span>
            <span className="font-mono text-[11px] text-dark-50/25">
              {t('dashboard.maxUsage', { amount: formatTraffic(Math.max(...dailyUsage)) })}
            </span>
          </div>
          <Sparkline data={dailyUsage} width={440} height={44} color={zone.mainHex} />
        </div>
      )}
    </div>
  );
}
