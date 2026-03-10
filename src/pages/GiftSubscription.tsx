import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
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
} from '../api/gift';

import { cn } from '../lib/utils';
import { getApiErrorMessage } from '../utils/api-error';
import { formatPrice } from '../utils/format';

// ============================================================
// Helpers
// ============================================================

function detectContactType(value: string): 'email' | 'telegram' {
  return value.startsWith('@') ? 'telegram' : 'email';
}

function isValidContact(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('@')) {
    return /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(trimmed);
  }
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

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

// ============================================================
// Sub-components
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
        <h2 className="text-lg font-semibold text-dark-50">{t('gift.failedTitle', 'Error')}</h2>
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
        <h2 className="text-lg font-semibold text-dark-50">
          {t('gift.featureDisabled', 'Gift subscriptions are currently unavailable')}
        </h2>
        <p className="text-sm text-dark-300">{t('gift.redirecting', 'Redirecting...')}</p>
      </div>
    </div>
  );
}

function PeriodTabs({
  periods,
  selectedDays,
  onSelect,
}: {
  periods: GiftTariffPeriod[];
  selectedDays: number;
  onSelect: (days: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-2">
      {periods.map((period) => (
        <button
          key={period.days}
          type="button"
          onClick={() => onSelect(period.days)}
          className={cn(
            'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
            selectedDays === period.days
              ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25'
              : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50 hover:text-dark-100',
          )}
        >
          {formatPeriodLabel(period.days, t)}
        </button>
      ))}
    </div>
  );
}

function TariffCard({
  tariff,
  isSelected,
  selectedPeriod,
  onSelect,
}: {
  tariff: GiftTariff;
  isSelected: boolean;
  selectedPeriod: GiftTariffPeriod | undefined;
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
        'relative flex w-full flex-col rounded-2xl border p-5 text-start transition-all duration-200',
        isSelected
          ? 'border-accent-500/50 bg-accent-500/5 ring-1 ring-accent-500/25'
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50 hover:bg-dark-800/30',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-dark-50">{tariff.name}</h3>
          {tariff.description && (
            <p className="mt-0.5 text-xs text-dark-400">{tariff.description}</p>
          )}
        </div>
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
          )}
        >
          {isSelected && (
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-dark-400">
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          {tariff.traffic_limit_gb === 0 ? '\u221E' : tariff.traffic_limit_gb}{' '}
          {t('landing.gb', 'GB')}
        </span>
        <span className="flex items-center gap-1">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
            />
          </svg>
          {tariff.device_limit} {t('landing.devices', 'devices')}
        </span>
      </div>

      {/* Price */}
      {selectedPeriod && (
        <div className="mt-3 border-t border-dark-800/30 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-accent-400">
              {formatPrice(selectedPeriod.price_kopeks)}
            </span>
            {selectedPeriod.original_price_kopeks != null &&
              selectedPeriod.original_price_kopeks > selectedPeriod.price_kopeks && (
                <>
                  <span className="text-sm text-dark-500 line-through">
                    {formatPrice(selectedPeriod.original_price_kopeks)}
                  </span>
                  {selectedPeriod.discount_percent != null && (
                    <span className="rounded-full bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-400">
                      -{selectedPeriod.discount_percent}%
                    </span>
                  )}
                </>
              )}
          </div>
        </div>
      )}
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
      aria-label={t('gift.paymentMode', 'Payment mode')}
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
        {t('gift.viaGateway', 'Via payment gateway')}
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
          : 'border-dark-800/50 bg-dark-900/50 hover:border-dark-700/50 hover:bg-dark-800/30',
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={isSelected}
        onClick={onSelect}
        className="flex w-full items-center gap-4 p-4 text-start"
      >
        {/* Icon */}
        {method.icon_url && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-dark-800/50">
            <img src={method.icon_url} alt="" className="h-6 w-6 object-contain" />
          </div>
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-dark-100">{method.display_name}</p>
          {method.description && (
            <p className="mt-0.5 truncate text-xs text-dark-400">{method.description}</p>
          )}
        </div>

        {/* Radio */}
        <div
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
            isSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600',
          )}
        >
          {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
        </div>
      </button>

      {/* Sub-options */}
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
                    : 'bg-dark-800/50 text-dark-300 hover:bg-dark-700/50 hover:text-dark-100',
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

function RecipientSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-2xl border border-dark-800/50 bg-dark-900/50 p-5">
      <div>
        <label
          htmlFor="gift-recipient-input"
          className="mb-2 block text-sm font-medium text-dark-200"
        >
          {t('gift.recipient', 'Recipient')}
        </label>
        <input
          id="gift-recipient-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('gift.recipientPlaceholder', 'email@example.com or @telegram')}
          className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
        />
        <p className="mt-1.5 text-xs text-dark-500">
          {t(
            'gift.recipientHint',
            'Enter the email or Telegram username of the person you want to gift',
          )}
        </p>
      </div>
    </div>
  );
}

function GiftMessageSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-5">
          <label
            htmlFor="gift-message-input"
            className="mb-2 block text-sm font-medium text-dark-200"
          >
            {t('gift.giftMessage', 'Personal message')}
          </label>
          <textarea
            id="gift-message-input"
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= 1000) {
                onChange(e.target.value);
              }
            }}
            placeholder={t(
              'gift.giftMessagePlaceholder',
              'Add a personal message for the recipient (optional)',
            )}
            rows={3}
            maxLength={1000}
            className="w-full resize-none rounded-xl border border-dark-700/50 bg-dark-800/50 px-4 py-3 text-sm text-dark-50 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/25"
          />
          <p className="mt-1 text-right text-xs text-dark-500">{value.length}/1000</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function GiftSummaryCard({
  config,
  selectedTariff,
  selectedPeriod,
  currentPrice,
  paymentMode,
  isSubmitting,
  canSubmit,
  submitError,
  insufficientBalance,
  onSubmit,
}: {
  config: GiftConfig;
  selectedTariff: GiftTariff | undefined;
  selectedPeriod: GiftTariffPeriod | undefined;
  currentPrice: number;
  paymentMode: 'balance' | 'gateway';
  isSubmitting: boolean;
  canSubmit: boolean;
  submitError: string | null;
  insufficientBalance: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl border border-dark-800/50 bg-dark-900/50 p-5">
        {selectedTariff && (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
              {t('gift.tariff', 'Tariff')}
            </p>
            <p className="mt-1 text-sm font-semibold text-dark-50">{selectedTariff.name}</p>
          </div>
        )}
        {selectedPeriod && (
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
              {t('gift.period', 'Period')}
            </p>
            <p className="mt-1 text-sm text-dark-200">
              {formatPeriodLabel(selectedPeriod.days, t)}
            </p>
          </div>
        )}
        <div className="border-t border-dark-800/50 pt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
            {t('gift.total', 'Total')}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-bold text-accent-400">{formatPrice(currentPrice)}</span>
            {selectedPeriod?.original_price_kopeks != null &&
              selectedPeriod.original_price_kopeks > selectedPeriod.price_kopeks && (
                <>
                  <span className="text-base text-dark-500 line-through">
                    {formatPrice(selectedPeriod.original_price_kopeks)}
                  </span>
                  {selectedPeriod.discount_percent != null && (
                    <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-bold text-accent-400">
                      -{selectedPeriod.discount_percent}%
                    </span>
                  )}
                </>
              )}
          </div>
        </div>

        {/* Balance info for balance mode */}
        {paymentMode === 'balance' && (
          <div className="mt-4 border-t border-dark-800/50 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-dark-500">
              {t('gift.yourBalance', 'Your balance')}
            </p>
            <p className="mt-1 text-sm font-semibold text-dark-200">
              {formatPrice(config.balance_kopeks)}
            </p>
          </div>
        )}
      </div>

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
              {t('gift.insufficientBalance', 'Insufficient balance.')}{' '}
              <Link
                to="/balance"
                className="font-medium text-accent-400 underline underline-offset-2"
              >
                {t('gift.topUpBalance', 'Top up balance')}
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

      {/* Gift button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200',
          canSubmit && !isSubmitting
            ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/25 hover:bg-accent-400 hover:shadow-accent-500/40 active:scale-[0.98]'
            : 'cursor-not-allowed bg-dark-800 text-dark-500',
        )}
      >
        {isSubmitting ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            {t('gift.giftButton', 'Gift')} {formatPrice(currentPrice)}
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function GiftSubscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Selection state
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [selectedPeriodDays, setSelectedPeriodDays] = useState<number | null>(null);
  const [recipientValue, setRecipientValue] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [paymentMode, setPaymentMode] = useState<'balance' | 'gateway'>('balance');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Collect ALL unique periods across ALL tariffs
  const allPeriods = useMemo(() => {
    if (!config) return [];
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
    if (!config || !selectedPeriodDays) return config?.tariffs ?? [];
    return config.tariffs.filter((tariff) =>
      tariff.periods.some((p) => p.days === selectedPeriodDays),
    );
  }, [config, selectedPeriodDays]);

  // Auto-select first tariff, period, method on config load
  useEffect(() => {
    if (!config) return;

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
    () => config?.tariffs.find((tr) => tr.id === selectedTariffId),
    [config?.tariffs, selectedTariffId],
  );

  const selectedPeriod = useMemo(
    () => selectedTariff?.periods.find((p) => p.days === selectedPeriodDays),
    [selectedTariff, selectedPeriodDays],
  );

  const currentPrice = selectedPeriod?.price_kopeks ?? 0;

  const insufficientBalance =
    paymentMode === 'balance' && config != null && config.balance_kopeks < currentPrice;

  // Validation
  const canSubmit = useMemo(() => {
    if (!selectedTariffId || !selectedPeriodDays) return false;
    if (!isValidContact(recipientValue)) return false;
    if (paymentMode === 'gateway' && !selectedMethod) return false;
    if (insufficientBalance) return false;
    return true;
  }, [
    selectedTariffId,
    selectedPeriodDays,
    recipientValue,
    paymentMode,
    selectedMethod,
    insufficientBalance,
  ]);

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: (data: GiftPurchaseRequest) => giftApi.createPurchase(data),
    onSuccess: (result) => {
      if (result.payment_url) {
        window.location.href = result.payment_url;
      } else {
        // Balance mode - show success
        queryClient.invalidateQueries({ queryKey: ['balance'] });
        queryClient.invalidateQueries({ queryKey: ['gift-config'] });
        const params = new URLSearchParams({ token: result.purchase_token, mode: 'balance' });
        if (result.warning) {
          params.set('warning', result.warning);
        }
        navigate('/gift/result?' + params.toString());
      }
    },
    onError: (err) => {
      const msg = getApiErrorMessage(
        err,
        t('gift.failedDesc', 'Something went wrong. Please try again.'),
      );
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
      recipient_type: detectContactType(recipientValue),
      recipient_value: recipientValue.trim(),
      gift_message: giftMessage.trim() || undefined,
      payment_mode: paymentMode,
      payment_method: paymentMethod,
    };

    purchaseMutation.mutate(data);
  };

  // Balance label with current amount
  const balanceLabel = useMemo(() => {
    if (!config) return t('gift.fromBalance', 'From balance');
    return `${t('gift.fromBalance', 'From balance')} (${formatPrice(config.balance_kopeks)})`;
  }, [config, t]);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !config) {
    const errMsg = getApiErrorMessage(error, t('gift.notFound', 'Gift configuration not found'));
    return <ErrorState message={errMsg} />;
  }

  // Disabled state
  if (!config.is_enabled) {
    return <DisabledState />;
  }

  const showTariffCards = visibleTariffs.length > 1;

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight text-dark-50 sm:text-4xl">
            {t('gift.title', 'Gift Subscription')}
          </h1>
          <p className="mt-3 text-base text-dark-300 sm:text-lg">
            {t('gift.subtitle', 'Give the gift of secure internet to someone special')}
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="min-w-0 space-y-6"
          >
            {/* Period tabs */}
            {allPeriods.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                  {t('gift.choosePeriod', 'Choose period')}
                </h2>
                <PeriodTabs
                  periods={allPeriods}
                  selectedDays={selectedPeriodDays ?? 0}
                  onSelect={setSelectedPeriodDays}
                />
              </div>
            )}

            {/* Tariff cards */}
            {showTariffCards && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                  {t('gift.chooseTariff', 'Choose tariff')}
                </h2>
                <div
                  role="radiogroup"
                  aria-label={t('gift.chooseTariff', 'Choose tariff')}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {visibleTariffs.map((tariff) => {
                    const period = tariff.periods.find((p) => p.days === selectedPeriodDays);
                    return (
                      <TariffCard
                        key={tariff.id}
                        tariff={tariff}
                        isSelected={tariff.id === selectedTariffId}
                        selectedPeriod={period}
                        onSelect={() => setSelectedTariffId(tariff.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipient */}
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                {t('gift.recipientLabel', 'Recipient')}
              </h2>
              <RecipientSection
                value={recipientValue}
                onChange={(v) => {
                  setRecipientValue(v);
                  setSubmitError(null);
                }}
              />
            </div>

            {/* Gift message */}
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                {t('gift.giftMessageLabel', 'Message')}
              </h2>
              <GiftMessageSection value={giftMessage} onChange={setGiftMessage} />
            </div>

            {/* Payment mode toggle */}
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-dark-400">
                {t('gift.paymentMode', 'Payment method')}
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
                  <div
                    role="radiogroup"
                    aria-label={t('gift.paymentMethod', 'Payment method')}
                    className="space-y-2"
                  >
                    {config.payment_methods.map((method) => (
                      <PaymentMethodCard
                        key={method.method_id}
                        method={method}
                        isSelected={method.method_id === selectedMethod}
                        selectedSubOption={
                          method.method_id === selectedMethod ? selectedSubOption : null
                        }
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
          </motion.div>

          {/* Right column (sticky sidebar / bottom on mobile) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="min-w-0 lg:sticky lg:top-8 lg:self-start"
          >
            <GiftSummaryCard
              config={config}
              selectedTariff={selectedTariff}
              selectedPeriod={selectedPeriod}
              currentPrice={currentPrice}
              paymentMode={paymentMode}
              isSubmitting={purchaseMutation.isPending}
              canSubmit={canSubmit}
              submitError={submitError}
              insufficientBalance={insufficientBalance}
              onSubmit={handleSubmit}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
