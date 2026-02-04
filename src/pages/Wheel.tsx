import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { wheelApi, type SpinResult, type SpinHistoryItem } from '../api/wheel';
import FortuneWheel from '../components/wheel/FortuneWheel';
import WheelLegend from '../components/wheel/WheelLegend';
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt';
import { usePlatform, useHaptic } from '@/platform';
import { useNotify } from '@/platform/hooks/useNotify';
import { Card } from '@/components/data-display/Card/Card';
import { Button } from '@/components/primitives/Button/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

// Icons
const StarIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-5 w-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

export default function Wheel() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { openInvoice, capabilities } = usePlatform();
  const haptic = useHaptic();
  const notify = useNotify();

  const [isSpinning, setIsSpinning] = useState(false);
  const [targetRotation, setTargetRotation] = useState<number | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [paymentType, setPaymentType] = useState<'telegram_stars' | 'subscription_days'>(
    'telegram_stars',
  );
  const [isPayingStars, setIsPayingStars] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showStarsConfirm, setShowStarsConfirm] = useState(false);
  const paymentTypeInitialized = useRef(false);

  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
  });

  const { data: history } = useQuery({
    queryKey: ['wheel-history'],
    queryFn: () => wheelApi.getHistory(1, 10),
  });

  // Auto-select payment type based on availability (only on initial load)
  useEffect(() => {
    if (!config || paymentTypeInitialized.current) return;
    paymentTypeInitialized.current = true;

    const starsEnabled = config.spin_cost_stars_enabled && config.spin_cost_stars;
    const daysEnabled = config.spin_cost_days_enabled && config.spin_cost_days;

    if (starsEnabled) {
      setPaymentType('telegram_stars');
    } else if (daysEnabled) {
      setPaymentType('subscription_days');
    }
  }, [config]);

  // Function to poll for new spin result after Stars payment
  const pollForSpinResult = useCallback(
    async (signal: AbortSignal, maxAttempts = 15, delayMs = 800) => {
      // Wait a bit before first poll to give the bot time to process the payment
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (signal.aborted) return null;

      // Get current history to find the latest spin ID
      let historyBefore;
      try {
        historyBefore = await wheelApi.getHistory(1, 1);
      } catch {
        historyBefore = { items: [], total: 0 };
      }
      const lastSpinIdBefore = historyBefore.items.length > 0 ? historyBefore.items[0].id : 0;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (signal.aborted) return null;

        await new Promise((resolve) => setTimeout(resolve, delayMs));

        if (signal.aborted) return null;

        try {
          const historyAfter = await wheelApi.getHistory(1, 1);

          // Check if we have a new spin (either new item or higher ID)
          if (historyAfter.items.length > 0) {
            const latestSpin = historyAfter.items[0];
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
                message:
                  latestSpin.prize_type === 'nothing'
                    ? t('wheel.noPrize')
                    : `${t('wheel.youWon')} ${latestSpin.prize_display_name}!`,
                promocode: null, // Promocode is sent to bot chat
                error: null,
              } as SpinResult;
            }
          }
        } catch {
          // Continue polling on error
        }
      }

      // Timeout - couldn't find new spin
      return null;
    },
    [t],
  );

  // Ref to store pending Stars payment result
  const pendingStarsResultRef = useRef<SpinResult | null>(null);
  const isStarsSpinRef = useRef(false);
  const pollingAbortRef = useRef<AbortController | null>(null);
  const preOpenedWindowRef = useRef<Window | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }
    };
  }, []);

  const starsInvoiceMutation = useMutation({
    mutationFn: wheelApi.createStarsInvoice,
    onSuccess: async (data) => {
      // Use platform's openInvoice if available
      if (capabilities.hasInvoice) {
        const status = await openInvoice(data.invoice_url);

        if (status === 'paid') {
          // Mark this as a Stars spin so handleSpinComplete knows to use the pending result
          isStarsSpinRef.current = true;
          pendingStarsResultRef.current = null;

          // Cancel any existing polling
          if (pollingAbortRef.current) {
            pollingAbortRef.current.abort();
          }
          pollingAbortRef.current = new AbortController();

          // Payment done - reset paying state immediately
          setIsPayingStars(false);

          // Start spinning animation (5 seconds duration in FortuneWheel)
          setIsSpinning(true);
          setTargetRotation(360 * 5 + Math.random() * 360);

          // Poll for the result in the background - don't await here!
          // The result will be stored and shown when animation completes
          const abortSignal = pollingAbortRef.current.signal;
          pollForSpinResult(abortSignal)
            .then((result) => {
              if (abortSignal.aborted) return;

              queryClient.invalidateQueries({ queryKey: ['wheel-config'] });
              queryClient.invalidateQueries({ queryKey: ['wheel-history'] });

              if (result) {
                pendingStarsResultRef.current = result;
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
                };
              }
            })
            .catch(() => {
              if (abortSignal.aborted) return;

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
              };
            });
        } else if (status !== 'cancelled') {
          setIsPayingStars(false);
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
          });
        } else {
          setIsPayingStars(false);
        }
      } else {
        // Fallback: redirect pre-opened window to invoice URL
        setIsPayingStars(false);
        if (preOpenedWindowRef.current) {
          preOpenedWindowRef.current.location.href = data.invoice_url;
          preOpenedWindowRef.current = null;
        }
        setSpinResult({
          success: true,
          prize_id: null,
          prize_type: null,
          prize_value: 0,
          prize_display_name: '',
          emoji: '⭐',
          color: '#8B5CF6',
          rotation_degrees: 0,
          message: t('wheel.starsPaymentRedirected'),
          promocode: null,
          error: null,
        });
      }
    },
    onError: () => {
      setIsPayingStars(false);
      if (preOpenedWindowRef.current) {
        preOpenedWindowRef.current.close();
        preOpenedWindowRef.current = null;
      }
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
      });
    },
  });

  const handleDirectStarsPay = () => {
    setShowStarsConfirm(false);
    setIsPayingStars(true);
    // In browser: pre-open window synchronously (direct user gesture) to avoid popup blocker
    if (!capabilities.hasInvoice) {
      preOpenedWindowRef.current = window.open('about:blank', '_blank') || null;
    }
    starsInvoiceMutation.mutate();
  };

  const spinMutation = useMutation({
    mutationFn: () => wheelApi.spin(paymentType),
    onSuccess: (result) => {
      if (result.success) {
        setTargetRotation(result.rotation_degrees);
        setSpinResult(result);
      } else {
        setIsSpinning(false);
        setSpinResult(result);
      }
    },
    onError: () => {
      setIsSpinning(false);
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
      });
    },
  });

  const handleSpin = () => {
    if (!config?.can_spin || isSpinning) return;
    setIsSpinning(true);
    spinMutation.mutate();
  };

  const handleUnifiedSpin = () => {
    if (paymentType === 'telegram_stars') {
      if (!config?.spin_cost_stars_enabled || !config?.spin_cost_stars) {
        notify.warning(t('wheel.starsNotAvailable'));
        return;
      }
      setShowStarsConfirm(true);
    } else {
      handleSpin();
    }
  };

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false);

    // Check if this was a Stars payment spin
    if (isStarsSpinRef.current) {
      isStarsSpinRef.current = false;

      // Use the pending result from polling, or show a fallback
      if (pendingStarsResultRef.current) {
        setSpinResult(pendingStarsResultRef.current);
        // Haptic feedback based on result
        if (pendingStarsResultRef.current.prize_type === 'nothing') {
          haptic.notification('warning');
        } else {
          haptic.notification('success');
        }
        pendingStarsResultRef.current = null;
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
        });
        haptic.notification('success');
      }
    } else if (spinResult) {
      // Regular spin - haptic based on result
      if (spinResult.success && spinResult.prize_type !== 'nothing') {
        haptic.notification('success');
      } else {
        haptic.notification('warning');
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wheel-config'] });
    queryClient.invalidateQueries({ queryKey: ['wheel-history'] });
  }, [queryClient, t, haptic, spinResult]);

  const closeResultModal = () => {
    setSpinResult(null);
    setTargetRotation(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <span className="text-4xl">😔</span>
        </div>
        <p className="text-lg text-dark-400">{t('wheel.errors.loadFailed')}</p>
      </div>
    );
  }

  if (!config.is_enabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
          <span className="text-5xl">🎡</span>
        </div>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-dark-100">{t('wheel.title')}</h1>
          <p className="text-dark-400">{t('wheel.disabled')}</p>
        </div>
      </div>
    );
  }

  const starsEnabled = config.spin_cost_stars_enabled && config.spin_cost_stars;
  const daysEnabled = config.spin_cost_days_enabled && config.spin_cost_days;
  const bothMethodsAvailable = !!(starsEnabled && daysEnabled);

  const spinDisabled =
    !config.can_spin ||
    isSpinning ||
    isPayingStars ||
    (config.daily_limit > 0 && config.user_spins_today >= config.daily_limit);

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      {/* Simple Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-50">{t('wheel.title')}</h1>
        {config.daily_limit > 0 && (
          <p className="mt-1 text-dark-400">
            {t('wheel.spinsRemaining')}:{' '}
            <span className="inline-flex items-center rounded-full bg-accent-500/15 px-2 py-0.5 text-sm font-medium text-accent-400">
              {Math.max(0, config.daily_limit - config.user_spins_today)}/{config.daily_limit}
            </span>
          </p>
        )}
      </div>

      {/* Wheel Section */}
      <Card>
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr,280px]">
          {/* Left: Wheel and Controls */}
          <div>
            {/* Wheel */}
            <FortuneWheel
              prizes={config.prizes}
              isSpinning={isSpinning}
              targetRotation={targetRotation}
              onSpinComplete={handleSpinComplete}
            />

            {/* Spin Controls */}
            <div className="mt-8 space-y-4">
              {/* Payment type selector */}
              {(starsEnabled || daysEnabled) && (
                <div className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-1">
                  <div
                    className={`grid gap-1 ${bothMethodsAvailable ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {starsEnabled && (
                      <button
                        onClick={() => setPaymentType('telegram_stars')}
                        disabled={isSpinning}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          paymentType === 'telegram_stars'
                            ? 'bg-accent-500/15 text-accent-400'
                            : 'text-dark-400 hover:text-dark-200'
                        }`}
                      >
                        <StarIcon />
                        {`${config.spin_cost_stars} ⭐`}
                      </button>
                    )}
                    {daysEnabled && (
                      <button
                        onClick={() => setPaymentType('subscription_days')}
                        disabled={isSpinning}
                        className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          paymentType === 'subscription_days'
                            ? 'bg-accent-500/15 text-accent-400'
                            : 'text-dark-400 hover:text-dark-200'
                        }`}
                      >
                        <CalendarIcon />
                        {t('wheel.days', { count: config.spin_cost_days ?? 0 })}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stars confirmation panel */}
              {showStarsConfirm && !isSpinning && !isPayingStars ? (
                <div className="space-y-3 rounded-xl border border-accent-500/30 bg-accent-500/5 p-4">
                  <p className="text-center text-sm text-dark-300">
                    {t('wheel.confirmStarsPayment')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowStarsConfirm(false)}
                      className="rounded-lg border border-dark-700 bg-dark-800 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleDirectStarsPay}
                      className="rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-600"
                    >
                      {t('wheel.payStars', { count: config.spin_cost_stars ?? 0 })}
                    </button>
                  </div>
                </div>
              ) : (
                /* Single Spin Button */
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleUnifiedSpin}
                  disabled={spinDisabled}
                  loading={isSpinning || isPayingStars}
                >
                  {isSpinning ? t('wheel.spinning') : t('wheel.spin')}
                </Button>
              )}

              {/* Cannot spin hint */}
              {!config.can_spin && !isSpinning && (
                <>
                  {config.can_spin_reason === 'daily_limit_reached' ? (
                    <div className="rounded-linear border border-dark-700/30 bg-dark-800/30 p-4 text-center">
                      <p className="text-dark-400">{t('wheel.errors.dailyLimitReached')}</p>
                    </div>
                  ) : config.can_spin_reason === 'insufficient_balance' ? (
                    <InsufficientBalancePrompt
                      missingAmountKopeks={
                        config.required_balance_kopeks - config.user_balance_kopeks
                      }
                    />
                  ) : (
                    <div className="rounded-linear border border-dark-700/30 bg-dark-800/30 p-4 text-center">
                      <p className="text-dark-400">{t('wheel.errors.cannotSpin')}</p>
                    </div>
                  )}
                </>
              )}

              {/* Inline Result Card */}
              {spinResult && !isSpinning && (
                <div
                  className={`animate-fade-in rounded-linear border p-4 ${
                    spinResult.success
                      ? 'border-accent-500/30 bg-accent-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-linear bg-dark-700/50 text-2xl">
                      {spinResult.success ? spinResult.emoji || '🎉' : '😔'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-dark-100">
                        {spinResult.success && spinResult.prize_display_name
                          ? spinResult.prize_display_name
                          : spinResult.success
                            ? spinResult.prize_type === 'nothing'
                              ? t('wheel.noLuck')
                              : t('wheel.congratulations')
                            : t('wheel.oops')}
                      </div>
                      <div className="text-sm text-dark-400">{spinResult.message}</div>
                    </div>
                    <button
                      onClick={closeResultModal}
                      className="shrink-0 rounded-lg p-2 text-dark-400 transition-colors hover:bg-white/5 hover:text-dark-200"
                    >
                      <CloseIcon />
                    </button>
                  </div>

                  {/* Promocode if won */}
                  {spinResult.promocode && (
                    <div className="mt-3 rounded-linear border border-accent-500/20 bg-accent-500/10 p-3 text-center">
                      <p className="mb-1 text-xs text-accent-400">{t('wheel.yourPromoCode')}</p>
                      <p className="select-all font-mono text-lg font-bold tracking-wider text-white">
                        {spinResult.promocode}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* End of left column: wheel and controls */}
          </div>

          {/* Right column (desktop) / Bottom (mobile): Prize Legend */}
          <div className="flex flex-col">
            <h3 className="mb-3 text-sm font-semibold text-dark-300">
              {t('wheel.prizes') || 'Призы'}
            </h3>
            <WheelLegend prizes={config.prizes} />
          </div>
        </div>
      </Card>

      {/* History Section - full width, collapsible */}
      <Card>
        <button
          onClick={() => setHistoryExpanded(!historyExpanded)}
          className="flex w-full items-center justify-between p-4"
        >
          <h3 className="flex items-center gap-2 font-semibold text-dark-100">
            <HistoryIcon />
            {t('wheel.recentSpins')}
            {history && history.items.length > 0 && (
              <span className="text-sm font-normal text-dark-500">({history.items.length})</span>
            )}
          </h3>
          <ChevronIcon expanded={historyExpanded} />
        </button>

        <AnimatePresence>
          {historyExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-dark-700/30 px-4 pb-4 pt-2">
                {history && history.items.length > 0 ? (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-2"
                  >
                    {history.items.map((item: SpinHistoryItem) => (
                      <motion.div
                        key={item.id}
                        variants={staggerItem}
                        className="flex items-center justify-between rounded-linear border border-dark-700/30 bg-dark-800/30 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-linear bg-dark-700/50 text-xl">
                            {item.emoji}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-dark-100">
                              {item.prize_display_name}
                            </div>
                            <div className="text-xs text-dark-500">
                              {new Date(item.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="whitespace-nowrap text-sm text-dark-400">
                          -
                          {item.payment_type === 'telegram_stars'
                            ? `${item.payment_amount} ⭐`
                            : `${item.payment_amount}${t('wheel.days').charAt(0)}`}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : (
                  <div className="py-6 text-center text-dark-500">
                    <div className="mb-2 text-3xl">🎰</div>
                    {t('wheel.noHistory')}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
