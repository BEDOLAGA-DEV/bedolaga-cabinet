import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '../store/auth';
import { balanceApi } from '../api/balance';
import { subscriptionApi } from '../api/subscription';
import { useCurrency } from '../hooks/useCurrency';
import { API } from '../config/constants';
import type {
  PaginatedResponse,
  Transaction,
  SubscriptionsListResponse,
  SubscriptionStatusResponse,
} from '../types';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { ChevronRightIcon } from '@/components/icons';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { isPaidStatus, isFailedStatus } from '../utils/paymentStatus';

const WalletIcon = ({ className = 'h-8 w-8' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
    />
  </svg>
);

export default function Balance() {
  const { t } = useTranslation();
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentHandledRef = useRef(false);

  // Fetch balance from API
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
    refetchOnMount: 'always',
  });

  // Refresh user data on mount to sync balance in store
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Handle payment return from payment gateway
  useEffect(() => {
    if (paymentHandledRef.current) return;

    const paymentStatus = searchParams.get('payment') || searchParams.get('status');

    const normalised = paymentStatus?.toLowerCase() ?? '';
    const isSuccess = isPaidStatus(normalised) || searchParams.get('success') === 'true';
    const isFailed = isFailedStatus(normalised);

    if (isSuccess) {
      paymentHandledRef.current = true;
      navigate('/balance/top-up/result?status=success', { replace: true });
    } else if (isFailed) {
      paymentHandledRef.current = true;
      navigate('/balance/top-up/result?status=failed', { replace: true });
    }
  }, [searchParams, navigate]);

  const [promocode, setPromocode] = useState('');
  const [promocodeLoading, setPromocodeLoading] = useState(false);
  const [promocodeError, setPromocodeError] = useState<string | null>(null);
  const [promocodeSuccess, setPromocodeSuccess] = useState<{
    message: string;
    amount: number;
  } | null>(null);
  const [promoSelectSubs, setPromoSelectSubs] = useState<Array<{
    id: number;
    tariff_name: string;
    days_left: number;
  }> | null>(null);
  const [promoSelectCode, setPromoSelectCode] = useState<string | null>(null);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const { data: transactions, isLoading } = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', transactionsPage],
    queryFn: () => balanceApi.getTransactions({ per_page: 20, page: transactionsPage }),
    placeholderData: (previousData) => previousData,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
  });

  const { data: renewalOptions } = useQuery({
    queryKey: ['renewal-options'],
    queryFn: () => subscriptionApi.getRenewalOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: multiSubData } = useQuery<SubscriptionsListResponse>({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });
  const isMultiTariff = multiSubData?.multi_tariff_enabled ?? false;

  const { data: subscriptionResponse } = useQuery<SubscriptionStatusResponse>({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(),
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
    enabled: !isMultiTariff,
  });

  const minDaysLeft = (() => {
    if (isMultiTariff && multiSubData?.subscriptions?.length) {
      const days = multiSubData.subscriptions
        .filter((s) => s.end_date)
        .map((s) => Math.ceil((new Date(s.end_date!).getTime() - Date.now()) / 86_400_000));
      return days.length ? Math.min(...days) : null;
    }
    if (!isMultiTariff && subscriptionResponse?.subscription) {
      return subscriptionResponse.subscription.days_left;
    }
    return null;
  })();

  // Deferred: only fetch saved cards after payment methods loaded to avoid extra request on first render.
  // The recurrent_enabled flag is cached for 5 min to prevent refetching on every Balance visit.
  const { data: savedCardsData } = useQuery({
    queryKey: ['saved-cards'],
    queryFn: balanceApi.getSavedCards,
    enabled: !!paymentMethods,
    staleTime: 5 * 60 * 1000,
  });

  const normalizeType = (type: string) => type?.toUpperCase?.() ?? type;

  const getTypeBadge = (type: string) => {
    switch (normalizeType(type)) {
      case 'DEPOSIT':
        return 'badge-success';
      case 'SUBSCRIPTION_PAYMENT':
        return 'badge-info';
      case 'REFERRAL_REWARD':
        return 'badge-warning';
      case 'WITHDRAWAL':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (normalizeType(type)) {
      case 'DEPOSIT':
        return t('balance.deposit');
      case 'SUBSCRIPTION_PAYMENT':
        return t('balance.subscriptionPayment');
      case 'REFERRAL_REWARD':
        return t('balance.referralReward');
      case 'WITHDRAWAL':
        return t('balance.withdrawal');
      default:
        return type;
    }
  };

  const handlePromocodeActivate = async (subscriptionId?: number) => {
    const code = subscriptionId ? promoSelectCode || '' : promocode.trim();
    if (!code) return;

    setPromocodeLoading(true);
    setPromocodeError(null);
    setPromocodeSuccess(null);

    try {
      const result = await balanceApi.activatePromocode(code, subscriptionId);

      if (result.error === 'select_subscription' && result.eligible_subscriptions) {
        setPromoSelectSubs(result.eligible_subscriptions);
        setPromoSelectCode(result.code || code);
        return;
      }

      if (result.success) {
        const bonusAmount = (result.balance_after || 0) - (result.balance_before || 0);
        setPromocodeSuccess({
          message: result.bonus_description || t('balance.promocode.success'),
          amount: bonusAmount,
        });
        setTransactionsPage(1);
        setPromocode('');
        setPromoSelectSubs(null);
        setPromoSelectCode(null);
        await refetchBalance();
        await refreshUser();
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
        queryClient.invalidateQueries({ queryKey: ['subscriptions-list'] });
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const errorDetail = axiosError.response?.data?.detail || 'server_error';
      const detail = errorDetail.toLowerCase();
      const errorKey = detail.includes('not found')
        ? 'not_found'
        : detail.includes('deactivated')
          ? 'inactive'
          : detail.includes('not yet active')
            ? 'not_yet_valid'
            : detail.includes('expired')
              ? 'expired'
              : detail.includes('fully used')
                ? 'used'
                : detail.includes('already used')
                  ? 'already_used_by_user'
                  : 'server_error';
      setPromocodeError(t(`balance.promocode.errors.${errorKey}`));
      setPromoSelectSubs(null);
      setPromoSelectCode(null);
    } finally {
      setPromocodeLoading(false);
    }
  };

  const PREVIEW_COUNT = 5;
  const visibleTransactions = showAllTransactions
    ? transactions?.items
    : transactions?.items?.slice(0, PREVIEW_COUNT);
  const hasMore = (transactions?.items?.length ?? 0) > PREVIEW_COUNT;

  const renewal30 = renewalOptions?.find((opt) => opt.period_days === 30) ?? null;
  const balanceKopeks = balanceData?.balance_kopeks ?? 0;
  const canRenew = renewal30 !== null && balanceKopeks >= renewal30.price_kopeks;
  const missingRubles = renewal30
    ? Math.max(0, (renewal30.price_kopeks - balanceKopeks) / 100)
    : null;

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('balance.title')}</h1>
      </motion.div>

      {/* Balance Card */}
      <motion.div variants={staggerItem}>
        <Card className="bg-gradient-to-br from-accent-500/10 to-transparent" glow>
          <div className="mb-2 text-sm text-dark-400">{t('balance.currentBalance')}</div>
          <div className="text-4xl font-bold text-dark-50 sm:text-5xl">
            {formatAmount(balanceData?.balance_rubles || 0)}
            <span className="ml-2 text-2xl text-dark-400">{currencySymbol}</span>
          </div>
        </Card>
      </motion.div>

      {/* Renewal Hint */}
      {renewal30 !== null && minDaysLeft !== null && minDaysLeft < 10 && (
        <motion.div variants={staggerItem}>
          {canRenew ? (
            <div className="rounded-[var(--bento-radius)] border border-success-500/30 bg-success-500/10 px-4 py-3 text-sm text-success-400">
              {t('balance.renewal.sufficient', 'Хватает для продления на 30 дней')}
              {renewal30.discount_percent > 0 && (
                <span className="ml-2 opacity-70">
                  {t('balance.renewal.discountApplied', '(скидка {{pct}}%)', {
                    pct: renewal30.discount_percent,
                  })}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[var(--bento-radius)] border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
              <span className="min-w-0 flex-1">
                {t('balance.renewal.insufficient', 'Для продления на 30 дней не хватает')}{' '}
                <span className="whitespace-nowrap font-semibold">
                  {formatAmount(missingRubles!, 2)} {currencySymbol}
                </span>
              </span>
              <Button
                size="sm"
                className="flex-shrink-0"
                onClick={() => navigate(`/balance/top-up?amount=${missingRubles!.toFixed(2)}`)}
              >
                {t('balance.topUp', 'Пополнить')}
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {/* Payment Methods */}
      {paymentMethods && paymentMethods.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-dark-100">
              {t('balance.topUpBalance')}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paymentMethods.map((method) => {
                const methodKey = method.id.toLowerCase().replace(/-/g, '_');
                const translatedName = t(`balance.paymentMethods.${methodKey}.name`, {
                  defaultValue: '',
                });
                const translatedDesc = t(`balance.paymentMethods.${methodKey}.description`, {
                  defaultValue: '',
                });

                return (
                  <Card
                    key={method.id}
                    interactive={method.is_available}
                    className={!method.is_available ? 'cursor-not-allowed opacity-50' : ''}
                    onClick={() => method.is_available && navigate(`/balance/top-up/${method.id}`)}
                  >
                    <div className="font-semibold text-dark-100">
                      {translatedName || method.name}
                    </div>
                    {(translatedDesc || method.description) && (
                      <div className="mt-1 text-sm text-dark-500">
                        {translatedDesc || method.description}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-dark-600">
                      {formatAmount(method.min_amount_kopeks / 100, 0)} –{' '}
                      {formatAmount(method.max_amount_kopeks / 100, 0)} {currencySymbol}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Promo Code Section */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            {t('balance.promocode.title')}
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={promocode}
              onChange={(e) => setPromocode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePromocodeActivate()}
              placeholder={t('balance.promocode.placeholder')}
              className="input flex-1"
              disabled={promocodeLoading}
            />
            <Button
              onClick={() => handlePromocodeActivate()}
              disabled={!promocode.trim()}
              loading={promocodeLoading}
            >
              {t('balance.promocode.activate')}
            </Button>
          </div>
          <AnimatePresence mode="wait">
            {promocodeError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 rounded-linear border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400"
              >
                {promocodeError}
              </motion.div>
            )}
            {promocodeSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-3 rounded-linear border border-success-500/30 bg-success-500/10 p-3 text-sm text-success-400"
              >
                <div className="font-medium">{promocodeSuccess.message}</div>
                {promocodeSuccess.amount > 0 && (
                  <div className="mt-1">
                    {t('balance.promocode.balanceAdded', {
                      amount: promocodeSuccess.amount.toFixed(2),
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {promoSelectSubs && promoSelectSubs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 space-y-2 rounded-linear border border-accent-500/30 bg-accent-500/10 p-3"
            >
              <div className="text-sm font-medium text-dark-200">
                {t('balance.promocode.selectSubscription', 'К какой подписке применить промокод?')}
              </div>
              {promoSelectSubs.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handlePromocodeActivate(sub.id)}
                  disabled={promocodeLoading}
                  className="flex w-full items-center justify-between rounded-linear border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-dark-200 transition-colors hover:border-accent-500/50 hover:bg-dark-600"
                >
                  <span>{sub.tariff_name}</span>
                  <span className="text-dark-400">
                    {t('balance.promocode.daysLeft', '{{count}} дн.', { count: sub.days_left })}
                  </span>
                </button>
              ))}
              <button
                onClick={() => {
                  setPromoSelectSubs(null);
                  setPromoSelectCode(null);
                }}
                className="text-xs text-dark-400 hover:text-dark-200"
              >
                {t('common.cancel')}
              </button>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Transaction History */}
      <motion.div variants={staggerItem}>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            {t('balance.transactionHistory')}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : visibleTransactions && visibleTransactions.length > 0 ? (
            <>
              <motion.div
                className="space-y-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {visibleTransactions.map((tx) => {
                  const isZero = tx.amount_rubles === 0;
                  const isPositive = tx.amount_rubles > 0;
                  const displayAmount = Math.abs(tx.amount_rubles);
                  const sign = isZero ? '' : isPositive ? '+' : '-';
                  const colorClass = isZero
                    ? 'text-dark-400'
                    : isPositive
                      ? 'text-success-400'
                      : 'text-error-400';

                  return (
                    <motion.div
                      key={tx.id}
                      variants={staggerItem}
                      className="flex items-center justify-between rounded-linear border border-dark-700/30 bg-dark-800/30 p-4"
                    >
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-3">
                          <span className={getTypeBadge(tx.type)}>{getTypeLabel(tx.type)}</span>
                          <span className="text-xs text-dark-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {tx.description && (
                          <div className="text-sm text-dark-400">{tx.description}</div>
                        )}
                      </div>
                      <div className={`text-lg font-semibold ${colorClass}`}>
                        {sign}
                        {formatAmount(displayAmount)} {currencySymbol}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {(hasMore || showAllTransactions) && (
                <button
                  onClick={() => setShowAllTransactions((prev) => !prev)}
                  className="mt-4 w-full text-center text-sm text-dark-400 transition-colors hover:text-dark-200"
                >
                  {showAllTransactions ? t('common.collapse') : t('common.all')}
                </button>
              )}

              {showAllTransactions && transactions && transactions.pages > 1 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-500">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                    disabled={transactions.page <= 1}
                    className="min-w-[120px] flex-1 sm:flex-none"
                  >
                    {t('common.back')}
                  </Button>
                  <div className="flex-1 text-center">
                    {t('balance.page', {
                      current: transactions.page,
                      total: transactions.pages,
                    })}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setTransactionsPage((prev) =>
                        transactions.pages ? Math.min(transactions.pages, prev + 1) : prev + 1,
                      )
                    }
                    disabled={transactions.page >= transactions.pages}
                    className="min-w-[120px] flex-1 sm:flex-none"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-linear-lg bg-dark-800">
                <WalletIcon className="h-8 w-8 text-dark-500" />
              </div>
              <div className="text-dark-400">{t('balance.noTransactions')}</div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Saved Cards Navigation */}
      {savedCardsData?.recurrent_enabled && (
        <motion.div variants={staggerItem}>
          <Card interactive onClick={() => navigate('/balance/saved-cards')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">💳</span>
                <span className="font-medium text-dark-100">{t('balance.savedCards.title')}</span>
              </div>
              <ChevronRightIcon className="h-5 w-5 text-dark-400" />
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
