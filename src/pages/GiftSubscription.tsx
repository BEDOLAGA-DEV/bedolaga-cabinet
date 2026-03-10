import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { giftApi } from '../api/gift';
import type {
  GiftConfig,
  GiftTariff,
  GiftTariffPeriod,
  GiftPaymentMethod,
  GiftPurchaseRequest,
  SentGift,
  ReceivedGift,
} from '../api/gift';

import { cn } from '../lib/utils';
import { copyToClipboard } from '../utils/clipboard';
import { getApiErrorMessage } from '../utils/api-error';
import { formatPrice } from '../utils/format';

// ============================================================
// SVG Icons
// ============================================================

function GiftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <rect x="5" y="12" width="14" height="8" rx="1" />
      <line x1="12" y1="8" x2="12" y2="20" />
      <path d="M12 8c-2-2-4-3-5-2s0 3 2 4h3" />
      <path d="M12 8c2-2 4-3 5-2s0 3-2 4h-3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12l3 3 5-5" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="15.5" cy="8.5" r="5.5" />
      <path d="M11.5 12.5L3 21" />
      <path d="M3 21l3-1 1-3" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

// ============================================================
// Helpers
// ============================================================

function formatPeriodLabel(
  days: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const key = `landing.periodLabels.d${days}`;
  const result = t(key);
  if (result !== key) return result;

  const months = Math.floor(days / 30);
  const remainder = days % 30;
  if (months > 0 && remainder === 0) {
    return t('landing.periodLabels.nMonths', { count: months });
  }
  return t('landing.periodLabels.nDays', { count: days });
}

function getGiftStatusKey(status: string): string {
  const statusMap: Record<string, string> = {
    pending_activation: 'gift.statusPendingActivation',
    delivered: 'gift.statusDelivered',
    paid: 'gift.statusAvailable',
    pending: 'gift.statusPending',
    failed: 'gift.statusFailed',
    expired: 'gift.statusExpired',
  };
  return statusMap[status] ?? 'gift.statusPending';
}

function isGiftAvailable(status: string): boolean {
  return status === 'paid' || status === 'delivered' || status === 'pending_activation';
}

function isGiftActivated(gift: SentGift): boolean {
  return gift.status === 'delivered' && gift.activated_by_username != null;
}

function formatGiftDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(navigator.language || 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================================
// Tab type
// ============================================================

type TabId = 'buy' | 'activate' | 'myGifts';

// ============================================================
// Sub-components: Shared
// ============================================================

function LoadingSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-500/10">
          <svg
            className="h-8 w-8 text-error-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-dark-50">{t('gift.failedTitle')}</h2>
        <p className="text-sm text-dark-300">{message}</p>
      </div>
    </div>
  );
}

function DisabledState() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-800/50">
          <svg
            className="h-8 w-8 text-dark-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-dark-50">{t('gift.featureDisabled')}</h2>
        <p className="text-sm text-dark-300">{t('gift.redirecting')}</p>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components: Buy Tab
// ============================================================

function TariffCard({
  tariff,
  isSelected,
  onSelect,
}: {
  tariff: GiftTariff;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-200',
        isSelected
          ? 'border-accent-500/50 bg-accent-500/5'
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50',
      )}
    >
      {/* Gift circle icon */}
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors',
          isSelected ? 'bg-accent-500/20' : 'bg-dark-800/50',
        )}
      >
        <GiftIcon
          className={cn(
            'h-6 w-6 transition-colors',
            isSelected ? 'text-accent-400' : 'text-dark-400',
          )}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-dark-50">{tariff.name}</p>
        <p
          className={cn(
            'text-xs font-medium uppercase tracking-wider transition-colors',
            isSelected ? 'text-accent-400' : 'text-dark-400',
          )}
        >
          {tariff.traffic_limit_gb > 0
            ? `${tariff.traffic_limit_gb} ${t('gift.gbShort')}`
            : t('gift.unlimitedTraffic')}
          {' \u2022 '}
          {t('gift.deviceCount', { count: tariff.device_limit })}
        </p>
      </div>

      {/* Checkmark circle */}
      <div
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
        )}
      >
        {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
      </div>
    </button>
  );
}

