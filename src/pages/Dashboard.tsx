import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { useAuthStore } from '../store/auth'
import { subscriptionApi } from '../api/subscription'
import { referralApi } from '../api/referral'
import { balanceApi } from '../api/balance'
import { wheelApi } from '../api/wheel'
import ConnectionModal from '../components/ConnectionModal'
import Onboarding, { useOnboarding } from '../components/Onboarding'
import PromoOffersSection from '../components/PromoOffersSection'
import { useCurrency } from '../hooks/useCurrency'

// Icons
const ArrowRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

const RefreshIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

// Check if device might be low-performance (Telegram WebApp on mobile)
const isLowPerfDevice = (() => {
  const isTelegramWebApp = !!(window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  return isTelegramWebApp && isMobile
})()

const SupportLottieIcon = () => {
  // Use static icon on low-performance devices
  if (isLowPerfDevice) {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    )
  }

  return (
    <div className="w-6 h-6">
      <DotLottieReact
        src="https://lottie.host/51d2c570-0aa0-47af-a8cb-2bd4afe8d6ae/RzpYZ5zUKX.lottie"
        loop
        autoplay
      />
    </div>
  )
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, refreshUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { formatAmount, currencySymbol, formatPositive } = useCurrency()
  const [trialError, setTrialError] = useState<string | null>(null)
  const [showConnectionModal, setShowConnectionModal] = useState(false)
  const { isCompleted: isOnboardingCompleted, complete: completeOnboarding } = useOnboarding()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Refresh user data on mount
  useEffect(() => {
    refreshUser()
  }, [])

  // Fetch balance from API with no caching
  const { data: balanceData } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: subscription, isLoading: subLoading, error: subError } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const { data: trialInfo, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-info'],
    queryFn: subscriptionApi.getTrialInfo,
    enabled: !subscription && !subLoading,
  })

  const { data: referralInfo, isLoading: refLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  })

  // Fetch wheel config to show banner if enabled
  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    staleTime: 60000, // 1 minute
    retry: false,
  })

  const activateTrialMutation = useMutation({
    mutationFn: subscriptionApi.activateTrial,
    onSuccess: () => {
      setTrialError(null)
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['trial-info'] })
      refreshUser()
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      setTrialError(error.response?.data?.detail || t('common.error'))
    },
  })

  // Traffic refresh state and mutation
  const [trafficRefreshCooldown, setTrafficRefreshCooldown] = useState(0)
  const [trafficData, setTrafficData] = useState<{
    traffic_used_gb: number
    traffic_used_percent: number
    is_unlimited: boolean
  } | null>(null)

  const refreshTrafficMutation = useMutation({
    mutationFn: subscriptionApi.refreshTraffic,
    onSuccess: (data) => {
      setTrafficData({
        traffic_used_gb: data.traffic_used_gb,
        traffic_used_percent: data.traffic_used_percent,
        is_unlimited: data.is_unlimited,
      })
      if (data.rate_limited && data.retry_after_seconds) {
        setTrafficRefreshCooldown(data.retry_after_seconds)
      } else {
        setTrafficRefreshCooldown(60)
      }
      // Also update subscription query cache
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
    onError: (error: { response?: { status?: number; headers?: { get?: (key: string) => string } } }) => {
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers?.get?.('Retry-After')
        setTrafficRefreshCooldown(retryAfter ? parseInt(retryAfter, 10) : 60)
      }
    },
  })

  // Cooldown timer
  useEffect(() => {
    if (trafficRefreshCooldown <= 0) return
    const timer = setInterval(() => {
      setTrafficRefreshCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [trafficRefreshCooldown])

  const hasNoSubscription = !subscription && !subLoading && subError

  // Show onboarding for new users after data loads
  useEffect(() => {
    if (!isOnboardingCompleted && !subLoading && !refLoading) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setShowOnboarding(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isOnboardingCompleted, subLoading, refLoading])

  // Define onboarding steps based on available data
  const onboardingSteps = useMemo(() => {
    type Placement = 'top' | 'bottom' | 'left' | 'right'
    const steps: Array<{
      target: string
      title: string
      description: string
      placement: Placement
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
    ]

    // Add connect devices step only if subscription exists
    if (subscription?.subscription_url) {
      steps.splice(1, 0, {
        target: 'connect-devices',
        title: t('onboarding.steps.connectDevices.title'),
        description: t('onboarding.steps.connectDevices.description'),
        placement: 'bottom',
      })
    }

    steps.push({
      target: 'quick-actions',
      title: t('onboarding.steps.quickActions.title'),
      description: t('onboarding.steps.quickActions.description'),
      placement: 'top',
    })

    return steps
  }, [t, subscription])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    completeOnboarding()
  }

  // Calculate traffic percentage color
  const getTrafficColor = (percent: number) => {
    if (percent > 90) return 'bg-error-500'
    if (percent > 70) return 'bg-warning-500'
    return 'bg-success-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-onboarding="welcome">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">
          {t('dashboard.welcome', { name: user?.first_name || user?.username || '' })}
        </h1>
        <p className="text-dark-400 mt-1">{t('dashboard.yourSubscription')}</p>
      </div>

      {/* Subscription Status - Main Card */}
      {subscription && (
        <div className="bento-card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-dark-100">{t('subscription.status')}</h2>
            <span className={subscription.is_active ? 'badge-success' : 'badge-error'}>
              {subscription.is_active ? t('subscription.active') : t('subscription.expired')}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.expiresAt')}</div>
              <div className="text-dark-100 font-medium">
                {new Date(subscription.end_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-dark-500">{t('subscription.traffic')}</span>
                <button
                  onClick={() => refreshTrafficMutation.mutate()}
                  disabled={refreshTrafficMutation.isPending || trafficRefreshCooldown > 0}
                  className="p-1 rounded-full hover:bg-dark-700/50 text-dark-400 hover:text-accent-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={trafficRefreshCooldown > 0 ? `${trafficRefreshCooldown}s` : t('common.refresh')}
                >
                  <RefreshIcon className={`w-3.5 h-3.5 ${refreshTrafficMutation.isPending ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <div className="text-dark-100 font-medium">
                {(trafficData?.traffic_used_gb ?? subscription.traffic_used_gb).toFixed(1)} / {subscription.traffic_limit_gb || '∞'} GB
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.devices')}</div>
              <div className="text-dark-100 font-medium">{subscription.device_limit}</div>
            </div>
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.timeLeft')}</div>
              <div className="text-dark-100 font-medium">
                {subscription.days_left > 0
                  ? `${subscription.days_left} ${t('subscription.days')}`
                  : `${subscription.hours_left}${t('subscription.hours')} ${subscription.minutes_left}${t('subscription.minutes')}`
                }
              </div>
            </div>
          </div>

          {/* Traffic Progress */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-dark-400">{t('subscription.trafficUsed')}</span>
                <span className="text-dark-300">
                  {(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent).toFixed(1)}%
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getTrafficColor(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent)}`}
                  style={{ width: `${Math.min(trafficData?.traffic_used_percent ?? subscription.traffic_used_percent, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className={`mt-6 grid gap-3 ${subscription.subscription_url ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Link to="/subscription" className="btn-primary text-center text-sm py-2.5">
              {t('dashboard.viewSubscription')}
            </Link>
            {subscription.subscription_url && (
              <button
                onClick={() => setShowConnectionModal(true)}
                className="btn-secondary text-sm py-2.5"
                data-onboarding="connect-devices"
              >
                {t('subscription.getConfig')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="bento-grid">
        {/* Balance */}
        <Link to="/balance" className="bento-card-hover group" data-onboarding="balance">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-sm">{t('balance.currentBalance')}</span>
            <span className="text-dark-600 group-hover:text-accent-400 transition-colors">
              <ArrowRightIcon />
            </span>
          </div>
          <div className="stat-value text-accent-400">
            {formatAmount(balanceData?.balance_rubles || 0)}
            <span className="text-lg ml-1 text-dark-400">{currencySymbol}</span>
          </div>
        </Link>

        {/* Subscription */}
        <Link to="/subscription" className="bento-card-hover group" data-onboarding="subscription-status">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-sm">{t('subscription.title')}</span>
            <span className="text-dark-600 group-hover:text-accent-400 transition-colors">
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
                  <span className="text-lg ml-1 text-dark-400">{t('subscription.days')}</span>
                </>
              ) : subscription.hours_left > 0 ? (
                <>
                  {subscription.hours_left}
                  <span className="text-lg ml-1 text-dark-400">{t('subscription.hours')}</span>
                </>
              ) : subscription.minutes_left > 0 ? (
                <>
                  {subscription.minutes_left}
                  <span className="text-lg ml-1 text-dark-400">{t('subscription.minutes')}</span>
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-sm">{t('referral.stats.totalReferrals')}</span>
            <span className="text-dark-600 group-hover:text-accent-400 transition-colors">
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-sm">{t('referral.stats.totalEarnings')}</span>
            <span className="text-dark-600 group-hover:text-accent-400 transition-colors">
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
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0">
              <SparklesIcon />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-dark-100 mb-2">
                {t('subscription.trial.title', 'Free Trial')}
              </h3>
              <p className="text-dark-400 text-sm mb-4">
                {t('subscription.trial.description', 'Try our VPN service for free!')}
              </p>

              <div className="flex gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">{trialInfo.duration_days}</div>
                  <div className="text-xs text-dark-500">{t('subscription.trial.days', 'days')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">{trialInfo.traffic_limit_gb}</div>
                  <div className="text-xs text-dark-500">GB</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">{trialInfo.device_limit}</div>
                  <div className="text-xs text-dark-500">{t('subscription.trial.devices', 'devices')}</div>
                </div>
              </div>

              {trialInfo.requires_payment && trialInfo.price_rubles > 0 && (
                <p className="text-sm text-dark-400 mb-4">
                  {t('subscription.trial.price', 'Activation price')}: {trialInfo.price_rubles.toFixed(2)} ₽
                </p>
              )}

              {trialError && (
                <div className="bg-error-500/10 border border-error-500/30 text-error-400 text-sm p-3 rounded-xl mb-4">
                  {trialError}
                </div>
              )}

              <button
                onClick={() => activateTrialMutation.mutate()}
                disabled={activateTrialMutation.isPending}
                className="btn-primary"
              >
                {activateTrialMutation.isPending
                  ? t('common.loading', 'Loading...')
                  : t('subscription.trial.activate', 'Activate Free Trial')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promo Offers */}
      <PromoOffersSection />

      {/* Fortune Wheel Banner */}
      {wheelConfig?.is_enabled && (
        <Link
          to="/wheel"
          className="group bento-card-hover flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            {/* Emoji */}
            <span className="text-3xl">🎰</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-dark-100">
                {t('wheel.banner.title')}
              </h3>
              <p className="text-dark-400 text-sm">
                {t('wheel.banner.description')}
              </p>
            </div>
          </div>
          <div className="text-dark-500 group-hover:text-accent-400 group-hover:translate-x-1 transition-all duration-300 flex-shrink-0">
            <ChevronRightIcon />
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="bento-card" data-onboarding="quick-actions">
        <h3 className="text-lg font-semibold text-dark-100 mb-4">{t('dashboard.quickActions')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link to="/balance" className="btn-secondary justify-center text-center text-sm py-2.5">
            {t('dashboard.topUpBalance')}
          </Link>
          <Link to="/subscription" state={{ scrollToExtend: true }} className="btn-secondary justify-center text-center text-sm py-2.5">
            {t('subscription.renew')}
          </Link>
          <Link to="/referral" className="btn-secondary justify-center text-center text-sm py-2.5">
            {t('dashboard.inviteFriends')}
          </Link>
          <Link to="/support" className="btn-secondary justify-center text-center text-sm py-2.5 flex items-center gap-2">
            <SupportLottieIcon />
            <span>{t('dashboard.getSupport')}</span>
          </Link>
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal onClose={() => setShowConnectionModal(false)} />
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
  )
}
