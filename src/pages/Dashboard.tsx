import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { subscriptionApi } from '../api/subscription';
import { referralApi } from '../api/referral';
import { balanceApi } from '../api/balance';
import { wheelApi } from '../api/wheel';
import ConnectionModal from '../components/ConnectionModal';
import Onboarding, { useOnboarding } from '../components/Onboarding';
import PromoOffersSection from '../components/PromoOffersSection';
import { useCurrency } from '../hooks/useCurrency';

// Icons
const ArrowRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const RefreshIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol, formatPositive } = useCurrency();
  const [trialError, setTrialError] = useState<string | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const { isCompleted: isOnboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Refresh user data on mount
  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch balance from API with no caching
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: subscriptionResponse, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  // Extract subscription from response (null if no subscription)
  const subscription = subscriptionResponse?.subscription ?? null;

  const { data: trialInfo, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-info'],
    queryFn: subscriptionApi.getTrialInfo,
    enabled: !subscription && !subLoading,
  });

  const { data: referralInfo, isLoading: refLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  // Fetch wheel config to show banner if enabled
  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    staleTime: 60000, // 1 minute
    retry: false,
  });

  const activateTrialMutation = useMutation({
    mutationFn: subscriptionApi.activateTrial,
    onSuccess: () => {
      setTrialError(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['trial-info'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      refreshUser();
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      setTrialError(error.response?.data?.detail || t('common.error'));
    },
  });

  // Traffic refresh state and mutation
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0);
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
  } | null>(null);

  const refreshTrafficMutation = useMutation({
    mutationFn: subscriptionApi.refreshTraffic,
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      // Save last refresh timestamp to localStorage
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

  // Cooldown timer
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return;
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [trafficRefreshCooldown]);

  // Track if we've already triggered auto-refresh this session
  const hasAutoRefreshed = useRef(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription]);

  // User has no subscription if API returns has_subscription: false
  const hasNoSubscription = subscriptionResponse?.has_subscription === false && !subLoading;

  // Show onboarding for new users after data loads
  useEffect(() => {
    if (!isOnboardingCompleted && !subLoading && !refLoading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnboardingCompleted, subLoading, refLoading]);

  // Define onboarding steps based on available data
  const onboardingSteps = useMemo(() => {
    type Placement = 'top' | 'bottom' | 'left' | 'right';
    const steps: Array<{
      target: string;
      title: string;
      description: string;
      placement: Placement;
    }> = [
      {
        target: 'welcome',
        title: t('onboarding.steps.welcome.title'),
        description: t('onboarding.steps.welcome.description'),
        placement: 'bottom',
      },
      {
        target: 'balance',
        title: t('onboarding.steps.balance.title'),
        description: t('onboarding.steps.balance.description'),
        placement: 'bottom',
      },
      {
        target: 'subscription-status',
        title: t('onboarding.steps.subscription.title'),
        description: t('onboarding.steps.subscription.description'),
        placement: 'bottom',
      },
    ];

    // Add connect devices step only if subscription exists
    if (subscription?.subscription_url) {
      steps.splice(1, 0, {
        target: 'connect-devices',
        title: t('onboarding.steps.connectDevices.title'),
        description: t('onboarding.steps.connectDevices.description'),
        placement: 'bottom',
      });
    }

    return steps;
  }, [t, subscription]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    completeOnboarding();
  };

  // Calculate traffic percentage color
  const getTrafficColor = (percent: number) => {
    if (percent > 90) return 'bg-error-500';
    if (percent > 70) return 'bg-warning-500';
    return 'bg-success-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-onboarding="welcome">
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('dashboard.welcome', { name: user?.first_name || user?.username || '' })}
        </h1>
        <p className="mt-1 text-dark-400">{t('dashboard.yourSubscription')}</p>
      </div>

      {/* Subscription Status - Main Card */}
      {subLoading ? (
        <div className="bento-card">
          <div className="mb-6 flex items-center justify-between">
            <div className="skeleton h-6 w-24" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="skeleton mb-2 h-4 w-20" />
                <div className="skeleton h-5 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="skeleton h-2 w-full rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
      ) : subscription ? (
        <div
          className={`bento-card ${subscription.is_trial ? 'border-warning-500/30 bg-gradient-to-br from-warning-500/5 to-transparent' : ''}`}
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('subscription.status')}</h2>
              {subscription.tariff_name && (
                <div className="mt-1 text-sm text-accent-400">{subscription.tariff_name}</div>
              )}
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

          {/* Trial Info Banner */}
          {subscription.is_trial && subscription.is_active && (
            <div className="mb-6 rounded-xl border border-warning-500/30 bg-warning-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-warning-500/20 text-xl">
                  <SparklesIcon />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-warning-300">
                    {t('subscription.trialBanner.title')}
                  </div>
                  <div className="mt-1 text-sm text-dark-400">
                    {t('subscription.trialBanner.description', { days: subscription.days_left })}
                  </div>
                  <Link
                    to="/subscription"
                    state={{ scrollToExtend: true }}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-warning-400 transition-colors hover:text-warning-300"
                  >
                    {t('subscription.trialBanner.upgrade')}
                    <ArrowRightIcon />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.expiresAt')}</div>
              <div className="font-medium text-dark-100">
                {new Date(subscription.end_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-dark-500">{t('subscription.traffic')}</span>
                <button
                  onClick={() => refreshTrafficMutation.mutate()}
                  disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
                  className="rounded-full p-1 text-dark-400 transition-colors hover:bg-dark-700/50 hover:text-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                  title={
                    trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')
                  }
                >
                  <RefreshIcon
                    className={`h-3.5 w-3.5 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
              <div className="font-medium text-dark-100">
                {(trafficData?.traffic_used_gb ?? subscription.traffic_used_gb).toFixed(1)} /{' '}
                {subscription.traffic_limit_gb || '∞'} GB
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.devices')}</div>
              <div className="font-medium text-dark-100">{subscription.device_limit}</div>
            </div>
            <div>
              <div className="mb-1 text-sm text-dark-500">{t('subscription.timeLeft')}</div>
              <div className="font-medium text-dark-100">
                {subscription.days_left > 0
                  ? t('subscription.days', { count: subscription.days_left })
                  : `${t('subscription.hours', { count: subscription.hours_left })} ${t('subscription.minutes', { count: subscription.minutes_left })}`}
              </div>
            </div>
          </div>

          {/* Traffic Progress */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-dark-400">{t('subscription.trafficUsed')}</span>
                <span className="text-dark-300">
                  {(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent).toFixed(
                    1,
                  )}
                  %
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getTrafficColor(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent)}`}
                  style={{
                    width: `${Math.min(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div
            className={`mt-6 grid gap-3 ${subscription.subscription_url ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            <Link to="/subscription" className="btn-primary py-2.5 text-center text-sm">
              {t('dashboard.viewSubscription')}
            </Link>
            {subscription.subscription_url && (
              <button
                onClick={() => setShowConnectionModal(true)}
                className="btn-secondary py-2.5 text-sm"
                data-onboarding="connect-devices"
              >
                {t('subscription.getConfig')}
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Promo Offers - показываем сразу после карточки подписки */}
      <PromoOffersSection />

      {/* Stats Grid */}
      <div className="bento-grid">
        {/* Balance */}
        <Link to="/balance" className="bento-card-hover group" data-onboarding="balance">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('balance.currentBalance')}</span>
            <span className="text-dark-600 transition-colors group-hover:text-accent-400">
              <ArrowRightIcon />
            </span>
          </div>
          <div className="stat-value text-accent-400">
            {formatAmount(balanceData?.balance_rubles || 0)}
            <span className="ml-1 text-lg text-dark-400">{currencySymbol}</span>
          </div>
        </Link>

        {/* Subscription */}
        <Link
          to="/subscription"
          className="bento-card-hover group"
          data-onboarding="subscription-status"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('subscription.title')}</span>
            <span className="text-dark-600 transition-colors group-hover:text-accent-400">
              <ArrowRightIcon />
            </span>
          </div>
          {subLoading ? (
            <div className="skeleton h-8 w-24" />
          ) : subscription ? (
            <div className="stat-value">
              {subscription.days_left > 0 ? (
                <>
                  {subscription.days_left}
                  <span className="ml-1 text-lg text-dark-400">{t('subscription.days')}</span>
                </>
              ) : subscription.hours_left > 0 ? (
                <>
                  {subscription.hours_left}
                  <span className="ml-1 text-lg text-dark-400">{t('subscription.hours')}</span>
                </>
              ) : subscription.minutes_left > 0 ? (
                <>
                  {subscription.minutes_left}
                  <span className="ml-1 text-lg text-dark-400">{t('subscription.minutes')}</span>
                </>
              ) : (
                <span className="text-error-400">{t('subscription.expired')}</span>
              )}
            </div>
          ) : (
            <div className="stat-value text-error-400">{t('subscription.inactive')}</div>
          )}
        </Link>

        {/* Referrals */}
        <Link to="/referral" className="bento-card-hover group">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('referral.stats.totalReferrals')}</span>
            <span className="text-dark-600 transition-colors group-hover:text-accent-400">
              <ArrowRightIcon />
            </span>
          </div>
          {refLoading ? (
            <div className="skeleton h-8 w-16" />
          ) : (
            <div className="stat-value">{referralInfo?.total_referrals || 0}</div>
          )}
        </Link>

        {/* Earnings */}
        <Link to="/referral" className="bento-card-hover group">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('referral.stats.totalEarnings')}</span>
            <span className="text-dark-600 transition-colors group-hover:text-accent-400">
              <ArrowRightIcon />
            </span>
          </div>
          {refLoading ? (
            <div className="skeleton h-8 w-20" />
          ) : (
            <div className="stat-value text-success-400">
              {formatPositive(referralInfo?.total_earnings_rubles || 0)}
            </div>
          )}
        </Link>
      </div>

      {/* Trial Activation */}
      {hasNoSubscription && !trialLoading && trialInfo?.is_available && (
        <div className="bento-card-glow border-accent-500/30 bg-gradient-to-br from-accent-500/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent-500/20">
              <SparklesIcon />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold text-dark-100">
                {trialInfo.requires_payment
                  ? t('subscription.trial.titlePaid', 'Trial Subscription')
                  : t('subscription.trial.title', 'Free Trial')}
              </h3>
              <p className="mb-4 text-sm text-dark-400">
                {t('subscription.trial.description', 'Try our VPN service for free!')}
              </p>

              <div className="mb-6 flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">
                    {trialInfo.duration_days}
                  </div>
                  <div className="text-xs text-dark-500">{t('subscription.trial.days')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">
                    {trialInfo.traffic_limit_gb || '∞'}
                  </div>
                  <div className="text-xs text-dark-500">GB</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">{trialInfo.device_limit}</div>
                  <div className="text-xs text-dark-500">{t('subscription.trial.devices')}</div>
                </div>
              </div>

              {trialInfo.requires_payment && trialInfo.price_rubles > 0 && (
                <div className="mb-4 space-y-2 rounded-xl bg-dark-800/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">
                      {t('subscription.trial.price', 'Activation price')}:
                    </span>
                    <span className="text-lg font-semibold text-accent-400">
                      {trialInfo.price_rubles.toFixed(2)} {currencySymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">
                      {t('balance.currentBalance', 'Your balance')}:
                    </span>
                    <span
                      className={`text-lg font-semibold ${(balanceData?.balance_kopeks || 0) >= trialInfo.price_kopeks ? 'text-success-400' : 'text-warning-400'}`}
                    >
                      {formatAmount(balanceData?.balance_rubles || 0)} {currencySymbol}
                    </span>
                  </div>
                  {(balanceData?.balance_kopeks || 0) < trialInfo.price_kopeks && (
                    <div className="pt-1 text-xs text-warning-400">
                      {t(
                        'subscription.trial.insufficientBalance',
                        'Top up your balance to activate',
                      )}
                    </div>
                  )}
                </div>
              )}

              {trialError && (
                <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
                  {trialError}
                </div>
              )}

              {trialInfo.requires_payment && trialInfo.price_kopeks > 0 ? (
                (balanceData?.balance_kopeks || 0) >= trialInfo.price_kopeks ? (
                  <button
                    onClick={() => activateTrialMutation.mutate()}
                    disabled={activateTrialMutation.isPending}
                    className="btn-primary w-full"
                  >
                    {activateTrialMutation.isPending
                      ? t('common.loading', 'Loading...')
                      : t('subscription.trial.payAndActivate', 'Pay from Balance & Activate')}
                  </button>
                ) : (
                  <Link to="/balance" className="btn-primary block w-full text-center">
                    {t('subscription.trial.topUpToActivate', 'Top Up Balance')}
                  </Link>
                )
              ) : (
                <button
                  onClick={() => activateTrialMutation.mutate()}
                  disabled={activateTrialMutation.isPending}
                  className="btn-primary w-full"
                >
                  {activateTrialMutation.isPending
                    ? t('common.loading', 'Loading...')
                    : t('subscription.trial.activate', 'Activate Free Trial')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fortune Wheel Banner */}
      {wheelConfig?.is_enabled && (
        <Link to="/wheel" className="bento-card-hover group flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Emoji */}
            <span className="text-3xl">🎰</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-dark-100">{t('wheel.banner.title')}</h3>
              <p className="text-sm text-dark-400">{t('wheel.banner.description')}</p>
            </div>
          </div>
          <div className="flex-shrink-0 text-dark-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent-400">
            <ChevronRightIcon />
          </div>
        </Link>
      )}

      {/* Connection Modal */}
      {showConnectionModal && <ConnectionModal onClose={() => setShowConnectionModal(false)} />}

      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <Onboarding
          steps={onboardingSteps}
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingComplete}
        />
      )}
    </div>
  );
}