function PeriodCard({
  period,
  isSelected,
  onSelect,
}: {
  period: GiftTariffPeriod;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const hasDiscount =
    period.original_price_kopeks != null && period.original_price_kopeks > period.price_kopeks;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl p-4 transition-all duration-200',
        isSelected
          ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25'
          : 'bg-dark-800/50 hover:bg-dark-700/50',
      )}
    >
      {/* Left: period + discount */}
      <div className="flex flex-col items-start gap-1">
        <span className="text-lg font-bold">{formatPeriodLabel(period.days, t)}</span>
        {hasDiscount && period.discount_percent != null && (
          <span
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-bold',
              isSelected ? 'bg-white/20 text-white' : 'bg-accent-500/20 text-accent-400',
            )}
          >
            -{period.discount_percent}%
          </span>
        )}
      </div>

      {/* Right: prices */}
      <div className="flex flex-col items-end gap-0.5">
        <span className={cn('text-lg font-bold', isSelected ? 'text-white' : 'text-accent-400')}>
          {formatPrice(period.price_kopeks)}
        </span>
        {hasDiscount && period.original_price_kopeks != null && (
          <span
            className={cn('text-xs line-through', isSelected ? 'text-white/50' : 'text-dark-500')}
          >
            {formatPrice(period.original_price_kopeks)}
          </span>
        )}
      </div>
    </button>
  );
}

function PaymentModeToggle({
  mode,
  onToggle,
  balanceLabel,
}: {
  mode: 'balance' | 'gateway';
  onToggle: (mode: 'balance' | 'gateway') => void;
  balanceLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t('gift.paymentMode')}
      className="flex rounded-xl bg-dark-800/50 p-1"
    >
      <button
        type="button"
        onClick={() => onToggle('balance')}
        aria-pressed={mode === 'balance'}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
          mode === 'balance'
            ? 'bg-dark-700 text-dark-50 shadow-sm'
            : 'text-dark-400 hover:text-dark-200',
        )}
      >
        {balanceLabel}
      </button>
      <button
        type="button"
        onClick={() => onToggle('gateway')}
        aria-pressed={mode === 'gateway'}
        className={cn(
          'flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
          mode === 'gateway'
            ? 'bg-dark-700 text-dark-50 shadow-sm'
            : 'text-dark-400 hover:text-dark-200',
        )}
      >
        {t('gift.viaGateway')}
      </button>
    </div>
  );
}

