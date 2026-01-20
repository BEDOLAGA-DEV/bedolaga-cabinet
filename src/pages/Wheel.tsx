import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { wheelApi, type SpinResult, type SpinHistoryItem } from '../api/wheel'
import FortuneWheel from '../components/wheel/FortuneWheel'
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt'
import { useCurrency } from '../hooks/useCurrency'

// Pre-calculated confetti positions (stable across re-renders)
const CONFETTI_POSITIONS = Array.from({ length: 20 }, (_, i) => ({
  color: ['#fbbf24', '#a855f7', '#3b82f6', '#10b981', '#f43f5e'][i % 5],
  left: `${(i * 17 + 5) % 95}%`,
  top: `${(i * 23 + 3) % 90}%`,
  delay: `${(i * 0.1) % 2}s`,
  duration: `${1 + (i % 3) * 0.3}s`,
}))

// Icons
const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

const TrophyIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
  </svg>
)

export default function Wheel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { formatAmount, currencySymbol } = useCurrency()

  const [isSpinning, setIsSpinning] = useState(false)
  const [targetRotation, setTargetRotation] = useState<number | null>(null)
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [paymentType, setPaymentType] = useState<'telegram_stars' | 'subscription_days'>('telegram_stars')
  const [showHistory, setShowHistory] = useState(false)
  const [isPayingStars, setIsPayingStars] = useState(false)

  const isTelegramMiniApp = useMemo(() => {
    // Check if we're in Telegram Mini App environment
    const webApp = window.Telegram?.WebApp
    return !!(webApp && typeof webApp.initData === 'string')
  }, [])

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
  })

  const { data: history } = useQuery({
    queryKey: ['wheel-history'],
    queryFn: () => wheelApi.getHistory(1, 10),
    enabled: showHistory,
  })

  // Auto-select payment type based on availability
  useEffect(() => {
    if (!config) return

    const starsEnabled = config.spin_cost_stars_enabled && config.spin_cost_stars
    const daysEnabled = config.spin_cost_days_enabled && config.spin_cost_days
    const canPayBalance = starsEnabled && config.can_pay_stars
    const canPayDays = daysEnabled && config.can_pay_days

    if (isTelegramMiniApp) {
      // In Mini App: prefer days if available, Stars payment is separate button
      if (canPayDays) {
        setPaymentType('subscription_days')
      }
    } else {
      // In Web: prefer balance (Stars converted to rubles), fallback to days
      if (canPayBalance) {
        setPaymentType('telegram_stars')
      } else if (canPayDays) {
        setPaymentType('subscription_days')
      }
    }
  }, [config, isTelegramMiniApp])

  // Function to poll for new spin result after Stars payment
  const pollForSpinResult = useCallback(async (signal: AbortSignal, maxAttempts = 15, delayMs = 800) => {
    // Wait a bit before first poll to give the bot time to process the payment
    await new Promise(resolve => setTimeout(resolve, 1500))

    if (signal.aborted) return null

    // Get current history to find the latest spin ID
    let historyBefore
    try {
      historyBefore = await wheelApi.getHistory(1, 1)
    } catch {
      historyBefore = { items: [], total: 0 }
    }
    const lastSpinIdBefore = historyBefore.items.length > 0 ? historyBefore.items[0].id : 0

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal.aborted) return null

      await new Promise(resolve => setTimeout(resolve, delayMs))

      if (signal.aborted) return null

      try {
        const historyAfter = await wheelApi.getHistory(1, 1)

        // Check if we have a new spin (either new item or higher ID)
        if (historyAfter.items.length > 0) {
          const latestSpin = historyAfter.items[0]
          // If we had no spins before, or this spin has a higher ID
          if (lastSpinIdBefore === 0 || latestSpin.id > lastSpinIdBefore) {
            // Found a new spin! Return it as SpinResult
            return {
              success: true,
              prize_id: latestSpin.id,
              prize_type: latestSpin.prize_type,
              prize_value: latestSpin.prize_value,
              prize_display_name: latestSpin.prize_display_name,
              emoji: latestSpin.emoji,
              color: latestSpin.color,
              rotation_degrees: 0, // Not needed for result display
              message: latestSpin.prize_type === 'nothing'
                ? t('wheel.noPrize')
                : `${t('wheel.youWon')} ${latestSpin.prize_display_name}!`,
              promocode: null, // Promocode is sent to bot chat
              error: null,
            } as SpinResult
          }
        }
      } catch {
        // Continue polling on error
      }
    }

    // Timeout - couldn't find new spin
    return null
  }, [t])

  // Ref to store pending Stars payment result
  const pendingStarsResultRef = useRef<SpinResult | null>(null)
  const isStarsSpinRef = useRef(false)
  const pollingAbortRef = useRef<AbortController | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort()
      }
    }
  }, [])

  const starsInvoiceMutation = useMutation({
    mutationFn: wheelApi.createStarsInvoice,
    onSuccess: (data) => {
      if (window.Telegram?.WebApp?.openInvoice) {
        window.Telegram.WebApp.openInvoice(data.invoice_url, async (status) => {
          if (status === 'paid') {
            // Mark this as a Stars spin so handleSpinComplete knows to use the pending result
            isStarsSpinRef.current = true
            pendingStarsResultRef.current = null

            // Cancel any existing polling
            if (pollingAbortRef.current) {
              pollingAbortRef.current.abort()
            }
            pollingAbortRef.current = new AbortController()

            // Payment done - reset paying state immediately
            setIsPayingStars(false)

            // Start spinning animation (5 seconds duration in FortuneWheel)
            setIsSpinning(true)
            setTargetRotation(360 * 5 + Math.random() * 360)

            // Poll for the result in the background - don't await here!
            // The result will be stored and shown when animation completes
            const abortSignal = pollingAbortRef.current.signal
            pollForSpinResult(abortSignal).then((result) => {
              if (abortSignal.aborted) return

              queryClient.invalidateQueries({ queryKey: ['wheel-config'] })
              queryClient.invalidateQueries({ queryKey: ['wheel-history'] })

              if (result) {
                pendingStarsResultRef.current = result
              } else {
                // Fallback: couldn't get result
                pendingStarsResultRef.current = {
                  success: true,
                  prize_id: null,
                  prize_type: null,
                  prize_value: 0,
                  prize_display_name: '',
                  emoji: '🎰',
                  color: '#8B5CF6',
                  rotation_degrees: 0,
                  message: t('wheel.starsPaymentSuccessCheckHistory'),
                  promocode: null,
                  error: null,
                }
              }
            }).catch(() => {
              if (abortSignal.aborted) return

              // Error polling, show generic success
              pendingStarsResultRef.current = {
                success: true,
                prize_id: null,
                prize_type: null,
                prize_value: 0,
                prize_display_name: '',
                emoji: '🎰',
                color: '#8B5CF6',
                rotation_degrees: 0,
                message: t('wheel.starsPaymentSuccessCheckHistory'),
                promocode: null,
                error: null,
              }
            })
          } else if (status !== 'cancelled') {
            setIsPayingStars(false)
            setSpinResult({
              success: false,
              prize_id: null,
              prize_type: null,
              prize_value: 0,
              prize_display_name: '',
              emoji: '😔',
              color: '#EF4444',
              rotation_degrees: 0,
              message: t('wheel.starsPaymentFailed'),
              promocode: null,
              error: 'payment_failed',
            })
            setShowResultModal(true)
          } else {
            setIsPayingStars(false)
          }
        })
      } else {
        // openInvoice not available - show error
        setIsPayingStars(false)
        setSpinResult({
          success: false,
          prize_id: null,
          prize_type: null,
          prize_value: 0,
          prize_display_name: '',
          emoji: '😔',
          color: '#EF4444',
          rotation_degrees: 0,
          message: t('wheel.errors.starsNotAvailable'),
          promocode: null,
          error: 'stars_not_available',
        })
        setShowResultModal(true)
      }
    },
    onError: () => {
      setIsPayingStars(false)
      setSpinResult({
        success: false,
        prize_id: null,
        prize_type: null,
        prize_value: 0,
        prize_display_name: '',
        emoji: '😔',
        color: '#EF4444',
        rotation_degrees: 0,
        message: t('wheel.errors.networkError'),
        promocode: null,
        error: 'network_error',
      })
      setShowResultModal(true)
    },
  })

  const handleDirectStarsPay = () => {
    setIsPayingStars(true)
    starsInvoiceMutation.mutate()
  }

  const spinMutation = useMutation({
    mutationFn: () => wheelApi.spin(paymentType),
    onSuccess: (result) => {
      if (result.success) {
        setTargetRotation(result.rotation_degrees)
        setSpinResult(result)
      } else {
        setIsSpinning(false)
        setSpinResult(result)
        setShowResultModal(true)
      }
    },
    onError: () => {
      setIsSpinning(false)
      setSpinResult({
        success: false,
        message: t('wheel.errors.networkError'),
        error: 'network_error',
        prize_id: null,
        prize_type: null,
        prize_value: 0,
        prize_display_name: '',
        emoji: '',
        color: '',
        rotation_degrees: 0,
        promocode: null,
      })
      setShowResultModal(true)
    },
  })

  const handleSpin = () => {
    if (!config?.can_spin || isSpinning) return
    setIsSpinning(true)
    spinMutation.mutate()
  }

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false)

    // Check if this was a Stars payment spin
    if (isStarsSpinRef.current) {
      isStarsSpinRef.current = false

      // Use the pending result from polling, or show a fallback
      if (pendingStarsResultRef.current) {
        setSpinResult(pendingStarsResultRef.current)
        pendingStarsResultRef.current = null
      } else {
        // Polling still in progress or failed - show fallback
        setSpinResult({
          success: true,
          prize_id: null,
          prize_type: null,
          prize_value: 0,
          prize_display_name: '',
          emoji: '🎰',
          color: '#8B5CF6',
          rotation_degrees: 0,
          message: t('wheel.starsPaymentSuccessCheckHistory'),
          promocode: null,
          error: null,
        })
      }
    }

    setShowResultModal(true)
    queryClient.invalidateQueries({ queryKey: ['wheel-config'] })
    queryClient.invalidateQueries({ queryKey: ['wheel-history'] })
  }, [queryClient, t])

  const closeResultModal = () => {
    setShowResultModal(false)
    setSpinResult(null)
    setTargetRotation(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <SparklesIcon />
          </div>
        </div>
      </div>
    )
  }

  if (error || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-4xl">😔</span>
        </div>
        <p className="text-dark-400 text-lg">{t('wheel.errors.loadFailed')}</p>
      </div>
    )
  }

  if (!config.is_enabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-24 h-24 rounded-full bg-dark-800 flex items-center justify-center">
          <span className="text-5xl">🎡</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-100 mb-2">{t('wheel.title')}</h1>
          <p className="text-dark-400">{t('wheel.disabled')}</p>
        </div>
      </div>
    )
  }

  const starsEnabled = config.spin_cost_stars_enabled && config.spin_cost_stars
  const daysEnabled = config.spin_cost_days_enabled && config.spin_cost_days
  const canPayBalance = starsEnabled && config.can_pay_stars // For web: pay with internal balance
  const canPayDays = daysEnabled && config.can_pay_days

  return (
    <div className="animate-fade-in pb-8">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-blue-600/20 p-6 sm:p-8">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/25">
                <TrophyIcon />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {t('wheel.title')}
              </h1>
            </div>
            {config.daily_limit > 0 && (
              <div className="flex items-center gap-2 text-dark-300">
                <span>{t('wheel.spinsRemaining')}:</span>
                <span className="px-3 py-1 bg-white/10 rounded-full font-bold text-purple-300">
                  {Math.max(0, config.daily_limit - config.user_spins_today)} / {config.daily_limit}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-3 rounded-xl transition-all ${
              showHistory
                ? 'bg-purple-500/20 text-purple-300 ring-2 ring-purple-500/50'
                : 'bg-white/5 text-dark-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <HistoryIcon />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-[1fr,320px] gap-6">
        {/* Wheel Section */}
        <div className="relative">
          {/* Wheel Container with glow background */}
          <div className="relative p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-dark-800/80 to-dark-900/80 backdrop-blur-sm border border-dark-700/50">
            {/* Background glow */}
            <div
              className="absolute inset-0 rounded-2xl opacity-50 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
              }}
            />

            {/* Wheel */}
            <div className="relative">
              <FortuneWheel
                prizes={config.prizes}
                isSpinning={isSpinning}
                targetRotation={targetRotation}
                onSpinComplete={handleSpinComplete}
              />
            </div>

            {/* Spin Button */}
            <div className="mt-8 space-y-4">
              {/* Payment Options - Different for Web vs Mini App */}
              {isTelegramMiniApp ? (
                // Mini App: Show Stars button (direct Telegram payment) and Days button
                <div className="space-y-3">
                  {/* Direct Stars payment via Telegram */}
                  {starsEnabled && (
                    <button
                      onClick={handleDirectStarsPay}
                      disabled={isSpinning || isPayingStars || (config.daily_limit > 0 && config.user_spins_today >= config.daily_limit)}
                      className="w-full p-4 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <StarIcon />
                      {isPayingStars ? t('wheel.processingPayment') : `${t('wheel.payWithStars')} (${config.spin_cost_stars} ⭐)`}
                    </button>
                  )}

                  {/* Days payment option */}
                  {daysEnabled && (
                    <button
                      onClick={() => canPayDays && setPaymentType('subscription_days')}
                      disabled={isSpinning || !canPayDays}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                        paymentType === 'subscription_days' && canPayDays
                          ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-blue-400'
                          : !canPayDays
                          ? 'border-dark-700 text-dark-500 opacity-50 cursor-not-allowed'
                          : 'border-dark-700 text-dark-300 hover:border-dark-600 hover:bg-dark-800'
                      }`}
                    >
                      <CalendarIcon />
                      <span className="font-semibold">
                        {t('wheel.payWithDays')} ({config.spin_cost_days} {config.spin_cost_days === 1 ? t('wheel.day') : t('wheel.days')})
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                // Web: Show Balance button (Stars converted to rubles) and Days button
                (starsEnabled || daysEnabled) && (
                  <div className="flex gap-3">
                    {starsEnabled && (
                      <button
                        onClick={() => canPayBalance && setPaymentType('telegram_stars')}
                        disabled={isSpinning || !canPayBalance}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          paymentType === 'telegram_stars' && canPayBalance
                            ? 'border-accent-500/50 bg-gradient-to-br from-accent-500/20 to-blue-500/10 text-accent-400'
                            : !canPayBalance
                            ? 'border-dark-700 text-dark-500 opacity-50 cursor-not-allowed'
                            : 'border-dark-700 text-dark-300 hover:border-dark-600 hover:bg-dark-800'
                        }`}
                      >
                        <span className="font-semibold">{formatAmount(config.required_balance_kopeks / 100)} {currencySymbol}</span>
                        <span className="text-xs opacity-70">({config.spin_cost_stars} ⭐)</span>
                      </button>
                    )}

                    {daysEnabled && (
                      <button
                        onClick={() => canPayDays && setPaymentType('subscription_days')}
                        disabled={isSpinning || !canPayDays}
                        className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                          paymentType === 'subscription_days' && canPayDays
                            ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-blue-400'
                            : !canPayDays
                            ? 'border-dark-700 text-dark-500 opacity-50 cursor-not-allowed'
                            : 'border-dark-700 text-dark-300 hover:border-dark-600 hover:bg-dark-800'
                        }`}
                      >
                        <CalendarIcon />
                        <span className="font-semibold">
                          {config.spin_cost_days} {config.spin_cost_days === 1 ? t('wheel.day') : t('wheel.days')}
                        </span>
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Main Spin Button - Show for web always, for mini app only if days available */}
              {(!isTelegramMiniApp || canPayDays) && (
                <button
                  onClick={handleSpin}
                  disabled={!config.can_spin || isSpinning || isPayingStars || (isTelegramMiniApp && !canPayDays)}
                  className={`w-full py-5 rounded-2xl text-xl font-bold transition-all relative overflow-hidden group ${
                    !config.can_spin || isSpinning || isPayingStars || (isTelegramMiniApp && !canPayDays)
                      ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                  style={{
                    backgroundSize: '200% 100%',
                    animation: !isSpinning && config.can_spin ? 'wheel-shimmer 3s linear infinite' : 'none',
                  }}
                >
                  {/* Button glow effect */}
                  {!isSpinning && config.can_spin && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}

                  {isSpinning ? (
                    <span className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('wheel.spinning')}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <SparklesIcon />
                      {t('wheel.spin')}
                    </span>
                  )}
                </button>
              )}

              {/* Cannot spin hint */}
              {!config.can_spin && !isSpinning && (
                <>
                  {config.can_spin_reason === 'daily_limit_reached' ? (
                    <div className="text-center p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                      <p className="text-dark-400">{t('wheel.errors.dailyLimitReached')}</p>
                    </div>
                  ) : config.can_spin_reason === 'insufficient_balance' ? (
                    <InsufficientBalancePrompt
                      missingAmountKopeks={config.required_balance_kopeks - config.user_balance_kopeks}
                    />
                  ) : (
                    <div className="text-center p-4 rounded-xl bg-dark-800/50 border border-dark-700">
                      <p className="text-dark-400">{t('wheel.errors.cannotSpin')}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="rounded-2xl bg-dark-800/80 backdrop-blur-sm border border-dark-700/50 overflow-hidden">
              <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                <h3 className="font-semibold text-dark-100 flex items-center gap-2">
                  <HistoryIcon />
                  {t('wheel.recentSpins')}
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="lg:hidden p-1 text-dark-400 hover:text-dark-200"
                >
                  <CloseIcon />
                </button>
              </div>

              {history && history.items.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  {history.items.map((item: SpinHistoryItem, index: number) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-4 ${
                        index !== history.items.length - 1 ? 'border-b border-dark-700/50' : ''
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                        style={{ backgroundColor: `${item.color}20` }}
                      >
                        {item.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-dark-100 truncate">
                          {item.prize_display_name}
                        </div>
                        <div className="text-xs text-dark-500">
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-xs text-dark-400 whitespace-nowrap">
                        -{item.payment_type === 'telegram_stars'
                          ? `${item.payment_amount} ⭐`
                          : `${item.payment_amount}${t('wheel.days').charAt(0)}`}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-dark-500">
                  <div className="text-4xl mb-2">🎰</div>
                  {t('wheel.noHistory')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {showResultModal && spinResult && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            className={`relative w-full max-w-md rounded-3xl p-8 text-center overflow-hidden ${
              spinResult.success
                ? 'bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-purple-900/90'
                : 'bg-gradient-to-br from-dark-800 via-dark-900 to-dark-800'
            } border ${spinResult.success ? 'border-purple-500/30' : 'border-dark-700'}`}
          >
            {/* Decorative elements */}
            {spinResult.success && (
              <>
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                {/* Confetti effect - using pre-calculated positions */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  {CONFETTI_POSITIONS.map((pos, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: pos.color,
                        left: pos.left,
                        top: pos.top,
                        animationDelay: pos.delay,
                        animationDuration: pos.duration,
                      }}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Close button */}
            <button
              onClick={closeResultModal}
              className="absolute top-4 right-4 p-2 text-dark-400 hover:text-dark-200 transition-colors rounded-lg hover:bg-white/5"
            >
              <CloseIcon />
            </button>

            {/* Content */}
            <div className="relative space-y-6">
              {/* Prize icon */}
              <div
                className="w-28 h-28 mx-auto rounded-full flex items-center justify-center text-6xl shadow-2xl"
                style={{
                  background: spinResult.success
                    ? `linear-gradient(135deg, ${spinResult.color || '#8B5CF6'}40, ${spinResult.color || '#8B5CF6'}20)`
                    : 'rgba(239, 68, 68, 0.1)',
                  boxShadow: spinResult.success
                    ? `0 0 60px ${spinResult.color || '#8B5CF6'}40`
                    : 'none',
                }}
              >
                {spinResult.success ? (spinResult.emoji || '🎉') : '😔'}
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold text-white">
                {spinResult.success
                  ? spinResult.prize_type === 'nothing'
                    ? t('wheel.noLuck')
                    : t('wheel.congratulations')
                  : t('wheel.oops')}
              </h2>

              {/* Message */}
              <p className="text-lg text-dark-200">{spinResult.message}</p>

              {/* Promocode if won */}
              {spinResult.promocode && (
                <div className="p-5 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-500/20 border border-purple-500/30 rounded-2xl">
                  <p className="text-sm text-purple-300 mb-3">{t('wheel.yourPromoCode')}</p>
                  <p className="text-2xl font-mono font-bold text-white select-all tracking-wider">
                    {spinResult.promocode}
                  </p>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={closeResultModal}
                className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-all"
              >
                {t('wheel.close')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
