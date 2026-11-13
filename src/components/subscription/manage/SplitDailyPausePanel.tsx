import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AxiosError } from 'axios';
import { subscriptionApi, type SplitDailyResult } from '@/api/subscription';
import { Link } from 'react-router';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { useCurrency } from '@/hooks/useCurrency';
import { useAuthStore } from '@/store/auth';
import type { Subscription } from '@/types';
import { safeSession } from '@/utils/safeStorage';
import {
  readSplitDailyAttempt,
  splitDailyStorageKey,
  validSplitDailyQuote,
  type SplitDailyAttempt,
} from '@/utils/splitDailyAttempt';
import { uiLocale } from '@/utils/uiLocale';

function codeOf(error: unknown) {
  return error instanceof AxiosError ? error.response?.data?.detail?.code : undefined;
}
export function SplitDailyPausePanel({ subscription }: { subscription: Subscription }) {
  const userId = useAuthStore((state) => state.user?.id);
  return (
    <SplitDailyScope
      key={`${userId}:${subscription.id}`}
      userId={userId}
      subscription={subscription}
    />
  );
}
function SplitDailyScope({
  userId,
  subscription,
}: {
  userId?: number;
  subscription: Subscription;
}) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const client = useQueryClient();
  const key = splitDailyStorageKey(userId, subscription.id);
  const [attempt, setAttempt] = useState(() => readSplitDailyAttempt(key, subscription.id));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [complete, setComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const expired =
    !Number.isFinite(Date.parse(subscription.end_date)) ||
    Date.parse(subscription.end_date) <= Date.now();
  const needsResume =
    subscription.is_daily_paused ||
    expired ||
    ['expired', 'disabled'].includes(subscription.status);
  const invalidate = useCallback(() => {
    client.invalidateQueries({ queryKey: ['subscription'] });
    client.invalidateQueries({ queryKey: ['subscriptions-list'] });
    client.invalidateQueries({ queryKey: ['balance'] });
    client.invalidateQueries({ queryKey: ['purchase-options'] });
    client.invalidateQueries({ queryKey: ['split-traffic'] });
  }, [client]);
  const quoteQuery = useQuery({
    queryKey: ['split-daily-quote', userId, subscription.id],
    queryFn: () => subscriptionApi.quoteSplitDailyResume(subscription.id),
    enabled: !!userId && open && !attempt,
    retry: false,
    staleTime: 0,
  });
  const quote = attempt?.quote ?? quoteQuery.data;
  const resultQuery = useQuery({
    queryKey: ['split-daily-result', userId, subscription.id, attempt?.operationId],
    queryFn: () => {
      if (!attempt) throw new Error('missing_daily_confirmation');
      return subscriptionApi.getSplitDailyResumeResult(subscription.id, attempt.operationId);
    },
    enabled: !!userId && !!attempt,
    retry: false,
    refetchInterval: attempt?.accepted ? 3000 : false,
  });
  const acceptResult = useCallback(
    (value: SplitDailyResult, current: SplitDailyAttempt) => {
      if (!value.success || typeof value.delivery_pending !== 'boolean') {
        setNotice('subscription.splitDaily.unknown');
        return;
      }
      if (value.delivery_pending) {
        if (current.accepted) return;
        const accepted = { ...current, accepted: true };
        if (key) safeSession.setItem(key, JSON.stringify(accepted));
        setAttempt(accepted);
        setNotice('');
      } else {
        if (key) safeSession.removeItem(key);
        setAttempt(null);
        setOpen(false);
        setComplete(true);
        setNotice('');
      }
      invalidate();
    },
    [invalidate, key],
  );
  useEffect(() => {
    if (attempt && resultQuery.data) acceptResult(resultQuery.data, attempt);
  }, [resultQuery.data, attempt, acceptResult]);
  const pause = useMutation({
    retry: false,
    mutationFn: () => subscriptionApi.togglePause(subscription.id, !needsResume),
    onSuccess: () => {
      setNotice('');
      invalidate();
    },
    onError: (error) => {
      if (codeOf(error) === 'daily_resume_requires_confirmation') {
        setOpen(true);
      } else setNotice('subscription.splitDaily.unavailable');
    },
  });
  const confirm = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!userId || !key || !validSplitDailyQuote(quote, subscription.id) || attempt?.accepted)
        throw new Error('invalid_daily_confirmation');
      const fixed = attempt ?? { operationId: crypto.randomUUID(), quote, accepted: false };
      if (!safeSession.setItem(key, JSON.stringify(fixed)))
        throw new Error('daily_storage_unavailable');
      setAttempt(fixed);
      setNotice('');
      const value = await subscriptionApi.confirmSplitDailyResume({
        subscription_id: subscription.id,
        operation_id: fixed.operationId,
        expected_price_kopeks: fixed.quote.price_kopeks,
        expected_terms_hash: fixed.quote.terms_hash,
      });
      return { value, fixed };
    },
    onSuccess: ({ value, fixed }) => acceptResult(value, fixed),
    onError: async (error) => {
      if (codeOf(error) === 'daily_resume_quote_changed') {
        if (key) safeSession.removeItem(key);
        setAttempt(null);
        setOpen(true);
        setRefreshing(true);
        setNotice('subscription.splitDaily.changed');
        await quoteQuery.refetch();
        setRefreshing(false);
      } else if (codeOf(error) === 'insufficient_balance')
        setNotice('subscription.splitDaily.insufficient');
      else
        setNotice(
          error instanceof Error && error.message === 'daily_storage_unavailable'
            ? 'subscription.splitDaily.storageError'
            : 'subscription.splitDaily.unknown',
        );
    },
  });
  const showing = open || !!attempt;
  const loading = !attempt && (quoteQuery.isFetching || refreshing);
  const accepted = attempt?.accepted === true;
  const receiptMissing = codeOf(resultQuery.error) === 'daily_resume_receipt_not_found';
  const canRetry =
    !!attempt && !accepted && (receiptMissing || codeOf(confirm.error) === 'insufficient_balance');
  const money = (value: number) => `${formatAmount(value / 100)}\u00a0${currencySymbol}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-dark-50">
            {t('subscription.pause.title')}
          </h2>
          <p className="mt-1 text-xs text-dark-400">
            {t(
              subscription.is_daily_paused
                ? 'subscription.pause.paused'
                : expired
                  ? 'subscription.statusExpired'
                  : 'subscription.pause.active',
            )}
          </p>
        </div>
        {!showing && (
          <button
            type="button"
            disabled={!userId || pause.isPending}
            className={`${needsResume ? 'btn-primary' : 'btn-secondary'} shrink-0 px-4 py-2 text-sm`}
            onClick={() => {
              setComplete(false);
              setNotice('');
              if (needsResume && expired) setOpen(true);
              else pause.mutate();
            }}
          >
            {pause.isPending ? (
              <Spinner className="h-4 w-4" />
            ) : (
              t(needsResume ? 'subscription.pause.resumeBtn' : 'subscription.pause.pauseBtn')
            )}
          </button>
        )}
      </div>
      {showing && (
        <section
          className="min-h-40 space-y-4 border-t border-dark-700/50 pt-4"
          aria-label={t('subscription.splitDaily.title')}
        >
          <h3 className="text-base font-semibold text-dark-50">
            {t('subscription.splitDaily.title')}
          </h3>
          {loading ? (
            <SkeletonGroup className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </SkeletonGroup>
          ) : (attempt || !quoteQuery.isError) && validSplitDailyQuote(quote, subscription.id) ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm text-dark-200">
                  {quote.tariff_name}
                </span>
                <strong className="shrink-0 text-lg text-dark-50">
                  {money(quote.price_kopeks)}
                </strong>
              </div>
              <p className="text-sm text-dark-300">
                {t('subscription.splitDaily.estimatedEnd', {
                  date: new Date(quote.intended_end_date).toLocaleString(uiLocale()),
                })}
              </p>
              {accepted ? (
                <p role="status" className="text-sm text-dark-200">
                  {t('subscription.splitDaily.pending')}
                </p>
              ) : !attempt ? (
                <p className="text-sm text-dark-300">{t('subscription.splitDaily.consent')}</p>
              ) : (
                <p role="status" className="text-sm text-dark-200">
                  {t('subscription.splitDaily.checking')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {!attempt ? (
                  <button
                    type="button"
                    className="btn-primary min-h-10 flex-1 px-4 py-2 text-sm"
                    disabled={!userId || confirm.isPending || loading}
                    onClick={() => confirm.mutate()}
                  >
                    {t('subscription.splitDaily.confirm')}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary min-h-10 flex-1 px-4 py-2 text-sm"
                      disabled={resultQuery.isFetching || confirm.isPending}
                      onClick={() => {
                        void resultQuery.refetch();
                      }}
                    >
                      {t('subscription.splitDaily.check')}
                    </button>
                    {canRetry && (
                      <button
                        type="button"
                        className="btn-primary min-h-10 flex-1 px-4 py-2 text-sm"
                        disabled={confirm.isPending || resultQuery.isFetching}
                        onClick={() => confirm.mutate()}
                      >
                        {t('subscription.splitDaily.retryConfirm')}
                      </button>
                    )}
                  </>
                )}
                {!attempt && (
                  <button
                    type="button"
                    className="btn-ghost min-h-10 px-4 py-2 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p role="alert" className="text-sm text-error-400">
                {t('subscription.splitDaily.previewError')}
              </p>
              <button
                type="button"
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => {
                  void quoteQuery.refetch();
                }}
              >
                {t('common.retry')}
              </button>
              {!attempt && (
                <button
                  type="button"
                  className="btn-ghost min-h-10 px-4 py-2 text-sm"
                  onClick={() => {
                    setOpen(false);
                    setNotice('');
                    invalidate();
                  }}
                >
                  {t('common.cancel')}
                </button>
              )}
            </>
          )}
        </section>
      )}
      {notice && (
        <p role="alert" className="text-sm text-error-400">
          {t(notice)}
        </p>
      )}
      {notice === 'subscription.splitDaily.insufficient' && (
        <Link
          className="btn-secondary inline-flex min-h-10 items-center px-4 py-2 text-sm"
          to={`/balance/top-up?returnTo=${encodeURIComponent(`/subscriptions/${subscription.id}/renew`)}`}
        >
          {t('balance.topUp')}
        </Link>
      )}
      {complete && (
        <p role="status" className="text-sm text-success-400">
          {t('subscription.splitDaily.complete')}
        </p>
      )}
    </div>
  );
}
