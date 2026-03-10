import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useAuthStore } from '../store/auth';
import { useCurrency } from '../hooks/useCurrency';
import { useHaptic } from '@/platform';
import { Spinner } from '@/components/ui/Spinner';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { AnimatedCrossmark } from '@/components/ui/AnimatedCrossmark';
import { loadTopUpPendingInfo, clearTopUpPendingInfo } from '../utils/topUpStorage';
import { isPaidStatus, isFailedStatus } from '../utils/paymentStatus';

// ── Constants ────────────────────────────────────────────────
const MAX_POLL_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 3_000;

// ── Sub-components ───────────────────────────────────────────

function AmountDisplay({ amountKopeks, label }: { amountKopeks: number; label: string }) {
  const { formatAmount, currencySymbol } = useCurrency();
  const amountRubles = amountKopeks / 100;

  return (
    <div className="mt-4 rounded-xl bg-dark-800/50 px-6 py-4">
      <p className="text-xs text-dark-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-dark-50">
        {formatAmount(amountRubles)} <span className="text-lg text-dark-400">{currencySymbol}</span>
      </p>
    </div>
  );
}

function PendingState({ amountKopeks }: { amountKopeks: number | null }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <Spinner className="h-16 w-16 border-[3px]" />
      <div>
        <h1 className="text-xl font-bold text-dark-50">
          {t('balance.topUpResult.awaitingPayment')}
        </h1>
        <p className="mt-2 text-sm text-dark-400">{t('balance.topUpResult.awaitingPaymentDesc')}</p>
      </div>
      {amountKopeks != null && amountKopeks > 0 && (
        <AmountDisplay amountKopeks={amountKopeks} label={t('balance.topUpResult.topUpAmount')} />
      )}
    </motion.div>
  );
}

