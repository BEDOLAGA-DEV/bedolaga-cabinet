import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { useBlockingStore } from '../store/blocking';
import { subscriptionApi } from '../api/subscription';
import { referralApi } from '../api/referral';
import { balanceApi } from '../api/balance';
import { wheelApi } from '../api/wheel';
import Onboarding, { useOnboarding } from '../components/Onboarding';
import PromoOffersSection from '../components/PromoOffersSection';
import SubscriptionCardActive from '../components/dashboard/SubscriptionCardActive';
import SubscriptionCardExpired from '../components/dashboard/SubscriptionCardExpired';
import TrialOfferCard from '../components/dashboard/TrialOfferCard';
import StatsGrid from '../components/dashboard/StatsGrid';
import { API } from '../config/constants';

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function Dashboard() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const queryClient = useQueryClient();
  const { isCompleted: isOnboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const blockingType = useBlockingStore((state) => state.blockingType);
  const [trialError, setTrialError] = useState<string | null>(null);

  // Refresh user data on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Fetch balance from API
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
  });

  const { data: subscriptionResponse, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
  });

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

  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    staleTime: 60000,
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

  // Auto-refresh traffic on mount (with 30s caching)
  const hasAutoRefreshed = useRef(false);

  useEffect(() => {
    if (!subscription) return;
    if (hasAutoRefreshed.current) return;
    hasAutoRefreshed.current = true;

    const lastRefresh = localStorage.getItem('traffic_refresh_ts');
    const now = Date.now();
    const cacheMs = API.TRAFFIC_CACHE_MS;

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

  const hasNoSubscription = subscriptionResponse?.has_subscription === false && !subLoading;

  // Show onboarding for new users after data loads
  useEffect(() => {
    if (!isOnboardingCompleted && !subLoading && !refLoading && !blockingType) {
      const timer = setTimeout(() => setShowOnboarding(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnboardingCompleted, subLoading, refLoading, blockingType]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-onboarding="welcome">
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('dashboard.welcome', { name: user?.first_name || user?.username || '' })}
        </h1>
        <p className="mt-1 text-dark-400">{t('dashboard.yourSubscription')}</p>
      </div>

      {/* Subscription Status Card */}
      {subLoading ? (
        <div className="bento-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="skeleton h-5 w-20" />
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="skeleton mb-3 h-10 w-32" />
          <div className="skeleton mb-3 h-4 w-40" />
          <div className="skeleton h-3 w-full rounded-full" />
          <div className="mt-5">
            <div className="skeleton h-12 w-full rounded-xl" />
          </div>
        </div>
      ) : subscription?.is_expired ? (
        <SubscriptionCardExpired subscription={subscription} />
      ) : subscription ? (
        <SubscriptionCardActive
          subscription={subscription}
          trafficData={trafficData}
          refreshTrafficMutation={refreshTrafficMutation}
          trafficRefreshCooldown={trafficRefreshCooldown}
        />
      ) : null}

      {/* Trial Activation */}
      {hasNoSubscription && !trialLoading && trialInfo?.is_available && (
        <TrialOfferCard
          trialInfo={trialInfo}
          balanceKopeks={balanceData?.balance_kopeks || 0}
          balanceRubles={balanceData?.balance_rubles || 0}
          activateTrialMutation={activateTrialMutation}
          trialError={trialError}
        />
      )}

      {/* Promo Offers */}
      <PromoOffersSection />

      {/* Stats Grid */}
      <StatsGrid
        balanceRubles={balanceData?.balance_rubles || 0}
        subscription={subscription}
        subLoading={subLoading}
        referralCount={referralInfo?.total_referrals || 0}
        earningsRubles={referralInfo?.total_earnings_rubles || 0}
        refLoading={refLoading}
      />

      {/* Fortune Wheel Banner */}
      {wheelConfig?.is_enabled && (
        <Link to="/wheel" className="bento-card-hover group flex items-center justify-between">
          <div className="flex items-center gap-4">
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