function PaymentMethodCard({
  method,
  isSelected,
  selectedSubOption,
  onSelect,
  onSelectSubOption,
}: {
  method: GiftPaymentMethod;
  isSelected: boolean;
  selectedSubOption: string | null;
  onSelect: () => void;
  onSelectSubOption: (subOptionId: string) => void;
}) {
  const hasSubOptions = method.sub_options && method.sub_options.length > 1;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200',
        isSelected
          ? 'border-accent-500/50 bg-accent-500/5'
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={onSelect}
        className="flex w-full items-center gap-4 p-4 text-start"
      >
        {method.icon_url && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark-800/50">
            <img src={method.icon_url} alt="" className="h-6 w-6 object-contain" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dark-100">{method.display_name}</p>
          {method.description && (
            <p className="mt-0.5 truncate text-xs text-dark-400">{method.description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
          )}
        >
          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
      </button>

      {isSelected && hasSubOptions && (
        <div className="border-t border-dark-800/30 px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {method.sub_options!.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectSubOption(opt.id)}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200',
                  selectedSubOption === opt.id
                    ? 'bg-accent-500 text-white shadow-sm shadow-accent-500/25'
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50',
                )}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BuyTabContent({
  config,
  onPurchaseComplete,
}: {
  config: GiftConfig;
  onPurchaseComplete: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Selection state
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<'balance' | 'gateway'>('balance');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Collect ALL unique periods across ALL tariffs
  const allPeriods = useMemo(() => {
    const periodMap = new Map<number, GiftTariffPeriod>();
    for (const tariff of config.tariffs) {
      for (const period of tariff.periods) {
        if (!periodMap.has(period.days)) {
          periodMap.set(period.days, period);
        }
      }
    }
    return Array.from(periodMap.values()).sort((a, b) => a.days - b.days);
  }, [config]);

  // Filter tariffs to only those that have the selected period
  const visibleTariffs = useMemo(() => {
    if (!selectedPeriodDays) return config.tariffs;
    return config.tariffs.filter((tariff) =>
      tariff.periods.some((p) => p.days === selectedPeriodDays),
    );
  }, [config, selectedPeriodDays]);

  // Auto-select first tariff, period, method on config load
  useEffect(() => {
    if (allPeriods.length > 0 && selectedPeriodDays === null) {
      setSelectedPeriodDays(allPeriods[0].days);
    }

    if (visibleTariffs.length > 0 && selectedTariffId === null) {
      setSelectedTariffId(visibleTariffs[0].id);
    }

    if (config.payment_methods.length > 0 && selectedMethod === null) {
      const firstMethod = config.payment_methods[0];
      setSelectedMethod(firstMethod.method_id);
      if (firstMethod.sub_options && firstMethod.sub_options.length >= 1) {
        setSelectedSubOption(firstMethod.sub_options[0].id);
      } else {
        setSelectedSubOption(null);
      }
    }
  }, [config, allPeriods, visibleTariffs, selectedTariffId, selectedPeriodDays, selectedMethod]);

  // When period changes, auto-select first visible tariff if current is hidden
  useEffect(() => {
    if (!visibleTariffs.length) return;
    const currentVisible = visibleTariffs.find((tariff) => tariff.id === selectedTariffId);
    if (!currentVisible) {
      setSelectedTariffId(visibleTariffs[0].id);
    }
  }, [visibleTariffs, selectedTariffId]);

  // Derived data
  const selectedTariff = useMemo(
    () => config.tariffs.find((tr) => tr.id === selectedTariffId),
    [config.tariffs, selectedTariffId],
  );

  const selectedPeriod = useMemo(
    () => selectedTariff?.periods.find((p) => p.days === selectedPeriodDays),
    [selectedTariff, selectedPeriodDays],
  );

  const currentPrice = selectedPeriod?.price_kopeks ?? 0;

  const insufficientBalance = paymentMode === 'balance' && config.balance_kopeks < currentPrice;

  // Validation
  const canSubmit = useMemo(() => {
    if (!selectedTariffId || !selectedPeriodDays) return false;
    if (paymentMode === 'gateway' && !selectedMethod) return false;
    if (insufficientBalance) return false;
    return true;
  }, [selectedTariffId, selectedPeriodDays, paymentMode, selectedMethod, insufficientBalance]);

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (data: GiftPurchaseRequest) => giftApi.createPurchase(data),
    onSuccess: (result) => {
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        // Balance purchase: switch to MyGifts tab so the new code is visible
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['gift-config'] });
        queryClient.invalidateQueries({ queryKey: ['gift-sent'] });
        onPurchaseComplete();
      }
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err, t('gift.failedDesc'));
      setSubmitError(msg);
    },
  });

  // Submit handler
  const handleSubmit = () => {
    if (!selectedTariffId || !selectedPeriodDays || !canSubmit || purchaseMutation.isPending)
      return;

    setSubmitError(null);

    let paymentMethod: string | undefined;
    if (paymentMode === 'gateway' && selectedMethod) {
      paymentMethod = selectedMethod;
      if (selectedSubOption) {
        paymentMethod = `${paymentMethod}_${selectedSubOption}`;
      }
    }

    const data: GiftPurchaseRequest = {
      tariff_id: selectedTariffId,
      period_days: selectedPeriodDays,
      payment_mode: paymentMode,
      payment_method: paymentMethod,
    };

    purchaseMutation.mutate(data);
  };

  // Balance label with current amount
  const balanceLabel = useMemo(() => {
    return `${t('gift.fromBalance')} (${formatPrice(config.balance_kopeks)})`;
  }, [config, t]);

  const showTariffCards = visibleTariffs.length > 1;

  // Periods for the selected tariff (for period cards)
  const periodsForDisplay = useMemo(() => {
    if (selectedTariff) {
      return [...selectedTariff.periods].sort((a, b) => a.days - b.days);
    }
    return allPeriods;
  }, [selectedTariff, allPeriods]);

  return (
    <div className="space-y-6">
      {/* Tariff selection */}
      {showTariffCards && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
            {t('gift.selectTariff')}
          </h2>
          <div role="radiogroup" aria-label={t('gift.chooseTariff')} className="space-y-2">
            {visibleTariffs.map((tariff) => (
              <TariffCard
                key={tariff.id}
                tariff={tariff}
                isSelected={tariff.id === selectedTariffId}
                onSelect={() => setSelectedTariffId(tariff.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selected tariff description */}
      {selectedTariff?.description && (
        <div className="rounded-xl border border-dark-800/30 bg-dark-800/20 px-4 py-3">
          <p className="text-sm text-dark-300">{selectedTariff.description}</p>
        </div>
      )}

      {/* Period selection */}
      {periodsForDisplay.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
            {t('gift.selectPeriod')}
          </h2>
          <div className="space-y-2">
            {periodsForDisplay.map((period) => (
              <PeriodCard
                key={period.days}
                period={period}
                isSelected={period.days === selectedPeriodDays}
                onSelect={() => setSelectedPeriodDays(period.days)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Payment mode toggle */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
          {t('gift.paymentMode')}
        </h2>
        <PaymentModeToggle
          mode={paymentMode}
          onToggle={setPaymentMode}
          balanceLabel={balanceLabel}
        />
      </div>

      {/* Payment method cards (gateway mode only) */}
      <AnimatePresence mode="wait">
        {paymentMode === 'gateway' && config.payment_methods.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div role="radiogroup" aria-label={t('gift.paymentMethod')} className="space-y-2">
              {config.payment_methods.map((method) => (
                <PaymentMethodCard
                  key={method.method_id}
                  method={method}
                  isSelected={method.method_id === selectedMethod}
                  selectedSubOption={method.method_id === selectedMethod ? selectedSubOption : null}
                  onSelect={() => {
                    setSelectedMethod(method.method_id);
                    if (method.sub_options && method.sub_options.length >= 1) {
                      setSelectedSubOption(method.sub_options[0].id);
                    } else {
                      setSelectedSubOption(null);
                    }
                  }}
                  onSelectSubOption={setSelectedSubOption}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary / Balance info */}
      {paymentMode === 'balance' && (
        <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('gift.yourBalance')}</span>
            <span className="text-sm font-semibold text-dark-200">
              {formatPrice(config.balance_kopeks)}
            </span>
          </div>
        </div>
      )}

      {/* Insufficient balance warning */}
      <AnimatePresence>
        {insufficientBalance && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-warning-500/20 bg-warning-500/5 p-3"
          >
            <p className="text-sm text-warning-400">
              {t('gift.insufficientBalance')}{' '}
              <Link
                to="/balance"
                className="font-medium text-accent-400 underline underline-offset-2"
              >
                {t('gift.topUpBalance')}
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-error-500/20 bg-error-500/5 p-3"
          >
            <p className="text-sm text-error-400">{submitError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || purchaseMutation.isPending}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200',
          canSubmit && !purchaseMutation.isPending
            ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25 hover:bg-accent-400 hover:shadow-accent-500/40 active:scale-[0.98]'
            : 'cursor-not-allowed bg-dark-800 text-dark-500',
        )}
      >
        {purchaseMutation.isPending ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            {t('gift.giftButton')} {currentPrice > 0 ? formatPrice(currentPrice) : ''}
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Sub-components: Activate Tab
// ============================================================

function ActivateTabContent({ initialCode }: { initialCode?: string | null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [code, setCode] = useState(initialCode ?? '');

  // Sync when initialCode changes (e.g. URL param update while tab is active)
  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);
  const [activateError, setActivateError] = useState<string | null>(null);

  const activateMutation = useMutation({
    mutationFn: (giftCode: string) => giftApi.activateGiftCode(giftCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-received'] });
      queryClient.invalidateQueries({ queryKey: ['gift-sent'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    },
    onError: (err) => {
      const raw = getApiErrorMessage(err, '');
      const msg =
        raw === 'Cannot activate your own gift'
          ? t('gift.activateSelfError')
          : raw || t('gift.activateError');
      setActivateError(msg);
    },
  });

  const handleActivate = () => {
    const trimmed = code.trim();
    if (!trimmed || activateMutation.isPending) return;
    setActivateError(null);
    activateMutation.mutate(trimmed);
  };

  if (activateMutation.isSuccess && activateMutation.data) {
    const result = activateMutation.data;
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/20">
          <CheckCircleIcon className="h-8 w-8 text-accent-400" />
        </div>
        <h2 className="text-xl font-bold text-dark-50">{t('gift.activateSuccess')}</h2>
        <p className="text-sm text-dark-300">
          {t('gift.activateSuccessDesc', {
            tariff: result.tariff_name ?? '',
            days: result.period_days ?? 0,
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Icon + title */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-500/20">
          <KeyIcon className="h-8 w-8 text-accent-400" />
        </div>
        <h2 className="text-xl font-bold text-dark-50">{t('gift.activateTitle')}</h2>
        <p className="max-w-xs text-sm text-dark-400">{t('gift.activateDescription')}</p>
      </div>

      {/* Code input */}
      <div className="w-full max-w-sm">
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setActivateError(null);
          }}
          placeholder={t('gift.activateCodePlaceholder')}
          className="w-full rounded-2xl border border-dark-700/50 bg-dark-800/50 px-6 py-4 text-center font-mono text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
          aria-label={t('gift.activateTitle')}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {activateError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-sm rounded-xl border border-error-500/20 bg-error-500/5 p-3"
          >
            <p className="text-center text-sm text-error-400">{activateError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      <button
        type="button"
        onClick={handleActivate}
        disabled={!code.trim() || activateMutation.isPending}
        className={cn(
          'w-full max-w-sm rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200',
          code.trim() && !activateMutation.isPending
            ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25 hover:bg-accent-400 active:scale-[0.98]'
            : 'cursor-not-allowed bg-dark-800 text-dark-500',
        )}
      >
        {activateMutation.isPending ? (
          <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          t('gift.activateButton')
        )}
      </button>
    </div>
  );
}

// ============================================================
// Sub-components: My Gifts Tab
// ============================================================

function CopiedToast({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 2000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center"
    >
      <div className="flex items-center gap-2 rounded-full border border-dark-700/50 bg-dark-900/95 px-5 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-md">
        <CheckIcon className="h-4 w-4 text-success-400" />
        <span className="text-sm font-medium text-success-400">{t('gift.shareToastCopied')}</span>
      </div>
    </motion.div>
  );
}

function SentGiftCard({ gift }: { gift: SentGift }) {
  const { t } = useTranslation();
  const [showToast, setShowToast] = useState(false);

  const shortCode = gift.token.slice(0, 12);
  const giftCode = `GIFT-${shortCode}`;
  const isActivated = isGiftActivated(gift);
  const isAvailable = !isActivated && isGiftAvailable(gift.status);

  const statusText = isActivated
    ? t('gift.statusActivated')
    : isAvailable
      ? t('gift.statusAvailable')
      : t(getGiftStatusKey(gift.status));

  const buildShareMessage = useCallback(() => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;
    const botLink = botUsername ? `https://t.me/${botUsername}?start=GIFT_${shortCode}` : null;
    const cabinetLink = `${window.location.origin}/gift?tab=activate&code=${shortCode}`;
    return [
      t('gift.shareText'),
      '',
      botLink ? `${t('gift.shareModalActivateVia')} ${botLink}` : null,
      `${t('gift.shareModalActivateViaCabinet')} ${cabinetLink}`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [shortCode, t]);

  const handleShare = useCallback(async () => {
    const message = buildShareMessage();
    await copyToClipboard(message);
    setShowToast(true);
  }, [buildShareMessage]);

  const handleDismissToast = useCallback(() => setShowToast(false), []);

  return (
    <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-4">
      {/* Header: tariff name + status badge */}
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-base font-bold text-dark-50">{gift.tariff_name ?? t('gift.tariff')}</h3>
        <span
          className={cn(
            'rounded-lg px-2.5 py-1 text-xs font-bold',
            isActivated
              ? 'bg-dark-700 text-dark-400'
              : isAvailable
                ? 'bg-success-500/20 text-success-400'
                : 'bg-dark-700 text-dark-400',
          )}
        >
          {statusText}
        </span>
      </div>

      {/* Info line */}
      <p className="mb-3 text-xs text-dark-400">
        {formatGiftDate(gift.created_at)}
        {' \u2022 '}
        {gift.period_days} {t('gift.daysShort')}
        {' \u2022 '}
        {gift.device_limit} {t('gift.devicesShort', { count: gift.device_limit })}
      </p>

      {/* Gift code + actions (only when not activated) */}
      {!isActivated && (
        <>
          {/* Gift code display */}
          <div className="mb-3 rounded-xl bg-dark-800/80 px-4 py-4 text-center">
            <p className="font-mono text-base font-bold tracking-[0.15em] text-accent-400">
              {giftCode}
            </p>
          </div>

          {/* Share button — copies message and shows toast */}
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-400 active:scale-[0.98]"
          >
            <ShareIcon className="h-4 w-4" />
            {t('gift.shareGift')}
          </button>
        </>
      )}

      {/* Activated by */}
      {isActivated && gift.activated_by_username && (
        <p className="mt-2 text-xs text-dark-500">
          {t('gift.activatedBy', { username: gift.activated_by_username })}
        </p>
      )}

      {/* Sent to */}
      {gift.gift_recipient_value && (
        <p className="mt-1 text-xs text-dark-500">
          {t('gift.sentTo', { recipient: gift.gift_recipient_value })}
        </p>
      )}

      {/* Copied toast — portal to escape motion.div transform context */}
      {createPortal(
        <AnimatePresence>
          {showToast && <CopiedToast onDismiss={handleDismissToast} />}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

function ReceivedGiftCard({ gift }: { gift: ReceivedGift }) {
  const { t } = useTranslation();

  const statusKey = getGiftStatusKey(gift.status);
  const statusText = t(statusKey);

  return (
    <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-4">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-base font-bold text-dark-50">{gift.tariff_name ?? t('gift.tariff')}</h3>
        <span className="rounded-lg bg-dark-700 px-2.5 py-1 text-xs font-bold text-dark-400">
          {statusText}
        </span>
      </div>

      {/* Info line */}
      <p className="mb-2 text-xs text-dark-400">
        {formatGiftDate(gift.created_at)}
        {' \u2022 '}
        {gift.period_days} {t('gift.daysShort')}
        {' \u2022 '}
        {gift.device_limit} {t('gift.devicesShort', { count: gift.device_limit })}
      </p>

      {/* Sender */}
      {gift.sender_display && (
        <p className="text-xs text-dark-500">
          {t('gift.pending.from', { sender: gift.sender_display })}
        </p>
      )}

      {/* Gift message */}
      {gift.gift_message && (
        <div className="mt-2 rounded-xl bg-dark-800/50 p-3">
          <p className="text-xs italic text-dark-300">{gift.gift_message}</p>
        </div>
      )}
    </div>
  );
}

function MyGiftsTabContent() {
  const { t } = useTranslation();

  const {
    data: sentGifts,
    isLoading: sentLoading,
    error: sentError,
  } = useQuery({
    queryKey: ['gift-sent'],
    queryFn: giftApi.getSentGifts,
    staleTime: 30_000,
  });

  const {
    data: receivedGifts,
    isLoading: receivedLoading,
    error: receivedError,
  } = useQuery({
    queryKey: ['gift-received'],
    queryFn: giftApi.getReceivedGifts,
    staleTime: 30_000,
  });

  const isLoading = sentLoading || receivedLoading;

  // Split sent gifts into active (awaiting activation) and activated
  const activeGifts = useMemo(
    () => (sentGifts ?? []).filter((g) => !isGiftActivated(g)),
    [sentGifts],
  );
  const activatedGifts = useMemo(
    () => (sentGifts ?? []).filter((g) => isGiftActivated(g)),
    [sentGifts],
  );

  const hasActive = activeGifts.length > 0;
  const hasActivated = activatedGifts.length > 0;
  const hasReceived = receivedGifts && receivedGifts.length > 0;
  const isEmpty = !hasActive && !hasActivated && !hasReceived;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-dark-600 border-t-accent-500" />
      </div>
    );
  }

  if (sentError || receivedError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-error-400">{t('gift.failedDesc')}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dark-800/50">
          <InboxIcon className="h-8 w-8 text-dark-400" />
        </div>
        <h2 className="text-lg font-semibold text-dark-200">{t('gift.myGiftsEmpty')}</h2>
        <p className="max-w-xs text-sm text-dark-400">{t('gift.myGiftsEmptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active gifts (awaiting activation) */}
      {hasActive && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
            {t('gift.activeGiftsTitle')}
          </h2>
          <div className="space-y-3">
            {activeGifts.map((gift) => (
              <SentGiftCard key={gift.token} gift={gift} />
            ))}
          </div>
        </div>
      )}

      {/* Activated gifts */}
      {hasActivated && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
            {t('gift.activatedGiftsTitle')}
          </h2>
          <div className="space-y-3">
            {activatedGifts.map((gift) => (
              <SentGiftCard key={gift.token} gift={gift} />
            ))}
          </div>
        </div>
      )}

      {/* Received gifts */}
      {hasReceived && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-dark-400">
            {t('gift.receivedGiftsTitle')}
          </h2>
          <div className="space-y-3">
            {receivedGifts!.map((gift) => (
              <ReceivedGiftCard key={gift.token} gift={gift} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tab animation variants
// ============================================================

const tabContentVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

// ============================================================
// Main Component
// ============================================================

export default function GiftSubscription() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  // URL params: ?tab=activate&code=TOKEN for auto-activation
  const urlTab = searchParams.get('tab') as TabId | null;
  const urlCode = searchParams.get('code');
  const [activeTab, setActiveTab] = useState<TabId>(
    urlTab === 'activate' || urlTab === 'myGifts' ? urlTab : 'buy',
  );

  // Fetch config
  const {
    data: config,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['gift-config'],
    queryFn: giftApi.getConfig,
    staleTime: 30_000,
  });

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !config) {
    const errMsg = getApiErrorMessage(error, t('gift.notFound'));
    return <ErrorState message={errMsg} />;
  }

  // Disabled state
  if (!config.is_enabled) {
    return <DisabledState />;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'buy', label: t('gift.tabBuy') },
    { id: 'activate', label: t('gift.tabActivate') },
    { id: 'myGifts', label: t('gift.tabMyGifts') },
  ];

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/20">
            <GiftIcon className="h-5 w-5 text-accent-400" />
          </div>
          <h1 className="text-2xl font-bold text-dark-50">{t('gift.pageTitle')}</h1>
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-6 rounded-2xl bg-dark-800/50 p-1"
        >
          <div className="flex" role="tablist" aria-label={t('gift.pageTitle')}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  activeTab === tab.id
                    ? 'bg-accent-500 text-white shadow-sm'
                    : 'text-dark-400 hover:text-dark-200',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2 }}
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {activeTab === 'buy' && (
              <BuyTabContent config={config} onPurchaseComplete={() => setActiveTab('myGifts')} />
            )}
            {activeTab === 'activate' && <ActivateTabContent initialCode={urlCode} />}
            {activeTab === 'myGifts' && <MyGiftsTabContent />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
