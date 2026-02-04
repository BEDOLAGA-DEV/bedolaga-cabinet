import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useCurrency } from '../hooks/useCurrency';
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit';
import { useCloseOnSuccessNotification } from '../store/successNotification';
import { useBackButton, useHaptic, usePlatform } from '@/platform';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import type { PaymentMethod } from '../types';
import BentoCard from '../components/ui/BentoCard';

// Icons
const StarIcon = () => (
  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const CardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);

const CryptoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
    />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const getMethodIcon = (methodId: string) => {
  const id = methodId.toLowerCase();
  if (id.includes('stars')) return <StarIcon />;
  if (id.includes('crypto') || id.includes('ton') || id.includes('usdt')) return <CryptoIcon />;
  return <CardIcon />;
};

export default function TopUpAmount() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { methodId } = useParams<{ methodId: string }>();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } =
    useCurrency();
  const { openInvoice } = usePlatform();
  const haptic = useHaptic();
  const inputRef = useRef<HTMLInputElement>(null);

  const returnTo = searchParams.get('returnTo');
  const initialAmountRubles = searchParams.get('amount')
    ? parseFloat(searchParams.get('amount')!)
    : undefined;

  // Get method from cached payment-methods query
  const cachedMethods = queryClient.getQueryData<PaymentMethod[]>(['payment-methods']);
  const method = cachedMethods?.find((m) => m.id === methodId);

  const handleNavigateBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSuccess = useCallback(() => {
    navigate(returnTo || '/balance', { replace: true });
  }, [navigate, returnTo]);

  // Telegram back button
  useBackButton(handleNavigateBack);

  // Keyboard: Escape to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleNavigateBack();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNavigateBack]);

  // Auto-redirect when success notification appears (e.g., balance topped up via WebSocket)
  useCloseOnSuccessNotification(handleSuccess);

  const getInitialAmount = (): string => {
    if (!initialAmountRubles || initialAmountRubles <= 0) return '';
    const converted = convertAmount(initialAmountRubles);
    return targetCurrency === 'IRR' || targetCurrency === 'RUB'
      ? Math.ceil(converted).toString()
      : converted.toFixed(2);
  };

  const [amount, setAmount] = useState(getInitialAmount);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(
    method?.options && method.options.length > 0 ? method.options[0].id : null,
  );
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // If method not found in cache, redirect to method selection
  useEffect(() => {
    if (cachedMethods && !method) {
      const params = new URLSearchParams();
      const amount = searchParams.get('amount');
      const rt = searchParams.get('returnTo');
      if (amount) params.set('amount', amount);
      if (rt) params.set('returnTo', rt);
      const qs = params.toString();
      navigate(`/balance/top-up${qs ? `?${qs}` : ''}`, { replace: true });
    }
  }, [cachedMethods, method, navigate, searchParams]);

  const starsPaymentMutation = useMutation({
    mutationFn: (amountKopeks: number) => balanceApi.createStarsInvoice(amountKopeks),
    onSuccess: async (data) => {
      if (!data.invoice_url) {
        setError(t('balance.errors.noPaymentLink'));
        return;
      }
      try {
        const status = await openInvoice(data.invoice_url);
        if (status === 'paid') {
          haptic.notification('success');
          setError(null);
          handleSuccess();
        } else if (status === 'failed') {
          haptic.notification('error');
          setError(t('wheel.starsPaymentFailed'));
        }
      } catch (e) {
        setError(t('balance.errors.generic', { details: String(e) }));
      }
    },
    onError: (err: unknown) => {
      haptic.notification('error');
      const axiosError = err as { response?: { data?: { detail?: string }; status?: number } };
      setError(axiosError?.response?.data?.detail || t('balance.errors.invoiceFailed'));
    },
  });

  const topUpMutation = useMutation<
    {
      payment_id: string;
      payment_url?: string;
      invoice_url?: string;
      amount_kopeks: number;
      amount_rubles: number;
      status: string;
      expires_at: string | null;
    },
    unknown,
    number
  >({
    mutationFn: (amountKopeks: number) => {
      if (!method) throw new Error('Method not loaded');
      return balanceApi.createTopUp(amountKopeks, method.id, selectedOption || undefined);
    },
    onSuccess: (data) => {
      const redirectUrl = data.payment_url || data.invoice_url;
      if (redirectUrl) {
        setPaymentUrl(redirectUrl);
      }
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
      setError(
        detail.includes('not yet implemented') ? t('balance.useBot') : detail || t('common.error'),
      );
    },
  });

  // Auto-focus input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!method) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  const hasOptions = method.options && method.options.length > 0;
  const minRubles = method.min_amount_kopeks / 100;
  const maxRubles = method.max_amount_kopeks / 100;
  const methodKey = method.id.toLowerCase().replace(/-/g, '_');
  const isStarsMethod = methodKey.includes('stars');
  const methodName =
    t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' }) || method.name;

  const handleSubmit = () => {
    setError(null);
    setPaymentUrl(null);
    inputRef.current?.blur();

    if (!checkRateLimit(RATE_LIMIT_KEYS.PAYMENT, 3, 30000)) {
      setError(
        t('balance.errors.rateLimit', { seconds: getRateLimitResetTime(RATE_LIMIT_KEYS.PAYMENT) }),
      );
      return;
    }
    if (hasOptions && !selectedOption) {
      setError(t('balance.errors.selectMethod'));
      return;
    }
    const amountCurrency = parseFloat(amount);
    if (isNaN(amountCurrency) || amountCurrency <= 0) {
      setError(t('balance.errors.enterAmount'));
      return;
    }
    const amountRubles = convertToRub(amountCurrency);
    if (amountRubles < minRubles || amountRubles > maxRubles) {
      setError(t('balance.errors.amountRange', { min: minRubles, max: maxRubles }));
      return;
    }

    const amountKopeks = Math.round(amountRubles * 100);
    if (isStarsMethod) {
      starsPaymentMutation.mutate(amountKopeks);
    } else {
      topUpMutation.mutate(amountKopeks);
    }
  };

  const quickAmounts = [100, 300, 500, 1000].filter((a) => a >= minRubles && a <= maxRubles);
  const currencyDecimals = targetCurrency === 'IRR' || targetCurrency === 'RUB' ? 0 : 2;
  const getQuickValue = (rub: number) =>
    targetCurrency === 'IRR'
      ? Math.round(convertAmount(rub)).toString()
      : convertAmount(rub).toFixed(currencyDecimals);
  const isPending = topUpMutation.isPending || starsPaymentMutation.isPending;

  const handleCopyUrl = async () => {
    if (!paymentUrl) return;
    try {
      await navigator.clipboard.writeText(paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Failed to copy:', e);
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-lg space-y-5"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header icon and method */}
      <motion.div variants={staggerItem} className="flex items-center gap-4 pb-1">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
            isStarsMethod
              ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-400'
              : 'bg-gradient-to-br from-accent-500/20 to-accent-600/20 text-accent-400'
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center">{getMethodIcon(method.id)}</div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-dark-100">{methodName}</h3>
          <p className="text-sm text-dark-400">
            {formatAmount(minRubles, 0)} – {formatAmount(maxRubles, 0)} {currencySymbol}
          </p>
        </div>
      </motion.div>

      {/* Payment options (if any) */}
      {hasOptions && method.options && (
        <motion.div variants={staggerItem} className="space-y-2">
          <label className="text-sm font-medium text-dark-400">{t('balance.paymentMethod')}</label>
          <div className="grid grid-cols-2 gap-2">
            {method.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                className={`relative rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  selectedOption === opt.id
                    ? 'bg-accent-500/15 text-accent-400 ring-2 ring-accent-500/40'
                    : 'border border-dark-700/50 bg-dark-800/70 text-dark-300 hover:bg-dark-700/70'
                }`}
              >
                {opt.name}
                {selectedOption === opt.id && (
                  <span className="absolute right-1.5 top-1.5">
                    <span className="block h-2 w-2 rounded-full bg-accent-500" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Amount input + Submit button - inline */}
      <motion.div variants={staggerItem} className="space-y-2">
        <label className="text-sm font-medium text-dark-400">{t('balance.enterAmount')}</label>
        <div className="flex gap-2">
          <div
            className={`relative flex-1 rounded-2xl transition-all duration-200 ${
              isInputFocused
                ? 'bg-dark-800 ring-2 ring-accent-500/50'
                : 'border border-dark-700/50 bg-dark-800/70'
            }`}
          >
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              enterKeyHint="done"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="0"
              className="h-14 w-full bg-transparent px-4 pr-12 text-xl font-bold text-dark-100 placeholder:text-dark-600 focus:outline-none"
              autoComplete="off"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold text-dark-500">
              {currencySymbol}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount || parseFloat(amount) <= 0}
            className={`flex h-14 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-2xl px-6 text-base font-bold transition-colors duration-200 ${
              isPending || !amount || parseFloat(amount) <= 0
                ? 'cursor-not-allowed bg-dark-700 text-dark-500'
                : isStarsMethod
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 hover:from-yellow-400 hover:to-orange-400 active:from-yellow-600 active:to-orange-600'
                  : 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25 hover:from-accent-400 hover:to-accent-500 active:from-accent-600 active:to-accent-700'
            }`}
          >
            {isPending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <SparklesIcon />
                <span>{t('balance.topUp')}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Quick amount buttons */}
      {quickAmounts.length > 0 && (
        <motion.div variants={staggerItem} className="grid grid-cols-4 gap-2">
          {quickAmounts.map((a) => {
            const val = getQuickValue(a);
            const isSelected = amount === val;
            return (
              <BentoCard
                key={a}
                as="button"
                type="button"
                onClick={() => {
                  setAmount(val);
                  inputRef.current?.blur();
                }}
                hover
                glow={isSelected}
                className={`flex flex-col items-center justify-center px-2 py-3 ${
                  isSelected ? 'border-accent-500/50 bg-accent-500/10' : ''
                }`}
              >
                <span
                  className={`text-base font-bold ${isSelected ? 'text-accent-400' : 'text-dark-200'}`}
                >
                  {formatAmount(a, 0)}
                </span>
                <span
                  className={`mt-0.5 text-xs ${isSelected ? 'text-accent-400/70' : 'text-dark-500'}`}
                >
                  {currencySymbol}
                </span>
              </BentoCard>
            );
          })}
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.div
          variants={staggerItem}
          className="flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 p-3"
        >
          <svg
            className="h-5 w-5 shrink-0 text-error-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-error-400">{error}</span>
        </motion.div>
      )}

      {/* Payment link display - shown when URL is received */}
      {paymentUrl && (
        <motion.div
          variants={staggerItem}
          className="space-y-3 rounded-2xl border border-success-500/20 bg-success-500/10 p-4"
        >
          <div className="flex items-center gap-2 text-success-400">
            <CheckIcon />
            <span className="font-semibold">{t('balance.paymentReady')}</span>
          </div>

          <p className="text-sm text-dark-400">{t('balance.clickToOpenPayment')}</p>

          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success-500 font-bold text-white transition-colors hover:bg-success-400 active:bg-success-600"
          >
            <ExternalLinkIcon />
            <span>{t('balance.openPaymentPage')}</span>
          </a>

          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-lg border border-dark-700/50 bg-dark-800/70 px-3 py-2">
              <p className="truncate text-xs text-dark-500">{paymentUrl}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyUrl}
              className={`shrink-0 rounded-lg p-2.5 transition-colors ${
                copied
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-dark-800/70 text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              }`}
              title={t('common.copy')}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
