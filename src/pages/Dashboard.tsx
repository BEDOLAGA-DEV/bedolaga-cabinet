import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';
import { displayName } from '../utils/displayName';
import { useBlockingStore } from '../store/blocking';
import { subscriptionApi } from '../api/subscription';
import { referralApi } from '../api/referral';
import { balanceApi } from '../api/balance';
import { wheelApi } from '../api/wheel';
import Onboarding, { useOnboarding } from '../components/Onboarding';
import SubscriptionCardActive from '../components/dashboard/SubscriptionCardActive';
import SubscriptionCardExpired from '../components/dashboard/SubscriptionCardExpired';
import TrialOfferCard from '../components/dashboard/TrialOfferCard';
import StatsGrid from '../components/dashboard/StatsGrid';
import { giftApi } from '../api/gift';
import PendingGiftCard from '../components/dashboard/PendingGiftCard';
import SubscriptionListCard from '../components/subscription/SubscriptionListCard';
import { API } from '../config/constants';
import type { Subscription, SubscriptionListItem } from '../types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/primitives/Sheet';

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

type DashboardSubscriptionAction = 'renew' | 'connect';

type DashboardSubscriptionChoice = {
  id: number;
  title: string;
  subtitle: string;
  isTrial: boolean;
  connectedDevices?: number;
  deviceLimit: number;
  devicesLoading: boolean;
};

const RenewIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </svg>
);

const DeviceIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M12 18h.01" />
  </svg>
);

