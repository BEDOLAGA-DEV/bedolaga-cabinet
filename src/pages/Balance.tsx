import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';

import { useAuthStore } from '../store/auth';
import { balanceApi } from '../api/balance';
import { useCurrency } from '../hooks/useCurrency';
import { API } from '../config/constants';
import type { PaginatedResponse, Transaction } from '../types';

import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { ChevronDownIcon, ChevronRightIcon, CreditCardIcon, WalletIcon } from '@/components/icons';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { isPaidStatus, isFailedStatus } from '../utils/paymentStatus';

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { data: transactions, isLoading } = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', transactionsPage],
    queryFn: () => balanceApi.getTransactions({ per_page: 20, page: transactionsPage }),
    placeholderData: (previousData) => previousData,
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
  });

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
      // Backend returns a structured error: detail = { code, message }. We map
      // the stable machine code to a localized string. (The old contract
      // substring-matched English prose and silently degraded every unmapped
      // code — active_discount_exists, daily_limit, … — to "server error".)
      const axiosError = error as {
        response?: { data?: { detail?: { code?: string } | string } };
      };
      const detail = axiosError.response?.data?.detail;
      const code = typeof detail === 'object' && detail ? detail.code : undefined;
      const knownErrorKeys = [
        'not_found',
        'expired',
        'inactive',
        'not_yet_valid',
        'used',
        'already_used_by_user',
        'active_discount_exists',
        'no_subscription_for_days',
        'subscription_not_found',
        'not_first_purchase',
        'daily_limit',
        'trial_subscription_exists',
        'trial_provisioning_failed',
        'user_not_found',
        'server_error',
      ];
      const errorKey = code && knownErrorKeys.includes(code) ? code : 'server_error';
      setPromocodeError(t(`balance.promocode.errors.${errorKey}`));
      setPromoSelectSubs(null);
      setPromoSelectCode(null);
    } finally {
      setPromocodeLoading(false);
    }
  };

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

      {/* Balance Card — flat surface; the giant numeric carries the
          weight. The previous accent gradient + glow leaked accent into
          decoration (DESIGN.md Tunable-but-Scarce Rule) and read as the
          SaaS hero-metric template. */}
      <motion.div variants={staggerItem}>
        <Card>
          <div className="mb-2 text-sm text-dark-400">{t('balance.currentBalance')}</div>
          <div className="text-4xl font-bold text-dark-50 sm:text-5xl">
            {formatAmount(balanceData?.balance_rubles || 0)}
            <span className="ml-2 text-2xl text-dark-400">{currencySymbol}</span>
          </div>
        </Card>
      </motion.div>

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
                  className="flex w-full min-w-0 items-center justify-between gap-3 rounded-linear border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-dark-200 transition-colors hover:border-accent-500/50 hover:bg-dark-600"
                >
                  <span className="truncate">{sub.tariff_name}</span>
                  <span className="shrink-0 text-dark-400">
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
                {t('common.cancel', 'Отмена')}
              </button>
            </motion.div>
          )}
        </Card>
      </motion.div>

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
                    <div className="mt-3 text-xs text-dark-400">
                      {formatAmount(method.min_amount_kopeks / 100, 0)} {t('common.rangeTo', 'to')}{' '}
                      {formatAmount(method.max_amount_kopeks / 100, 0)} {currencySymbol}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Transaction History */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex w-full items-center justify-between text-left"
          >
            <h2 className="text-lg font-semibold text-dark-100">
              {t('balance.transactionHistory')}
            </h2>
            <ChevronDownIcon
              className={`h-5 w-5 text-dark-400 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {isHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    </div>
                  ) : transactions?.items && transactions.items.length > 0 ? (
                    <motion.div
                      className="space-y-3"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                    >
                      {transactions.items.map((tx) => {
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
                                <span className={getTypeBadge(tx.type)}>
                                  {getTypeLabel(tx.type)}
                                </span>
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
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-linear-lg bg-dark-800">
                        <WalletIcon className="h-8 w-8 text-dark-500" />
                      </div>
                      <div className="text-dark-400">{t('balance.noTransactions')}</div>
                    </div>
                  )}

                  {transactions && transactions.pages > 1 && (
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
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Saved Cards Navigation */}
      {savedCardsData?.recurrent_enabled && (
        <motion.div variants={staggerItem}>
          <Card interactive onClick={() => navigate('/balance/saved-cards')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCardIcon className="h-5 w-5 text-dark-400" />
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
