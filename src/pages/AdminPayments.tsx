import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPaymentsApi } from '../api/adminPayments';
import { useCurrency } from '../hooks/useCurrency';
import type { PendingPayment, PaginatedResponse } from '../types';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// BackIcon
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

export default function AdminPayments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null);

  // Fetch payments
  const {
    data: payments,
    isLoading,
    refetch,
  } = useQuery<PaginatedResponse<PendingPayment>>({
    queryKey: ['admin-payments', page, methodFilter],
    queryFn: () =>
      adminPaymentsApi.getPendingPayments({
        page,
        per_page: 20,
        method_filter: methodFilter || undefined,
      }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-payments-stats'],
    queryFn: adminPaymentsApi.getStats,
    refetchInterval: 30000,
  });

  // Check payment mutation
  const checkPaymentMutation = useMutation({
    mutationFn: ({ method, paymentId }: { method: string; paymentId: number }) =>
      adminPaymentsApi.checkPaymentStatus(method, paymentId),
    onSuccess: async (result) => {
      if (result.status_changed) {
        await refetch();
        queryClient.invalidateQueries({ queryKey: ['admin-payments-stats'] });
      } else {
        await refetch();
      }
    },
    onSettled: () => {
      setCheckingPaymentId(null);
    },
  });

  const handleCheckPayment = (payment: PendingPayment) => {
    setCheckingPaymentId(`${payment.method}_${payment.id}`);
    checkPaymentMutation.mutate({ method: payment.method, paymentId: payment.id });
  };

  // Get unique methods from stats for filter
  const methodOptions = stats?.by_method ? Object.keys(stats.by_method) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-dark-50">{t('admin.payments.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.payments.description')}</p>
          </div>
        </div>
        <button onClick={() => refetch()} className="btn-secondary flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          {t('common.refresh')}
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-4">
            <div className="text-2xl font-bold text-dark-50">{stats.total_pending}</div>
            <div className="text-sm text-dark-400">{t('admin.payments.totalPending')}</div>
          </div>
          {Object.entries(stats.by_method).map(([method, count]) => (
            <div
              key={method}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                methodFilter === method
                  ? 'border-accent-500/50 bg-accent-500/20'
                  : 'border-dark-700/50 bg-dark-800/50 hover:border-dark-600'
              }`}
              onClick={() => setMethodFilter(methodFilter === method ? '' : method)}
            >
              <div className="text-2xl font-bold text-dark-50">{count}</div>
              <div className="text-sm text-dark-400">{method}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {methodOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-dark-400">{t('admin.payments.filterByMethod')}:</span>
          <button
            onClick={() => setMethodFilter('')}
            className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
              methodFilter === ''
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            {t('common.all')}
          </button>
          {methodOptions.map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                methodFilter === method
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      )}

      {/* Payments list */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : payments?.items && payments.items.length > 0 ? (
          <div className="space-y-3">
            {payments.items.map((payment) => {
              const paymentKey = `${payment.method}_${payment.id}`;
              const isChecking = checkingPaymentId === paymentKey;

              return (
                <div
                  key={paymentKey}
                  className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-dark-100">
                          {payment.method_display}
                        </span>
                        <span className="rounded-full bg-dark-700/50 px-2 py-0.5 text-sm text-dark-300">
                          {payment.status_emoji} {payment.status_text}
                        </span>
                        {payment.is_paid && (
                          <span className="rounded-full bg-success-500/20 px-2 py-0.5 text-sm text-success-400">
                            {t('admin.payments.paid')}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-dark-50">
                        {formatAmount(payment.amount_rubles)} {currencySymbol}
                      </div>
                      <div className="mt-1 text-sm text-dark-400">
                        ID: <code className="text-dark-300">{payment.identifier}</code>
                      </div>
                      <div className="mt-1 text-xs text-dark-500">
                        {new Date(payment.created_at).toLocaleString()}
                      </div>
                      {/* User info */}
                      {(payment.user_username || payment.user_telegram_id) && (
                        <div className="mt-2 text-sm text-dark-400">
                          <span className="text-dark-500">{t('admin.payments.user')}:</span>{' '}
                          {payment.user_username ? (
                            <span className="text-dark-200">@{payment.user_username}</span>
                          ) : (
                            <span className="text-dark-300">ID: {payment.user_telegram_id}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {payment.payment_url && (
                        <a
                          href={payment.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          {t('admin.payments.openLink')}
                        </a>
                      )}
                      {payment.is_checkable && (
                        <button
                          onClick={() => handleCheckPayment(payment)}
                          disabled={isChecking}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          {isChecking ? (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              {t('admin.payments.checking')}
                            </span>
                          ) : (
                            t('admin.payments.checkStatus')
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Show result after check */}
                  {checkPaymentMutation.isSuccess &&
                    checkPaymentMutation.variables?.paymentId === payment.id && (
                      <div
                        className={`mt-3 rounded-lg p-2 text-sm ${
                          checkPaymentMutation.data?.status_changed
                            ? 'border border-success-500/30 bg-success-500/10 text-success-400'
                            : 'bg-dark-700/30 text-dark-400'
                        }`}
                      >
                        {checkPaymentMutation.data?.message}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
              <svg
                className="h-8 w-8 text-dark-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-dark-400">{t('admin.payments.noPayments')}</div>
          </div>
        )}

        {/* Pagination */}
        {payments && payments.pages > 1 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-500">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={payments.page <= 1}
              className={`btn-secondary min-w-[100px] flex-1 text-xs sm:flex-none sm:text-sm ${
                payments.page <= 1 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              {t('admin.payments.prev')}
            </button>
            <div className="flex-1 text-center">
              {t('balance.page', '{current} / {total}', {
                current: payments.page,
                total: payments.pages,
              })}
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(payments.pages, prev + 1))}
              disabled={payments.page >= payments.pages}
              className={`btn-secondary min-w-[100px] flex-1 text-xs sm:flex-none sm:text-sm ${
                payments.page >= payments.pages ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              {t('admin.payments.next')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