const PlusIcon = () => (
  <svg
    className="h-6 w-6"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

function subscriptionChoiceFromListItem(
  subscription: SubscriptionListItem,
  fallbackTitle: string,
  deviceStats?: { total: number; device_limit: number },
  devicesLoading = false,
): DashboardSubscriptionChoice {
  return {
    id: subscription.id,
    title: subscription.name || subscription.tariff_name || fallbackTitle,
    subtitle: subscription.name && subscription.tariff_name ? subscription.tariff_name : '',
    isTrial: subscription.is_trial,
    connectedDevices: deviceStats?.total,
    deviceLimit: deviceStats?.device_limit ?? subscription.device_limit,
    devicesLoading,
  };
}

function subscriptionChoiceFromStatus(
  subscription: Subscription,
  fallbackTitle: string,
  deviceStats?: { total: number; device_limit: number },
  devicesLoading = false,
): DashboardSubscriptionChoice {
  return {
    id: subscription.id,
    title: subscription.name || subscription.tariff_name || fallbackTitle,
    subtitle: subscription.name && subscription.tariff_name ? subscription.tariff_name : '',
    isTrial: subscription.is_trial,
    connectedDevices: deviceStats?.total,
    deviceLimit: deviceStats?.device_limit ?? subscription.device_limit,
    devicesLoading,
  };
}

function isSubscriptionAtDeviceLimit(subscription: DashboardSubscriptionChoice) {
  if (subscription.deviceLimit === 0) return false;
  if (subscription.connectedDevices == null) return false;
  return subscription.connectedDevices >= subscription.deviceLimit;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const queryClient = useQueryClient();
  const { isCompleted: isOnboardingCompleted, complete: completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const blockingType = useBlockingStore((state) => state.blockingType);
  const [trialError, setTrialError] = useState<string | null>(null);
  const [subscriptionAction, setSubscriptionAction] = useState<DashboardSubscriptionAction | null>(
    null,
  );

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

  // Multi-tariff: check if user has multiple subscriptions
  const { data: multiSubData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const isMultiTariff = multiSubData?.multi_tariff_enabled ?? false;

  const { data: subscriptionResponse, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
    enabled: !isMultiTariff,
  });

  const subscription = subscriptionResponse?.subscription ?? null;

  const { data: trialInfo, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-info'],
    queryFn: () => subscriptionApi.getTrialInfo(),
    enabled: !subscription && !subLoading,
  });

  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: () => subscriptionApi.getDevices(),
    enabled: !!subscription && !isMultiTariff,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const multiSubscriptionDeviceQueries = useQueries({
    queries: (multiSubData?.subscriptions ?? []).map((sub) => ({
      queryKey: ['devices', sub.id],
      queryFn: () => subscriptionApi.getDevices(sub.id),
      enabled: isMultiTariff,
      staleTime: API.BALANCE_STALE_TIME_MS,
    })),
  });

  const { isLoading: refLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    staleTime: 60000,
    retry: false,
  });

  const { data: pendingGifts } = useQuery({
    queryKey: ['pending-gifts'],
    queryFn: giftApi.getPendingGifts,
    staleTime: 30_000,
    retry: false,
  });

  const activateTrialMutation = useMutation({
    mutationFn: () => subscriptionApi.activateTrial(),
    onSuccess: () => {
      setTrialError(null);
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      queryClient.invalidateQueries({ queryKey: ['trial-info'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
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
    mutationFn: () => subscriptionApi.refreshTraffic(subscription?.id),
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      });
      localStorage.setItem(
        `traffic_refresh_ts_${subscription?.id ?? 'default'}`,
        Date.now().toString(),
      );
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds);
      } else {
        setTrafficRefreshCooldown(30);
      }
      queryClient.invalidateQueries({ queryKey: ['subscription', subscription?.id] });
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

    const lastRefresh = localStorage.getItem(`traffic_refresh_ts_${subscription?.id ?? 'default'}`);
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

  // В multi-tariff /cabinet/subscription отключён, поэтому subscriptionResponse=undefined.
  // Используем список из /cabinet/subscriptions/list — пустой массив означает «нет подписок»,
  // и тогда показываем TrialOfferCard. Без этой ветки multi-tariff юзер никогда не видел триал.
  const hasNoSubscription = isMultiTariff
    ? multiSubData !== undefined && (multiSubData.subscriptions?.length ?? 0) === 0
    : subscriptionResponse?.has_subscription === false && !subLoading;

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
    completeOnboarding();
    setShowOnboarding(false);
  };

  const userDisplayName = displayName(user);
  const hasExistingSubscriptions = (multiSubData?.subscriptions?.length ?? 0) > 0;
  const hasAnySubscription = hasExistingSubscriptions || !!subscription;
  const dashboardSubscriptions = useMemo<DashboardSubscriptionChoice[]>(() => {
    const fallbackTitle = t('subscription.defaultName', 'Подписка');

    if (multiSubData?.subscriptions?.length) {
      return multiSubData.subscriptions.map((sub, index) => {
        const devicesQuery = multiSubscriptionDeviceQueries[index];
        return subscriptionChoiceFromListItem(
          sub,
          fallbackTitle,
          devicesQuery?.data,
          devicesQuery?.isLoading ?? true,
        );
      });
    }

    if (subscription) {
      return [
        subscriptionChoiceFromStatus(
          subscription,
          fallbackTitle,
          devicesData,
          !!subscription && devicesData == null,
        ),
      ];
    }

    return [];
  }, [devicesData, multiSubData, multiSubscriptionDeviceQueries, subscription, t]);

  const navigateToSubscriptionAction = (
    action: DashboardSubscriptionAction,
    selectedSubscription: DashboardSubscriptionChoice,
  ) => {
    setSubscriptionAction(null);

    if (action === 'connect') {
      if (isSubscriptionAtDeviceLimit(selectedSubscription)) {
        navigate(`/subscriptions/${selectedSubscription.id}`);
        return;
      }

      navigate(`/connection?sub=${selectedSubscription.id}`);
      return;
    }

    if (selectedSubscription.isTrial) {
      navigate(`/subscription/purchase?subscriptionId=${selectedSubscription.id}&from=dashboard`);
      return;
    }

    navigate(`/subscriptions/${selectedSubscription.id}/renew?from=dashboard`);
  };

  const handleSubscriptionAction = (action: DashboardSubscriptionAction) => {
    if (dashboardSubscriptions.length === 1) {
      navigateToSubscriptionAction(action, dashboardSubscriptions[0]);
      return;
    }

    setSubscriptionAction(action);
  };

  const getSubscriptionChoiceSubtitle = (sub: DashboardSubscriptionChoice) => {
    if (subscriptionAction !== 'connect') return sub.subtitle;

    if (sub.devicesLoading) return t('dashboard.simple.checkingDevices');
    if (isSubscriptionAtDeviceLimit(sub)) return t('dashboard.simple.noDeviceSlots');

    if (sub.deviceLimit === 0) {
      return t('dashboard.devicesConnectedUnlimited', { used: sub.connectedDevices ?? 0 });
    }

    return t('dashboard.devicesOfMax', {
      used: sub.connectedDevices ?? 0,
      max: sub.deviceLimit,
    });
  };

  const actionButtonClass =
    'flex min-h-[68px] items-center gap-3 rounded-2xl border border-dark-700/60 bg-dark-900/70 p-3 text-left transition-colors active:bg-dark-800 sm:min-h-[78px] sm:p-4 sm:hover:border-accent-500/50 sm:hover:bg-dark-850';

  return (
    <div className="space-y-5">
      <div data-onboarding="welcome">
        {userDisplayName && (
          <h1 className="text-3xl font-bold leading-tight text-dark-50">
            {t('dashboard.simple.helloWithName', { name: userDisplayName })}
          </h1>
        )}
      </div>

      {pendingGifts && pendingGifts.length > 0 && <PendingGiftCard gifts={pendingGifts} />}

      {isMultiTariff && multiSubData?.subscriptions && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-dark-50">
              {t('dashboard.subscriptions', 'Подписки')}
            </span>
            <Link to="/subscriptions" className="text-base font-semibold text-accent-300">
              {t('dashboard.manageAll', 'Управление')} →
            </Link>
          </div>
          {multiSubData.subscriptions.slice(0, 3).map((sub) => (
            <SubscriptionListCard
              key={sub.id}
              subscription={sub}
              onClick={() => navigate(`/subscriptions/${sub.id}`)}
            />
          ))}
          {multiSubData.subscriptions.length > 3 && (
            <Link
              to="/subscriptions"
              className="flex w-full items-center justify-center rounded-2xl border border-dashed border-white/20 p-4 text-base font-semibold text-dark-300"
            >
              {t('dashboard.showAll', 'Показать все')} ({multiSubData.subscriptions.length})
            </Link>
          )}
        </div>
      )}

      {!isMultiTariff && (
        <>
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
          ) : subscription?.is_expired ||
            subscription?.status === 'disabled' ||
            subscription?.is_limited ? (
            <SubscriptionCardExpired
              subscription={subscription}
              balanceKopeks={balanceData?.balance_kopeks ?? 0}
              balanceRubles={balanceData?.balance_rubles ?? 0}
            />
          ) : subscription ? (
            <SubscriptionCardActive
              subscription={subscription}
              trafficData={trafficData}
              refreshTrafficMutation={refreshTrafficMutation}
              trafficRefreshCooldown={trafficRefreshCooldown}
              connectedDevices={devicesData?.total ?? 0}
            />
          ) : null}
        </>
      )}

      {(isMultiTariff
        ? multiSubData?.subscriptions !== undefined
        : dashboardSubscriptions.length > 0) && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link to="/subscription/purchase?from=dashboard" className={actionButtonClass}>
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300 sm:h-12 sm:w-12">
                <PlusIcon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold leading-tight text-dark-50 sm:text-lg">
                  {hasAnySubscription
                    ? t('subscriptions.buyAnother', 'Купить ещё подписку')
                    : t('subscriptions.buySubscription', 'Купить подписку')}
                </span>
              </span>
              <span className="text-dark-500">
                <ChevronRightIcon />
              </span>
            </Link>

            {dashboardSubscriptions.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => handleSubscriptionAction('renew')}
                  className={actionButtonClass}
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-300 sm:h-12 sm:w-12">
                    <RenewIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-tight text-dark-50 sm:text-lg">
                      {t('dashboard.simple.renewMain')}
                    </span>
                  </span>
                  <span className="text-dark-500">
                    <ChevronRightIcon />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSubscriptionAction('connect')}
                  disabled={
                    dashboardSubscriptions.length === 1 && dashboardSubscriptions[0].devicesLoading
                  }
                  className={actionButtonClass}
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-success-500/15 text-success-300 sm:h-12 sm:w-12">
                    <DeviceIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold leading-tight text-dark-50 sm:text-lg">
                      {t('dashboard.simple.connectDeviceMain')}
                    </span>
                  </span>
                  <span className="text-dark-500">
                    <ChevronRightIcon />
                  </span>
                </button>
              </>
            )}
          </div>

          <Sheet
            open={subscriptionAction !== null && dashboardSubscriptions.length > 1}
            onOpenChange={(open) => {
              if (!open) setSubscriptionAction(null);
            }}
          >
            <SheetContent className="mx-auto max-w-lg rounded-t-3xl" showCloseButton>
              <SheetHeader className="px-0 text-left">
                <SheetTitle>{t('dashboard.simple.chooseSubscription')}</SheetTitle>
                <SheetDescription>
                  {subscriptionAction === 'renew'
                    ? t('dashboard.simple.chooseForRenew')
                    : t('dashboard.simple.chooseForConnect')}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-2">
                {dashboardSubscriptions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      subscriptionAction && navigateToSubscriptionAction(subscriptionAction, sub)
                    }
                    disabled={subscriptionAction === 'connect' && sub.devicesLoading}
                    className="flex min-h-[64px] w-full items-center justify-between gap-3 rounded-2xl border border-dark-700/60 bg-dark-800/80 p-4 text-left transition-colors active:bg-dark-700/80 sm:hover:border-accent-500/40 sm:hover:bg-dark-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-dark-100">
                        {sub.title}
                      </span>
                      {getSubscriptionChoiceSubtitle(sub) && (
                        <span className="mt-0.5 block truncate text-sm text-dark-400">
                          {getSubscriptionChoiceSubtitle(sub)}
                        </span>
                      )}
                    </span>
                    <span className="text-dark-500">
                      <ChevronRightIcon />
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setSubscriptionAction(null)}
                className="mt-3 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-dark-800 px-4 text-base font-semibold text-dark-200 transition-colors active:bg-dark-700/80 sm:hover:bg-dark-700"
              >
                {t('common.cancel')}
              </button>
            </SheetContent>
          </Sheet>
        </div>
      )}

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

      <h2 className="pt-1 text-xl font-bold text-dark-50">{t('dashboard.simple.useful')}</h2>
      <StatsGrid balanceRubles={balanceData?.balance_rubles || 0} />

      {wheelConfig?.is_enabled && (
        <Link
          to="/wheel"
          className="group flex items-center justify-between rounded-2xl border border-dark-700/60 bg-dark-900/70 p-4"
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">🎰</span>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-dark-100">{t('wheel.banner.title')}</h3>
              <p className="text-sm text-dark-400">{t('wheel.banner.description')}</p>
            </div>
          </div>
          <div className="flex-shrink-0 text-dark-500 transition-all duration-300 group-hover:translate-x-1 group-hover:text-accent-400">
            <ChevronRightIcon />
          </div>
        </Link>
      )}

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