function SuccessState({ amountKopeks }: { amountKopeks: number | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoToBalance = useCallback(() => {
    navigate('/balance', { replace: true });
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <AnimatedCheckmark />

      <div>
        <h1 className="text-xl font-bold text-dark-50">{t('balance.topUpResult.success')}</h1>
        <p className="mt-2 text-sm text-dark-400">{t('balance.topUpResult.successDesc')}</p>
      </div>

      {amountKopeks != null && amountKopeks > 0 && (
        <AmountDisplay amountKopeks={amountKopeks} label={t('balance.topUpResult.topUpAmount')} />
      )}

      <button
        type="button"
        onClick={handleGoToBalance}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-400"
      >
        {t('balance.topUpResult.goToBalance')}
      </button>
    </motion.div>
  );
}

function FailedState({ amountKopeks }: { amountKopeks: number | null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleTryAgain = useCallback(() => {
    navigate('/balance', { replace: true });
  }, [navigate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <AnimatedCrossmark />

      <div>
        <h1 className="text-xl font-bold text-dark-50">{t('balance.topUpResult.failed')}</h1>
        <p className="mt-2 text-sm text-dark-400">{t('balance.topUpResult.failedDesc')}</p>
      </div>

      {amountKopeks != null && amountKopeks > 0 && (
        <AmountDisplay amountKopeks={amountKopeks} label={t('balance.topUpResult.topUpAmount')} />
      )}

      <button
        type="button"
        onClick={handleTryAgain}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-dark-800/50 px-6 py-3 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-700/50"
      >
        {t('balance.topUpResult.tryAgain')}
      </button>
    </motion.div>
  );
}

function TimeoutState({ onRetry, onGoBack }: { onRetry: () => void; onGoBack: () => void }) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-dark-800/50">
        <svg
          className="h-10 w-10 text-dark-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-dark-50">{t('balance.topUpResult.timeout')}</h1>
        <p className="mt-2 text-sm text-dark-400">{t('balance.topUpResult.timeoutDesc')}</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-xl bg-accent-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-400"
        >
          {t('common.retry')}
        </button>
        <button
          type="button"
          onClick={onGoBack}
          className="w-full rounded-xl bg-dark-800/50 px-6 py-3 text-sm font-medium text-dark-200 transition-colors hover:bg-dark-700/50"
        >
          {t('balance.topUpResult.goToBalance')}
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Component ───────────────────────────────────────────

export default function TopUpResult() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const haptic = useHaptic();
  const pollStart = useRef(Date.now());
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const hapticFiredRef = useRef(false);
  const cleanedUpRef = useRef(false);

  // Load saved payment info from sessionStorage (once on mount)
  const [pendingInfo] = useState(() => loadTopUpPendingInfo());

  // Fallback: read method from query params (for external browser redirects where sessionStorage is unavailable)
  const methodFromUrl = searchParams.get('method');

  // Detect if user arrived via redirect with success param (no polling needed)
  const redirectStatus = searchParams.get('status') || searchParams.get('payment');
  const isRedirectSuccess = redirectStatus
    ? isPaidStatus(redirectStatus)
    : searchParams.get('success') === 'true';
  const isRedirectFailed = redirectStatus ? isFailedStatus(redirectStatus) : false;

  // Determine if we can poll by specific payment_id (need method + numeric payment_id)
  const parsedPaymentId = pendingInfo?.payment_id ? parseInt(pendingInfo.payment_id, 10) : NaN;
  const canPollById =
    !!(pendingInfo?.method_id && !isNaN(parsedPaymentId)) &&
    !isRedirectSuccess &&
    !isRedirectFailed;

  // Fallback: poll by method via /latest endpoint when no sessionStorage data
  const canPollByMethod =
    !canPollById && !!methodFromUrl && !isRedirectSuccess && !isRedirectFailed;

  // Poll payment status by specific ID (primary path — sessionStorage available)
  const { data: paymentStatus, refetch } = useQuery({
    queryKey: ['topup-status', pendingInfo?.method_id, parsedPaymentId],
    queryFn: () => balanceApi.getPendingPayment(pendingInfo!.method_id, parsedPaymentId),
    enabled: canPollById && !pollTimedOut,
    refetchInterval: (query) => {
      const payment = query.state.data;
      if (!payment) return POLL_INTERVAL_MS;

      if (payment.is_paid || isPaidStatus(payment.status) || isFailedStatus(payment.status)) {
        return false;
      }

      if (Date.now() - pollStart.current > MAX_POLL_MS) {
        setPollTimedOut(true);
        return false;
      }

      return POLL_INTERVAL_MS;
    },
    retry: 2,
  });

  // Poll payment status by method latest (fallback — external browser, no sessionStorage)
  const { data: latestPayment, refetch: refetchLatest } = useQuery({
    queryKey: ['topup-status-latest', methodFromUrl],
    queryFn: () => balanceApi.getLatestPayment(methodFromUrl!),
    enabled: canPollByMethod && !pollTimedOut,
    refetchInterval: (query) => {
      const payment = query.state.data;
      if (!payment) return POLL_INTERVAL_MS;

      if (payment.is_paid || isPaidStatus(payment.status) || isFailedStatus(payment.status)) {
        return false;
      }

      if (Date.now() - pollStart.current > MAX_POLL_MS) {
        setPollTimedOut(true);
        return false;
      }

      return POLL_INTERVAL_MS;
    },
    retry: 2,
  });

  // Merge both polling sources
  const effectivePayment = paymentStatus ?? latestPayment;

  const handleRetryPoll = useCallback(() => {
    pollStart.current = Date.now();
    setPollTimedOut(false);
    if (canPollById) {
      refetch();
    } else {
      refetchLatest();
    }
  }, [canPollById, setPollTimedOut, refetch, refetchLatest]);

  const handleGoBack = useCallback(() => {
    clearTopUpPendingInfo();
    navigate('/balance', { replace: true });
  }, [navigate]);

  // Redirect to balance if absolutely no data source available
  useEffect(() => {
    if (!pendingInfo && !redirectStatus && !methodFromUrl) {
      navigate('/balance', { replace: true });
    }
  }, [pendingInfo, redirectStatus, methodFromUrl, navigate]);

  // Determine current visual state
  const amountKopeks = effectivePayment?.amount_kopeks ?? pendingInfo?.amount_kopeks ?? null;

  const resolvedPaid =
    isRedirectSuccess ||
    effectivePayment?.is_paid ||
    (effectivePayment && isPaidStatus(effectivePayment.status));

  const resolvedFailed =
    isRedirectFailed || (effectivePayment && isFailedStatus(effectivePayment.status));

  // Clean up sessionStorage and invalidate queries when payment resolves
  useEffect(() => {
    if (cleanedUpRef.current) return;
    if (resolvedPaid) {
      cleanedUpRef.current = true;
      clearTopUpPendingInfo();
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      refreshUser();
    } else if (resolvedFailed) {
      cleanedUpRef.current = true;
      clearTopUpPendingInfo();
    }
  }, [resolvedPaid, resolvedFailed, queryClient, refreshUser]);

  // Haptic feedback on status resolution (fire once)
  useEffect(() => {
    if (hapticFiredRef.current) return;
    if (resolvedPaid) {
      hapticFiredRef.current = true;
      haptic.notification('success');
    } else if (resolvedFailed) {
      hapticFiredRef.current = true;
      haptic.notification('error');
    }
  }, [resolvedPaid, resolvedFailed, haptic]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-dark-950 px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-dark-800/50 bg-dark-900/50 p-8"
        aria-live="polite"
        aria-atomic="true"
      >
        {resolvedPaid ? (
          <SuccessState amountKopeks={amountKopeks} />
        ) : resolvedFailed ? (
          <FailedState amountKopeks={amountKopeks} />
        ) : pollTimedOut ? (
          <TimeoutState onRetry={handleRetryPoll} onGoBack={handleGoBack} />
        ) : (
          <PendingState amountKopeks={amountKopeks} />
        )}
      </div>
    </div>
  );
}
