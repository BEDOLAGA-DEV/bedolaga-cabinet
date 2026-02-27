import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { subscriptionApi } from '../api/subscription';
import TrafficProgressBar from '../components/dashboard/TrafficProgressBar';
import { HoverBorderGradient } from '../components/ui/hover-border-gradient';
import { getTrafficZone } from '../utils/trafficZone';
import { formatTraffic } from '../utils/formatTraffic';
import { getGlassColors } from '../utils/glassTheme';
import { useTheme } from '../hooks/useTheme';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { useCurrency } from '../hooks/useCurrency';
import { useCloseOnSuccessNotification } from '../store/successNotification';
import PurchaseCTAButton from '../components/subscription/PurchaseCTAButton';
import { CopyIcon, CheckIcon } from '../components/icons';
import {
  getErrorMessage,
  getInsufficientBalanceError,
  getFlagEmoji,
} from '../utils/subscriptionHelpers';

export default function Subscription() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const [copied, setCopied] = useState(false);

  // Helper to format price from kopeks
  const formatPrice = (kopeks: number) => `${formatAmount(kopeks / 100)} ${currencySymbol}`;

  // Device/traffic topup state
  const [showDeviceTopup, setShowDeviceTopup] = useState(false);
  const [devicesToAdd, setDevicesToAdd] = useState(1);
  const [showDeviceReduction, setShowDeviceReduction] = useState(false);
  const [targetDeviceLimit, setTargetDeviceLimit] = useState<number>(1);
  const [showTrafficTopup, setShowTrafficTopup] = useState(false);
  const [selectedTrafficPackage, setSelectedTrafficPackage] = useState<number | null>(null);
  const [showServerManagement, setShowServerManagement] = useState(false);
  const [selectedServersToUpdate, setSelectedServersToUpdate] = useState<string[]>([]);

  // Traffic refresh state
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0);
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null>(null);

  const { data: subscriptionResponse, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: 'always',
  });

  // Extract subscription from response (null if no subscription)
  const subscription = subscriptionResponse?.subscription ?? null;

  // Live countdown timer
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    if (!subscription?.end_date) return;
    const endTime = new Date(subscription.end_date).getTime();
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      setCountdown({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [subscription?.end_date]);

  // Purchase options (needed for balance_kopeks in device/traffic/server management)
  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options'],
    queryFn: subscriptionApi.getPurchaseOptions,
  });

  const isTariffsMode = purchaseOptions?.sales_mode === 'tariffs';

  const autopayMutation = useMutation({
    mutationFn: (enabled: boolean) => subscriptionApi.updateAutopay(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Devices query
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: subscriptionApi.getDevices,
    enabled: !!subscription,
  });

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Delete all devices mutation
  const deleteAllDevicesMutation = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: () => subscriptionApi.togglePause(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  // Auto-close all modals/forms when success notification appears
  const handleCloseAllModals = useCallback(() => {
    setShowDeviceTopup(false);
    setShowDeviceReduction(false);
    setShowTrafficTopup(false);
    setShowServerManagement(false);
  }, []);
  useCloseOnSuccessNotification(handleCloseAllModals);

  // Device price query
  const { data: devicePriceData } = useQuery({
    queryKey: ['device-price', devicesToAdd],
    queryFn: () => subscriptionApi.getDevicePrice(devicesToAdd),
    enabled: showDeviceTopup && !!subscription,
  });

  // Device purchase mutation
  const devicePurchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchaseDevices(devicesToAdd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setShowDeviceTopup(false);
      setDevicesToAdd(1);
    },
  });

  // Device reduction info query
  const { data: deviceReductionInfo } = useQuery({
    queryKey: ['device-reduction-info'],
    queryFn: subscriptionApi.getDeviceReductionInfo,
    enabled: showDeviceReduction && !!subscription,
  });

  // Initialize target device limit when reduction info loads
  useEffect(() => {
    if (deviceReductionInfo && showDeviceReduction) {
      setTargetDeviceLimit(
        Math.max(
          deviceReductionInfo.min_device_limit,
          deviceReductionInfo.current_device_limit - 1,
        ),
      );
    }
  }, [deviceReductionInfo, showDeviceReduction]);

  // Device reduction mutation
  const deviceReductionMutation = useMutation({
    mutationFn: () => subscriptionApi.reduceDevices(targetDeviceLimit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-reduction-info'] });
      setShowDeviceReduction(false);
    },
  });

  // Traffic packages query
  const { data: trafficPackages } = useQuery({
    queryKey: ['traffic-packages'],
    queryFn: subscriptionApi.getTrafficPackages,
    enabled: showTrafficTopup && !!subscription,
  });

  // Traffic purchase mutation
  const trafficPurchaseMutation = useMutation({
    mutationFn: (gb: number) => subscriptionApi.purchaseTraffic(gb),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setShowTrafficTopup(false);
      setSelectedTrafficPackage(null);
    },
  });

  // Countries/servers query
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: subscriptionApi.getCountries,
    enabled: showServerManagement && !!subscription && !subscription.is_trial,
  });

  // Initialize selected servers when data loads
  useEffect(() => {
    if (countriesData && showServerManagement) {
      const connected = countriesData.countries.filter((c) => c.is_connected).map((c) => c.uuid);
      setSelectedServersToUpdate(connected);
    }
  }, [countriesData, showServerManagement]);

  // Countries update mutation
  const updateCountriesMutation = useMutation({
    mutationFn: (countries: string[]) => subscriptionApi.updateCountries(countries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['countries'] });
      setShowServerManagement(false);
    },
  });

  // Traffic refresh mutation
  const refreshTrafficMutation = useMutation({
    mutationFn: subscriptionApi.refreshTraffic,
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      localStorage.setItem('traffic_refresh_ts', Date.now().toString());
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds);
      } else {
        setTrafficRefreshCooldown(30);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: {
      response?: { status?: number; headers?: { get?: (key: string) => string } };
    }) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.('Retry-After');
        setTrafficRefreshCooldown(retryAfter ? parseInt(retryAfter, 10) : 30);
      }
    },
  });

  // Track if we've already triggered auto-refresh this session
  const hasAutoRefreshed = useRef(false);

  // Cooldown timer for traffic refresh
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [trafficRefreshCooldown]);

  // Auto-refresh traffic on mount (with 30s caching)
  useEffect(() => {
    if (!subscription) return;
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;

    const lastRefresh = localStorage.getItem('traffic_refresh_ts');
    const now = Date.now();
    const cacheMs = 30 * 1000;

    if (lastRefresh && now - parseInt(lastRefresh, 10) < cacheMs) {
      const elapsed = now - parseInt(lastRefresh, 10);
      const remaining = Math.ceil((cacheMs - elapsed) / 1000);
      if (remaining > 0) {
        setTrafficRefreshCooldown(remaining);
      }
      return;
    }

    refreshTrafficMutation.mutate();
  }, [subscription, refreshTrafficMutation]);

  const copyUrl = () => {
    if (subscription?.subscription_url) {
      navigator.clipboard.writeText(subscription.subscription_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('subscription.title')}</h1>

      {/* Current Subscription */}
      {subscription ? (
        (() => {
          const usedPercent =
            trafficData?.traffic_used_percent ?? subscription.traffic_used_percent;
          const usedGb = trafficData?.traffic_used_gb ?? subscription.traffic_used_gb;
          const isUnlimited =
            (trafficData?.is_unlimited ?? false) || subscription.traffic_limit_gb === 0;
          const zone = getTrafficZone(usedPercent);
          const connectedDevices = devicesData?.total ?? 0;
          const formattedDate = new Date(subscription.end_date).toLocaleDateString();

          return (
            <div
              className="relative overflow-hidden rounded-3xl backdrop-blur-xl"
              style={{
                background: g.cardBg,
                border: subscription.is_trial
                  ? '1px solid rgba(62,219,176,0.15)'
                  : `1px solid ${g.cardBorder}`,
                boxShadow: g.shadow,
                padding: '28px 28px 24px',
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
              <div className="mb-6 flex items-start justify-between">
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
                  </div>

                  {/* Plan name */}
                  <h2 className="text-lg font-bold tracking-tight text-dark-50">
                    {subscription.tariff_name || t('subscription.currentPlan')}
                  </h2>
                </div>

                {/* Status badge */}
                <span
                  className="rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background: subscription.is_active
                      ? `${zone.mainHex}15`
                      : 'rgba(255,59,92,0.12)',
                    border: subscription.is_active
                      ? `1px solid ${zone.mainHex}30`
                      : '1px solid rgba(255,59,92,0.25)',
                    color: subscription.is_active ? zone.mainHex : '#FF3B5C',
                  }}
                >
                  {subscription.is_active
                    ? subscription.is_trial
                      ? t('subscription.trialStatus')
                      : t('subscription.active')
                    : t('subscription.expired')}
                </span>
              </div>

              {/* ─── Trial Info Banner ─── */}
              {subscription.is_trial && subscription.is_active && (
                <div
                  className="mb-6 rounded-[14px] p-4"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(62,219,176,0.08), rgba(62,219,176,0.03))',
                    border: '1px solid rgba(62,219,176,0.12)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
                      style={{ background: 'rgba(62,219,176,0.12)' }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#3EDBB0"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#3EDBB0' }}>
                        {t('subscription.trialInfo.title')}
                      </div>
                      <div className="mt-1 text-[12px] text-dark-50/40">
                        {t('subscription.trialInfo.description')}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[12px] font-semibold"
                            style={{ color: '#3EDBB0' }}
                          >
                            {subscription.days_left > 0
                              ? t('subscription.days', { count: subscription.days_left })
                              : `${subscription.hours_left}${t('subscription.hours')} ${subscription.minutes_left}${t('subscription.minutes')}`}
                          </span>
                          <span className="text-[11px] text-dark-50/30">
                            {t('subscription.trialInfo.remaining')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[12px] font-semibold"
                            style={{ color: '#3EDBB0' }}
                          >
                            {subscription.traffic_limit_gb || '∞'} {t('common.units.gb')}
                          </span>
                          <span className="text-[11px] text-dark-50/30">
                            {t('subscription.traffic')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[12px] font-semibold"
                            style={{ color: '#3EDBB0' }}
                          >
                            {subscription.device_limit}
                          </span>
                          <span className="text-[11px] text-dark-50/30">
                            {t('subscription.devices')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Traffic Progress ─── */}
              <div className="mb-6">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-dark-50/40">
                    {t('subscription.traffic')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-dark-50/30">
                      {isUnlimited
                        ? formatTraffic(usedGb)
                        : `${formatTraffic(usedGb)} / ${formatTraffic(subscription.traffic_limit_gb)}`}
                    </span>
                    <button
                      onClick={() => refreshTrafficMutation.mutate()}
                      disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-dark-50/30 transition-colors hover:bg-dark-50/[0.05] hover:text-dark-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg
                        className={`h-3 w-3 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
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
                      {trafficRefreshCooldown > 0
                        ? `${trafficRefreshCooldown}s`
                        : t('common.refresh')}
                    </button>
                  </div>
                </div>
                {subscription.traffic_reset_mode &&
                  subscription.traffic_reset_mode !== 'NO_RESET' && (
                    <div className="mb-2 text-[10px] text-dark-50/25">
                      {t(`subscription.trafficReset.${subscription.traffic_reset_mode}`)}
                    </div>
                  )}
                <TrafficProgressBar
                  usedGb={usedGb}
                  limitGb={subscription.traffic_limit_gb}
                  percent={usedPercent}
                  isUnlimited={isUnlimited}
                  compact
                />
              </div>

              {/* ─── Connect Device Button ─── */}
              {subscription.subscription_url && (
                <HoverBorderGradient
                  as="button"
                  accentColor={zone.mainHex}
                  onClick={() => navigate('/connection')}
                  className="mb-5 flex w-full items-center gap-3.5 rounded-[14px] p-3.5 text-left transition-shadow duration-300"
                  style={{ fontFamily: 'inherit' }}
                >
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
                </HoverBorderGradient>
              )}

              {/* ─── Subscription URL ─── */}
              {subscription.subscription_url && !subscription.hide_subscription_link && (
                <div className="mb-5 flex gap-2">
                  <code
                    className="scrollbar-hide flex-1 overflow-x-auto break-all rounded-[10px] px-3 py-2 font-mono text-[11px] text-dark-50/30"
                    style={{
                      background: g.codeBg,
                      border: `1px solid ${g.codeBorder}`,
                    }}
                  >
                    {subscription.subscription_url}
                  </code>
                  <button
                    onClick={copyUrl}
                    className="flex h-auto items-center rounded-[10px] px-3 transition-all duration-300"
                    style={{
                      background: copied ? 'rgba(62,219,176,0.12)' : g.innerBorder,
                      border: copied ? '1px solid rgba(62,219,176,0.2)' : `1px solid ${g.trackBg}`,
                      color: copied ? '#3EDBB0' : g.textMuted,
                    }}
                    title={t('subscription.copyLink')}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              )}

              {/* ─── Stats Row ─── */}
              <div className="mb-5 grid grid-cols-2 gap-2.5">
                {/* Countdown timer */}
                {(() => {
                  const isUrgent = countdown.days <= 3;
                  const isExpired = !subscription.is_active;
                  return (
                    <div
                      className="rounded-[14px] p-3.5"
                      style={{
                        background: isExpired
                          ? 'rgba(255,59,92,0.06)'
                          : isUrgent
                            ? 'rgba(255,184,0,0.06)'
                            : g.innerBg,
                        border: isExpired
                          ? '1px solid rgba(255,59,92,0.15)'
                          : isUrgent
                            ? '1px solid rgba(255,184,0,0.15)'
                            : `1px solid ${g.innerBorder}`,
                      }}
                    >
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-dark-50/35">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-[7px]"
                          style={{
                            background: isExpired
                              ? 'rgba(255,59,92,0.1)'
                              : isUrgent
                                ? 'rgba(255,184,0,0.1)'
                                : g.hoverBg,
                          }}
                        >
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isExpired ? '#FF3B5C' : isUrgent ? '#FFB800' : g.textSecondary}
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
                      {isExpired ? (
                        <div
                          className="text-[18px] font-bold tracking-tight"
                          style={{ color: '#FF3B5C' }}
                        >
                          {t('subscription.expired')}
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1 font-mono tabular-nums">
                          {countdown.days > 0 && (
                            <>
                              <span
                                className="text-[20px] font-bold tracking-tight"
                                style={{ color: isUrgent ? '#FFB800' : g.text }}
                              >
                                {countdown.days}
                              </span>
                              <span className="mr-1 text-[10px] font-medium text-dark-50/25">
                                {t('subscription.daysShort')}
                              </span>
                            </>
                          )}
                          <span
                            className="text-[20px] font-bold tracking-tight"
                            style={{ color: isUrgent ? '#FFB800' : g.text }}
                          >
                            {String(countdown.hours).padStart(2, '0')}
                          </span>
                          <span
                            className="mx-[-1px] text-[16px] font-bold opacity-30"
                            style={{ color: isUrgent ? '#FFB800' : g.text }}
                          >
                            :
                          </span>
                          <span
                            className="text-[20px] font-bold tracking-tight"
                            style={{ color: isUrgent ? '#FFB800' : g.text }}
                          >
                            {String(countdown.minutes).padStart(2, '0')}
                          </span>
                          <span
                            className="mx-[-1px] text-[16px] font-bold opacity-30"
                            style={{ color: isUrgent ? '#FFB800' : g.text }}
                          >
                            :
                          </span>
                          <span
                            className="text-[20px] font-bold tracking-tight"
                            style={{ color: isUrgent ? '#FFB800' : g.text }}
                          >
                            {String(countdown.seconds).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                      <div className="mt-1 text-[10px] font-medium text-dark-50/25">
                        {t('subscription.expiresAt')}: {formattedDate}
                      </div>
                    </div>
                  );
                })()}

                {/* Devices */}
                <div
                  className="rounded-[14px] p-3.5"
                  style={{
                    background: g.innerBg,
                    border: `1px solid ${g.innerBorder}`,
                  }}
                >
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-dark-50/35">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-[7px]"
                      style={{ background: `${zone.mainHex}12` }}
                    >
                      <svg
                        width="13"
                        height="13"
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
                      </svg>
                    </div>
                    {t('subscription.devices')}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-bold tracking-tight text-dark-50">
                      {connectedDevices}
                    </span>
                    <span className="text-xs font-medium text-dark-50/25">
                      / {subscription.device_limit}
                    </span>
                  </div>
                </div>
              </div>

              {/* ─── Locations ─── */}
              {subscription.servers && subscription.servers.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dark-50/35">
                    {t('subscription.locationsLabel')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {subscription.servers.map((server) => (
                      <span
                        key={server.uuid}
                        className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] font-medium text-dark-50/50"
                        style={{
                          background: g.innerBorder,
                          border: `1px solid ${g.trackBg}`,
                        }}
                      >
                        {server.country_code && (
                          <span className="text-xs">{getFlagEmoji(server.country_code)}</span>
                        )}
                        {server.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Purchased Traffic Packages ─── */}
              {subscription.traffic_purchases && subscription.traffic_purchases.length > 0 && (
                <div className="mb-5">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dark-50/35">
                    {t('subscription.purchasedTraffic')}
                  </div>
                  <div className="space-y-2">
                    {subscription.traffic_purchases.map((purchase) => (
                      <div
                        key={purchase.id}
                        className="rounded-[12px] p-3"
                        style={{
                          background: g.innerBg,
                          border: `1px solid ${g.innerBorder}`,
                        }}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-7 w-7 items-center justify-center rounded-[8px]"
                              style={{ background: `${zone.mainHex}12` }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke={zone.mainHex}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <span className="text-sm font-semibold text-dark-50">
                              {purchase.traffic_gb} {t('common.units.gb')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div
                              className="text-[11px] font-medium"
                              style={{
                                color: purchase.days_remaining === 0 ? '#FF6B35' : g.textSecondary,
                              }}
                            >
                              {purchase.days_remaining === 0
                                ? t('subscription.expired')
                                : t('subscription.days', { count: purchase.days_remaining })}
                            </div>
                            <div className="mt-0.5 font-mono text-[9px] text-dark-50/20">
                              {t('subscription.trafficResetAt')}:{' '}
                              {new Date(purchase.expires_at).toLocaleDateString(undefined, {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          className="relative h-1.5 overflow-hidden rounded-full"
                          style={{ background: g.trackBg }}
                        >
                          <div
                            className="absolute inset-0 rounded-full transition-all duration-500"
                            style={{
                              width: `${purchase.progress_percent}%`,
                              background: `linear-gradient(90deg, ${zone.mainHex}, ${zone.mainHex}80)`,
                            }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between font-mono text-[9px] text-dark-50/20">
                          <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                          <span>{new Date(purchase.expires_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Autopay Toggle ─── */}
              {!subscription.is_trial && !subscription.is_daily && (
                <div
                  className="flex items-center justify-between rounded-[14px] p-3.5"
                  style={{
                    background: g.innerBg,
                    border: `1px solid ${g.innerBorder}`,
                  }}
                >
                  <div>
                    <div className="text-sm font-semibold text-dark-50">
                      {t('subscription.autoRenewal')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-dark-50/30">
                      {t('subscription.daysBeforeExpiry', {
                        count: subscription.autopay_days_before,
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => autopayMutation.mutate(!subscription.autopay_enabled)}
                    disabled={autopayMutation.isPending}
                    className="relative h-7 w-[52px] rounded-full transition-all duration-300"
                    style={{
                      background: subscription.autopay_enabled ? zone.mainHex : g.textGhost,
                    }}
                  >
                    <span
                      className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all duration-300"
                      style={{
                        left: subscription.autopay_enabled ? '26px' : '3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div
          className="relative overflow-hidden rounded-3xl py-12 text-center"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            boxShadow: g.shadow,
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: g.hoverBg }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke={g.textFaint}
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div className="text-sm text-dark-50/30">{t('subscription.noSubscription')}</div>
        </div>
      )}

      {/* Daily Subscription Pause */}
      {subscription && subscription.is_daily && !subscription.is_trial && (
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            boxShadow: g.shadow,
            padding: '24px 28px',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold tracking-tight text-dark-50">
                {t('subscription.pause.title')}
              </h2>
              <div className="mt-1 text-[12px] text-dark-50/35">
                {subscription.is_daily_paused
                  ? t('subscription.pause.paused')
                  : t('subscription.pause.active')}
              </div>
            </div>
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className="rounded-[10px] px-4 py-2 text-sm font-semibold transition-all duration-300"
              style={{
                background: subscription.is_daily_paused
                  ? 'rgba(62,219,176,0.12)'
                  : 'rgba(255,184,0,0.12)',
                border: subscription.is_daily_paused
                  ? '1px solid rgba(62,219,176,0.2)'
                  : '1px solid rgba(255,184,0,0.2)',
                color: subscription.is_daily_paused ? '#3EDBB0' : '#FFB800',
              }}
            >
              {pauseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </span>
              ) : subscription.is_daily_paused ? (
                t('subscription.pause.resumeBtn')
              ) : (
                t('subscription.pause.pauseBtn')
              )}
            </button>
          </div>

          {/* Pause mutation error */}
          {pauseMutation.isError &&
            (() => {
              const balanceError = getInsufficientBalanceError(pauseMutation.error);
              if (balanceError) {
                const missingAmount = balanceError.required - balanceError.balance;
                return (
                  <div className="mt-4">
                    <InsufficientBalancePrompt
                      missingAmountKopeks={missingAmount}
                      message={t('subscription.pause.insufficientBalance')}
                      compact
                    />
                  </div>
                );
              }
              return (
                <div
                  className="mt-4 rounded-[10px] p-3 text-center text-sm"
                  style={{
                    background: 'rgba(255,59,92,0.08)',
                    border: '1px solid rgba(255,59,92,0.15)',
                    color: '#FF3B5C',
                  }}
                >
                  {getErrorMessage(pauseMutation.error)}
                </div>
              );
            })()}

          {/* Paused info or Next charge progress bar */}
          {subscription.is_daily_paused ? (
            <div
              className="mt-4 rounded-[12px] p-4"
              style={{
                background: 'rgba(255,184,0,0.06)',
                border: '1px solid rgba(255,184,0,0.12)',
              }}
            >
              <div className="flex items-start gap-3">
                <div className="text-lg" style={{ color: '#FFB800' }}>
                  ⏸️
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#FFB800' }}>
                    {t('subscription.pause.pausedInfo')}
                  </div>
                  <div className="mt-1 text-[12px] text-dark-50/35">
                    {t('subscription.pause.pausedDescription')}{' '}
                    {new Date(subscription.end_date).toLocaleDateString()} (
                    {t('subscription.pause.days', { count: subscription.days_left })})
                  </div>
                </div>
              </div>
            </div>
          ) : (
            subscription.next_daily_charge_at &&
            (() => {
              const now = new Date();
              const nextChargeStr = subscription.next_daily_charge_at.endsWith('Z')
                ? subscription.next_daily_charge_at
                : subscription.next_daily_charge_at + 'Z';
              const nextCharge = new Date(nextChargeStr);
              const totalMs = 24 * 60 * 60 * 1000;
              const remainingMs = Math.max(0, nextCharge.getTime() - now.getTime());
              const elapsedMs = totalMs - remainingMs;
              const progress = Math.min(100, (elapsedMs / totalMs) * 100);

              const hours = Math.floor(remainingMs / (1000 * 60 * 60));
              const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

              return (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-dark-50/35">
                      {t('subscription.pause.nextCharge')}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-dark-50">
                      {hours > 0
                        ? `${hours}${t('subscription.pause.hours')} ${minutes}${t('subscription.pause.minutes')}`
                        : `${minutes}${t('subscription.pause.minutes')}`}
                    </span>
                  </div>
                  <div
                    className="relative h-2 overflow-hidden rounded-full"
                    style={{ background: g.trackBg }}
                  >
                    <div
                      className="absolute inset-0 rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #00E5A0, #00C987)',
                      }}
                    />
                  </div>
                  {subscription.daily_price_kopeks && (
                    <div className="mt-2 text-center text-[11px] text-dark-50/25">
                      {t('subscription.pause.willBeCharged')}:{' '}
                      {formatPrice(subscription.daily_price_kopeks)}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Additional Options (Buy Devices) */}
      {subscription && subscription.is_active && !subscription.is_trial && (
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            boxShadow: g.shadow,
            padding: '24px 28px',
          }}
        >
          <h2 className="mb-4 text-base font-bold tracking-tight text-dark-50">
            {t('subscription.additionalOptions.title')}
          </h2>

          {/* Buy Devices */}
          {!showDeviceTopup ? (
            <button
              onClick={() => setShowDeviceTopup(true)}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 text-left transition-colors hover:border-dark-600"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-dark-100">
                    {t('subscription.additionalOptions.buyDevices')}
                  </div>
                  <div className="mt-1 text-sm text-dark-400">
                    {t('subscription.additionalOptions.currentDeviceLimit', {
                      count: subscription.device_limit,
                    })}
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-dark-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ) : (
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-medium text-dark-100">{t('subscription.buyDevices')}</h3>
                <button
                  onClick={() => setShowDeviceTopup(false)}
                  className="text-sm text-dark-400 hover:text-dark-200"
                >
                  ✕
                </button>
              </div>

              {/* Check if completely unavailable (no subscription, price not set, etc.) */}
              {devicePriceData?.available === false && !devicePriceData?.max_device_limit ? (
                <div className="py-4 text-center text-sm text-dark-400">
                  {devicePriceData.reason || t('subscription.additionalOptions.devicesUnavailable')}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Device selector - show even at max limit */}
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setDevicesToAdd(Math.max(1, devicesToAdd - 1))}
                      disabled={devicesToAdd <= 1}
                      className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-dark-100">{devicesToAdd}</div>
                      <div className="text-sm text-dark-500">
                        {t('subscription.additionalOptions.devicesUnit')}
                      </div>
                    </div>
                    <button
                      onClick={() => setDevicesToAdd(devicesToAdd + 1)}
                      disabled={
                        devicePriceData?.max_device_limit
                          ? (devicePriceData.current_device_limit || 0) + devicesToAdd >=
                            devicePriceData.max_device_limit
                          : false
                      }
                      className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                    >
                      +
                    </button>
                  </div>

                  {/* Show limit info when at or near max */}
                  {devicePriceData?.max_device_limit && (
                    <div className="text-center text-sm text-dark-400">
                      {t('subscription.additionalOptions.currentDeviceLimit', {
                        count: devicePriceData.current_device_limit || subscription.device_limit,
                      })}{' '}
                      /{' '}
                      {t('subscription.additionalOptions.maxDevices', {
                        count: devicePriceData.max_device_limit,
                      })}
                    </div>
                  )}

                  {/* Show reason if can't add requested amount */}
                  {devicePriceData?.available === false && devicePriceData?.reason && (
                    <div className="rounded-lg bg-warning-500/10 p-3 text-center text-sm text-warning-400">
                      {devicePriceData.reason}
                    </div>
                  )}

                  {/* Price info - only when available */}
                  {devicePriceData?.available && devicePriceData.price_per_device_label && (
                    <div className="text-center">
                      <div className="mb-2 text-sm text-dark-400">
                        {/* Show original price with strikethrough if discount */}
                        {devicePriceData.discount_percent &&
                        devicePriceData.discount_percent > 0 ? (
                          <span>
                            <span className="text-dark-500 line-through">
                              {formatPrice(devicePriceData.original_price_per_device_kopeks || 0)}
                            </span>
                            <span className="mx-1">{devicePriceData.price_per_device_label}</span>
                          </span>
                        ) : (
                          devicePriceData.price_per_device_label
                        )}
                        /{t('subscription.perDevice').replace('/ ', '')} (
                        {t('subscription.days', { count: devicePriceData.days_left })})
                      </div>
                      {/* Discount badge */}
                      {devicePriceData.discount_percent && devicePriceData.discount_percent > 0 && (
                        <div className="mb-2">
                          <span className="inline-block rounded-full bg-green-500/20 px-2.5 py-0.5 text-sm font-medium text-green-400">
                            -{devicePriceData.discount_percent}%
                          </span>
                        </div>
                      )}
                      {/* Total price - show as free if 100% discount or 0 */}
                      {devicePriceData.total_price_kopeks === 0 ? (
                        <div className="text-2xl font-bold text-green-400">
                          {t('subscription.switchTariff.free')}
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-accent-400">
                          {/* Show original total with strikethrough if discount */}
                          {devicePriceData.discount_percent &&
                            devicePriceData.discount_percent > 0 &&
                            devicePriceData.base_total_price_kopeks && (
                              <span className="mr-2 text-lg text-dark-500 line-through">
                                {formatPrice(devicePriceData.base_total_price_kopeks)}
                              </span>
                            )}
                          {devicePriceData.total_price_label}
                        </div>
                      )}
                    </div>
                  )}

                  {devicePriceData?.available &&
                    purchaseOptions &&
                    devicePriceData.total_price_kopeks &&
                    devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks && (
                      <InsufficientBalancePrompt
                        missingAmountKopeks={
                          devicePriceData.total_price_kopeks - purchaseOptions.balance_kopeks
                        }
                        compact
                        onBeforeTopUp={async () => {
                          await subscriptionApi.saveDevicesCart(devicesToAdd);
                        }}
                      />
                    )}

                  <button
                    onClick={() => devicePurchaseMutation.mutate()}
                    disabled={
                      devicePurchaseMutation.isPending ||
                      !devicePriceData?.available ||
                      !!(
                        devicePriceData?.total_price_kopeks &&
                        purchaseOptions &&
                        devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks
                      )
                    }
                    className="btn-primary w-full py-3"
                  >
                    {devicePurchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      </span>
                    ) : (
                      t('subscription.additionalOptions.buy')
                    )}
                  </button>

                  {devicePurchaseMutation.isError && (
                    <div className="text-center text-sm text-error-400">
                      {getErrorMessage(devicePurchaseMutation.error)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reduce Devices */}
          <div className="mt-4">
            {!showDeviceReduction ? (
              <button
                onClick={() => setShowDeviceReduction(true)}
                className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 text-left transition-colors hover:border-dark-600"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.reduceDevices')}
                    </div>
                    <div className="mt-1 text-sm text-dark-400">
                      {t('subscription.additionalOptions.reduceDevicesDescription')}
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 text-dark-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-medium text-dark-100">
                    {t('subscription.additionalOptions.reduceDevicesTitle')}
                  </h3>
                  <button
                    onClick={() => setShowDeviceReduction(false)}
                    className="text-sm text-dark-400 hover:text-dark-200"
                  >
                    ✕
                  </button>
                </div>

                {deviceReductionInfo?.available === false ? (
                  <div className="py-4 text-center text-sm text-dark-400">
                    {deviceReductionInfo.reason ||
                      t('subscription.additionalOptions.reduceUnavailable')}
                  </div>
                ) : deviceReductionInfo ? (
                  <div className="space-y-4">
                    {/* Device limit selector */}
                    <div className="flex items-center justify-center gap-6">
                      <button
                        onClick={() =>
                          setTargetDeviceLimit(
                            Math.max(
                              Math.max(
                                deviceReductionInfo.min_device_limit,
                                deviceReductionInfo.connected_devices_count,
                              ),
                              targetDeviceLimit - 1,
                            ),
                          )
                        }
                        disabled={
                          targetDeviceLimit <=
                          Math.max(
                            deviceReductionInfo.min_device_limit,
                            deviceReductionInfo.connected_devices_count,
                          )
                        }
                        className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                      >
                        -
                      </button>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-dark-100">{targetDeviceLimit}</div>
                        <div className="text-sm text-dark-500">
                          {t('subscription.additionalOptions.devicesUnit')}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          setTargetDeviceLimit(
                            Math.min(
                              deviceReductionInfo.current_device_limit - 1,
                              targetDeviceLimit + 1,
                            ),
                          )
                        }
                        disabled={targetDeviceLimit >= deviceReductionInfo.current_device_limit - 1}
                        className="btn-secondary flex h-12 w-12 items-center justify-center !p-0 text-2xl"
                      >
                        +
                      </button>
                    </div>

                    {/* Info */}
                    <div className="space-y-1 text-center text-sm text-dark-400">
                      <div>
                        {t('subscription.additionalOptions.currentDeviceLimit', {
                          count: deviceReductionInfo.current_device_limit,
                        })}
                      </div>
                      <div>
                        {t('subscription.additionalOptions.minDeviceLimit', {
                          count: deviceReductionInfo.min_device_limit,
                        })}
                      </div>
                      <div>
                        {t('subscription.additionalOptions.connectedDevices', {
                          count: deviceReductionInfo.connected_devices_count,
                        })}
                      </div>
                    </div>

                    {/* Warning if connected devices block reduction */}
                    {deviceReductionInfo.connected_devices_count >
                      deviceReductionInfo.min_device_limit && (
                      <div className="rounded-lg bg-warning-500/10 p-3 text-center text-sm text-warning-400">
                        {t('subscription.additionalOptions.disconnectDevicesFirst', {
                          count: deviceReductionInfo.connected_devices_count,
                        })}
                      </div>
                    )}

                    {/* New limit preview */}
                    <div className="text-center">
                      <div className="text-sm text-dark-400">
                        {t('subscription.additionalOptions.newDeviceLimit', {
                          count: targetDeviceLimit,
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => deviceReductionMutation.mutate()}
                      disabled={
                        deviceReductionMutation.isPending ||
                        targetDeviceLimit >= deviceReductionInfo.current_device_limit ||
                        targetDeviceLimit < deviceReductionInfo.min_device_limit ||
                        targetDeviceLimit < deviceReductionInfo.connected_devices_count
                      }
                      className="btn-primary w-full py-3"
                    >
                      {deviceReductionMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t('subscription.additionalOptions.reducing')}
                        </span>
                      ) : (
                        t('subscription.additionalOptions.reduce')
                      )}
                    </button>

                    {deviceReductionMutation.isError && (
                      <div className="text-center text-sm text-error-400">
                        {getErrorMessage(deviceReductionMutation.error)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-400/30 border-t-accent-400" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Buy Traffic */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mt-4">
              {!showTrafficTopup ? (
                <button
                  onClick={() => setShowTrafficTopup(true)}
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 text-left transition-colors hover:border-dark-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dark-100">
                        {t('subscription.additionalOptions.buyTraffic')}
                      </div>
                      <div className="mt-1 text-sm text-dark-400">
                        {t('subscription.additionalOptions.currentTrafficLimit', {
                          limit: subscription.traffic_limit_gb,
                          used: subscription.traffic_used_gb.toFixed(1),
                        })}
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.buyTrafficTitle')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowTrafficTopup(false);
                        setSelectedTrafficPackage(null);
                      }}
                      className="text-sm text-dark-400 hover:text-dark-200"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mb-4 rounded-lg bg-dark-700/30 p-2 text-xs text-dark-500">
                    ⚠️ {t('subscription.additionalOptions.trafficWarning')}
                  </div>

                  {!trafficPackages || trafficPackages.length === 0 ? (
                    <div className="py-4 text-center text-sm text-dark-400">
                      {t('subscription.additionalOptions.trafficUnavailable')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {trafficPackages.map((pkg) => (
                          <button
                            key={pkg.gb}
                            onClick={() => setSelectedTrafficPackage(pkg.gb)}
                            className={`rounded-xl border p-4 text-center transition-all ${
                              selectedTrafficPackage === pkg.gb
                                ? 'border-accent-500 bg-accent-500/10'
                                : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                            }`}
                          >
                            <div className="text-lg font-semibold text-dark-100">
                              {pkg.is_unlimited
                                ? '♾️ ' + t('subscription.additionalOptions.unlimited')
                                : `${pkg.gb} ${t('common.units.gb')}`}
                            </div>
                            {/* Discount badge */}
                            {pkg.discount_percent && pkg.discount_percent > 0 && (
                              <div className="mb-1">
                                <span className="inline-block rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                                  -{pkg.discount_percent}%
                                </span>
                              </div>
                            )}
                            {/* Price with original strikethrough if discount */}
                            <div className="font-medium text-accent-400">
                              {pkg.discount_percent &&
                              pkg.discount_percent > 0 &&
                              pkg.base_price_kopeks ? (
                                <>
                                  <span className="mr-1 text-sm text-dark-500 line-through">
                                    {formatPrice(pkg.base_price_kopeks)}
                                  </span>
                                  {formatPrice(pkg.price_kopeks)}
                                </>
                              ) : (
                                formatPrice(pkg.price_kopeks)
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedTrafficPackage !== null &&
                        (() => {
                          const selectedPkg = trafficPackages.find(
                            (p) => p.gb === selectedTrafficPackage,
                          );
                          const hasEnoughBalance =
                            !selectedPkg ||
                            !purchaseOptions ||
                            selectedPkg.price_kopeks <= purchaseOptions.balance_kopeks;
                          const missingAmount =
                            selectedPkg && purchaseOptions
                              ? selectedPkg.price_kopeks - purchaseOptions.balance_kopeks
                              : 0;

                          return (
                            <>
                              {!hasEnoughBalance && missingAmount > 0 && (
                                <InsufficientBalancePrompt
                                  missingAmountKopeks={missingAmount}
                                  compact
                                  className="mb-3"
                                  onBeforeTopUp={async () => {
                                    await subscriptionApi.saveTrafficCart(selectedTrafficPackage);
                                  }}
                                />
                              )}
                              <button
                                onClick={() =>
                                  trafficPurchaseMutation.mutate(selectedTrafficPackage)
                                }
                                disabled={trafficPurchaseMutation.isPending || !hasEnoughBalance}
                                className="btn-primary w-full py-3"
                              >
                                {trafficPurchaseMutation.isPending ? (
                                  <span className="flex items-center justify-center gap-2">
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                  </span>
                                ) : selectedPkg?.is_unlimited ? (
                                  t('subscription.additionalOptions.buyUnlimited')
                                ) : (
                                  t('subscription.additionalOptions.buyTrafficGb', {
                                    gb: selectedTrafficPackage,
                                  })
                                )}
                              </button>
                            </>
                          );
                        })()}

                      {trafficPurchaseMutation.isError && (
                        <div className="text-center text-sm text-error-400">
                          {getErrorMessage(trafficPurchaseMutation.error)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Server Management - only in classic mode */}
          {!isTariffsMode && (
            <div className="mt-4">
              {!showServerManagement ? (
                <button
                  onClick={() => setShowServerManagement(true)}
                  className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 text-left transition-colors hover:border-dark-600"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dark-100">
                        {t('subscription.additionalOptions.manageServers')}
                      </div>
                      <div className="mt-1 text-sm text-dark-400">
                        {t('subscription.servers', { count: subscription.servers?.length || 0 })}
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 text-dark-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-medium text-dark-100">
                      {t('subscription.additionalOptions.manageServersTitle')}
                    </h3>
                    <button
                      onClick={() => {
                        setShowServerManagement(false);
                        setSelectedServersToUpdate([]);
                      }}
                      className="text-sm text-dark-400 hover:text-dark-200"
                    >
                      ✕
                    </button>
                  </div>

                  {countriesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    </div>
                  ) : countriesData && countriesData.countries.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-dark-700/30 p-2 text-xs text-dark-500">
                        {t('subscription.serverManagement.statusLegend')}
                      </div>

                      {countriesData.discount_percent > 0 && (
                        <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-2 text-xs text-success-400">
                          🎁{' '}
                          {t('subscription.serverManagement.discountBanner', {
                            percent: countriesData.discount_percent,
                          })}
                        </div>
                      )}

                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {countriesData.countries
                          .filter((country) => country.is_available || country.is_connected)
                          .map((country) => {
                            const isCurrentlyConnected = country.is_connected;
                            const isSelected = selectedServersToUpdate.includes(country.uuid);
                            const willBeAdded = !isCurrentlyConnected && isSelected;
                            const willBeRemoved = isCurrentlyConnected && !isSelected;

                            return (
                              <button
                                key={country.uuid}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedServersToUpdate((prev) =>
                                      prev.filter((u) => u !== country.uuid),
                                    );
                                  } else {
                                    setSelectedServersToUpdate((prev) => [...prev, country.uuid]);
                                  }
                                }}
                                disabled={!country.is_available && !isCurrentlyConnected}
                                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                  isSelected
                                    ? willBeAdded
                                      ? 'border-success-500 bg-success-500/10'
                                      : 'border-accent-500 bg-accent-500/10'
                                    : willBeRemoved
                                      ? 'border-error-500/50 bg-error-500/5'
                                      : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
                                } ${!country.is_available && !isCurrentlyConnected ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg">
                                    {willBeAdded
                                      ? '➕'
                                      : willBeRemoved
                                        ? '➖'
                                        : isSelected
                                          ? '✅'
                                          : '⚪'}
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2 font-medium text-dark-100">
                                      {country.name}
                                      {country.has_discount && !isCurrentlyConnected && (
                                        <span className="rounded bg-success-500/20 px-1.5 py-0.5 text-xs text-success-400">
                                          -{country.discount_percent}%
                                        </span>
                                      )}
                                    </div>
                                    {willBeAdded && (
                                      <div className="text-xs text-success-400">
                                        +{formatPrice(country.price_kopeks)}{' '}
                                        {t('subscription.serverManagement.forDays', {
                                          days: countriesData.days_left,
                                        })}
                                        {country.has_discount && (
                                          <span className="ml-1 text-dark-500 line-through">
                                            {formatPrice(
                                              Math.round(
                                                (country.base_price_kopeks *
                                                  countriesData.days_left) /
                                                  30,
                                              ),
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {!willBeAdded && !isCurrentlyConnected && (
                                      <div className="text-xs text-dark-500">
                                        {formatPrice(country.price_per_month_kopeks)}
                                        {t('subscription.serverManagement.perMonth')}
                                        {country.has_discount && (
                                          <span className="ml-1 text-dark-600 line-through">
                                            {formatPrice(country.base_price_kopeks)}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {!country.is_available && !isCurrentlyConnected && (
                                      <div className="text-xs text-dark-500">
                                        {t('subscription.serverManagement.unavailable')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {country.country_code && (
                                  <span className="text-xl">
                                    {getFlagEmoji(country.country_code)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                      </div>

                      {(() => {
                        const currentConnected = countriesData.countries
                          .filter((c) => c.is_connected)
                          .map((c) => c.uuid);
                        const added = selectedServersToUpdate.filter(
                          (u) => !currentConnected.includes(u),
                        );
                        const removed = currentConnected.filter(
                          (u) => !selectedServersToUpdate.includes(u),
                        );
                        const hasChanges = added.length > 0 || removed.length > 0;

                        // Calculate cost for added servers
                        const addedServers = countriesData.countries.filter((c) =>
                          added.includes(c.uuid),
                        );
                        const totalCost = addedServers.reduce((sum, s) => sum + s.price_kopeks, 0);
                        const hasEnoughBalance =
                          !purchaseOptions || totalCost <= purchaseOptions.balance_kopeks;
                        const missingAmount = purchaseOptions
                          ? totalCost - purchaseOptions.balance_kopeks
                          : 0;

                        return hasChanges ? (
                          <div className="space-y-3 border-t border-dark-700/50 pt-3">
                            {added.length > 0 && (
                              <div className="text-sm">
                                <span className="text-success-400">
                                  {t('subscription.serverManagement.toAdd')}
                                </span>{' '}
                                <span className="text-dark-300">
                                  {addedServers.map((s) => s.name).join(', ')}
                                </span>
                              </div>
                            )}
                            {removed.length > 0 && (
                              <div className="text-sm">
                                <span className="text-error-400">
                                  {t('subscription.serverManagement.toDisconnect')}
                                </span>{' '}
                                <span className="text-dark-300">
                                  {countriesData.countries
                                    .filter((c) => removed.includes(c.uuid))
                                    .map((s) => s.name)
                                    .join(', ')}
                                </span>
                              </div>
                            )}
                            {totalCost > 0 && (
                              <div className="text-center">
                                <div className="text-sm text-dark-400">
                                  {t('subscription.serverManagement.paymentProrated')}
                                </div>
                                <div className="text-xl font-bold text-accent-400">
                                  {formatPrice(totalCost)}
                                </div>
                              </div>
                            )}

                            {totalCost > 0 && !hasEnoughBalance && missingAmount > 0 && (
                              <InsufficientBalancePrompt
                                missingAmountKopeks={missingAmount}
                                compact
                              />
                            )}

                            <button
                              onClick={() =>
                                updateCountriesMutation.mutate(selectedServersToUpdate)
                              }
                              disabled={
                                updateCountriesMutation.isPending ||
                                selectedServersToUpdate.length === 0 ||
                                (totalCost > 0 && !hasEnoughBalance)
                              }
                              className="btn-primary w-full py-3"
                            >
                              {updateCountriesMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                </span>
                              ) : (
                                t('subscription.serverManagement.applyChanges')
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="py-2 text-center text-sm text-dark-500">
                            {t('subscription.serverManagement.selectServersHint')}
                          </div>
                        );
                      })()}

                      {updateCountriesMutation.isError && (
                        <div className="text-center text-sm text-error-400">
                          {getErrorMessage(updateCountriesMutation.error)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-sm text-dark-400">
                      {t('subscription.serverManagement.noServersAvailable')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Devices Section */}
      {subscription && (
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            boxShadow: g.shadow,
            padding: '24px 28px',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-dark-50">
              {t('subscription.myDevices')}
            </h2>
            {devicesData && devicesData.devices.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t('subscription.confirmDeleteAllDevices'))) {
                    deleteAllDevicesMutation.mutate();
                  }
                }}
                disabled={deleteAllDevicesMutation.isPending}
                className="text-[11px] font-medium transition-colors"
                style={{ color: '#FF3B5C' }}
              >
                {t('subscription.deleteAllDevices')}
              </button>
            )}
          </div>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: '#00E5A0', borderTopColor: 'transparent' }}
              />
            </div>
          ) : devicesData && devicesData.devices.length > 0 ? (
            <div className="space-y-2">
              <div className="mb-2 font-mono text-[11px] text-dark-50/30">
                {devicesData.total} /{' '}
                {t('subscription.devices', { count: devicesData.device_limit })}
              </div>
              {devicesData.devices.map((device) => (
                <div
                  key={device.hwid}
                  className="flex items-center justify-between rounded-[12px] p-3.5"
                  style={{
                    background: g.innerBg,
                    border: `1px solid ${g.innerBorder}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                      style={{ background: g.trackBg }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={g.textSecondary}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-dark-50">
                        {device.device_model || device.platform}
                      </div>
                      <div className="text-[11px] text-dark-50/30">{device.platform}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(t('subscription.confirmDeleteDevice'))) {
                        deleteDeviceMutation.mutate(device.hwid);
                      }
                    }}
                    disabled={deleteDeviceMutation.isPending}
                    className="p-2 transition-colors"
                    style={{ color: g.textFaint }}
                    title={t('subscription.deleteDevice')}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-[12px] text-dark-50/25">
              {t('subscription.noDevices')}
            </div>
          )}
        </div>
      )}

      {/* Purchase / Renewal CTA */}
      <PurchaseCTAButton subscription={subscription} />
    </div>
  );
}
