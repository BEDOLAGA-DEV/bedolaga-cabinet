import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPaymentsApi, type SearchStats } from '../api/adminPayments';
import { useCurrency } from '../hooks/useCurrency';
import type { PendingPayment, PaginatedResponse } from '../types';
import { usePlatform } from '../platform/hooks/usePlatform';
import { USER_TIMEZONE } from '../utils/format';

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

// SearchIcon
const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

// CalendarIcon
const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    paid: 'bg-green-500/20 text-green-400',
    pending: 'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const normalized = status.toLowerCase();
  const match = Object.keys(styles).find((key) => normalized.includes(key));

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${match ? styles[match] : 'bg-dark-700/50 text-dark-300'}`}
    >
      {status}
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'amber' | 'green' | 'red';
  isActive: boolean;
  onClick: () => void;
}

function StatCard({ label, value, color, isActive, onClick }: StatCardProps) {
  const colors: Record<string, string> = {
    blue: 'border-accent-500/30 bg-accent-500/20 text-accent-400',
    amber: 'border-amber-500/30 bg-amber-500/20 text-amber-400',
    green: 'border-green-500/30 bg-green-500/20 text-green-400',
    red: 'border-red-500/30 bg-red-500/20 text-red-400',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition-all ${
        isActive
          ? colors[color]
          : 'border-dark-700/50 bg-dark-800/50 text-dark-300 hover:border-dark-600'
      }`}
    >
      <div className={`text-2xl font-bold ${isActive ? '' : 'text-dark-50'}`}>{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </button>
  );
}

export default function AdminPayments() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatAmount, currencySymbol } = useCurrency();
  const { capabilities } = usePlatform();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateRange, setShowDateRange] = useState(false);
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, periodFilter, methodFilter, dateFrom, dateTo]);

  // Auto-refresh only when filters are at defaults and no search
  const isDefaultFilters =
    !searchQuery && statusFilter === 'all' && periodFilter === 'today' && !methodFilter;

  // Shared query params
  const queryParams = {
    search: searchQuery || undefined,
    status_filter: statusFilter,
    method_filter: methodFilter || undefined,
    period: periodFilter === 'custom' ? undefined : periodFilter,
    date_from: periodFilter === 'custom' && dateFrom ? dateFrom : undefined,
    date_to: periodFilter === 'custom' && dateTo ? dateTo : undefined,
    tz: USER_TIMEZONE,
  };

  // Fetch payments
  const {
    data: payments,
    isLoading,
    isError,
    refetch,
  } = useQuery<PaginatedResponse<PendingPayment>>({
    queryKey: ['admin-payments-search', queryParams, page],
    queryFn: () =>
      adminPaymentsApi.searchPayments({
        ...queryParams,
        page,
        per_page: 20,
      }),
    refetchInterval: isDefaultFilters ? 30000 : false,
  });

  // Fetch stats
  const { data: stats } = useQuery<SearchStats>({
    queryKey: ['admin-payments-search-stats', queryParams],
    queryFn: () => adminPaymentsApi.getSearchStats(queryParams),
    refetchInterval: isDefaultFilters ? 30000 : false,
  });

  // Check payment mutation
  const checkPaymentMutation = useMutation({
    mutationFn: ({ method, paymentId }: { method: string; paymentId: number }) =>
      adminPaymentsApi.checkPaymentStatus(method, paymentId),
    onSuccess: async () => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-payments-search-stats'] });
    },
    onSettled: () => {
      setCheckingPaymentId(null);
    },
  });

  const handleCheckPayment = (payment: PendingPayment) => {
    setCheckingPaymentId(`${payment.method}_${payment.id}`);
    checkPaymentMutation.mutate({ method: payment.method, paymentId: payment.id });
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  const handleStatusCardClick = (status: string) => {
    setStatusFilter(statusFilter === status ? 'all' : status);
  };

  const handlePeriodChange = (period: string) => {
    if (period === 'custom') {
      setPeriodFilter('custom');
      setShowDateRange(true);
    } else {
      setPeriodFilter(period);
      setShowDateRange(false);
    }
  };

  // Get unique methods from stats for filter dropdown
  const methodOptions = stats?.by_method ? Object.keys(stats.by_method) : [];

  // Period filter options
  const periodOptions = [
    { value: 'today', label: t('admin.payments.periodToday', 'Сегодня') },
    { value: '7d', label: t('admin.payments.period7d') },
    { value: '30d', label: t('admin.payments.period30d') },
    { value: 'all', label: t('admin.payments.periodAll') },
  ];

  // Status filter options
  const statusOptions = [
    { value: 'all', label: t('admin.payments.statusAll') },
    { value: 'pending', label: t('admin.payments.statusPending') },
    { value: 'paid', label: t('admin.payments.statusPaid') },
    { value: 'cancelled', label: t('admin.payments.statusCancelled') },
  ];

  return (
    <div className="animate-fade-in space-y-6">
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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.payments.title')}</h1>
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

      {/* Search bar */}
      <div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-dark-500">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('admin.payments.searchPlaceholder')}
            className="w-full rounded-xl border border-dark-700 bg-dark-800 py-3 pl-10 pr-4 text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
          />
        </div>
        <p className="mt-1.5 text-xs text-dark-500">{t('admin.payments.searchHint')}</p>
      </div>

      {/* Search result banner */}
      {searchQuery && (
        <div className="flex items-center justify-between rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-3">
          <span className="text-sm text-accent-300">
            {t('admin.payments.searchResults', {
              query: searchQuery,
              count: payments?.total ?? 0,
            })}
          </span>
          <button
            onClick={handleResetSearch}
            className="ml-3 rounded-lg px-3 py-1 text-sm text-accent-400 transition-colors hover:bg-accent-500/20"
          >
            {t('admin.payments.resetSearch')}
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="space-y-3">
        {/* Status filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                statusFilter === option.value
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Period filter pills + Method filter */}
        <div className="flex flex-wrap items-center gap-2">
          {periodOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handlePeriodChange(option.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
                periodFilter === option.value
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            onClick={() => handlePeriodChange('custom')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
              periodFilter === 'custom'
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            <CalendarIcon />
            {t('admin.payments.periodCustom')}
          </button>

          {/* Method filter dropdown */}
          {methodOptions.length > 0 && (
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-300 transition-colors focus:border-accent-500 focus:outline-none"
            >
              <option value="">{t('admin.payments.allMethods')}</option>
              {methodOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Date range panel */}
      {showDateRange && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-accent-500/30 bg-accent-500/5 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-dark-400">
              {t('admin.payments.dateFrom')}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-dark-400">{t('admin.payments.dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 focus:border-accent-500 focus:outline-none"
            />
          </div>
          <button onClick={() => refetch()} className="btn-primary px-4 py-2 text-sm">
            {t('admin.payments.applyDate')}
          </button>
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.payments.totalCount')}
            value={stats.total}
            color="blue"
            isActive={statusFilter === 'all'}
            onClick={() => handleStatusCardClick('all')}
          />
          <StatCard
            label={t('admin.payments.pendingCount')}
            value={stats.pending}
            color="amber"
            isActive={statusFilter === 'pending'}
            onClick={() => handleStatusCardClick('pending')}
          />
          <StatCard
            label={t('admin.payments.paidCount')}
            value={stats.paid}
            color="green"
            isActive={statusFilter === 'paid'}
            onClick={() => handleStatusCardClick('paid')}
          />
          <StatCard
            label={t('admin.payments.cancelledCount')}
            value={stats.cancelled}
            color="red"
            isActive={statusFilter === 'cancelled'}
            onClick={() => handleStatusCardClick('cancelled')}
          />
        </div>
      )}

      {/* Payments list */}
      <div className="card">
        {isError ? (
          <div className="py-12 text-center">
            <div className="text-dark-400">{t('common.error')}</div>
            <button onClick={() => refetch()} className="btn-secondary mt-3">
              {t('common.retry')}
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : payments?.items && payments.items.length > 0 ? (
          <div className="space-y-3">
            {payments.items.map((payment) => {
              const paymentKey = `${payment.method}_${payment.id}`;
              const isChecking = checkingPaymentId === paymentKey;
              const isCancelled = payment.status.toLowerCase().includes('cancel');

              return (
                <div
                  key={paymentKey}
                  className="rounded-xl border border-dark-700/30 bg-dark-800/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Status badge + method */}
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={payment.status_text} />
                        <span className="font-semibold text-dark-100">
                          {payment.method_display}
                        </span>
                        {payment.is_paid && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                            {t('admin.payments.paid')}
                          </span>
                        )}
                      </div>

                      {/* Amount */}
                      <div
                        className={`text-lg font-semibold ${
                          isCancelled ? 'text-dark-500 line-through opacity-60' : 'text-dark-50'
                        }`}
                      >
                        {formatAmount(payment.amount_rubles)} {currencySymbol}
                      </div>

                      {/* Invoice ID */}
                      <div className="mt-1 text-sm text-dark-400">
                        <code className="font-mono text-accent-400">{payment.identifier}</code>
                      </div>

                      {/* User info */}
                      {(payment.user_username ||
                        payment.user_telegram_id ||
                        payment.user_email) && (
                        <div className="mt-2 text-sm text-dark-400">
                          <span className="text-dark-500">{t('admin.payments.user')}:</span>{' '}
                          {payment.user_id ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/admin/users/${payment.user_id}`);
                              }}
                              className="inline-flex items-center gap-1 transition-colors hover:underline"
                            >
                              {payment.user_username && (
                                <span className="text-accent-400">@{payment.user_username}</span>
                              )}
                              {payment.user_username &&
                                (payment.user_telegram_id || payment.user_email) && (
                                  <span className="text-dark-500"> &middot; </span>
                                )}
                              {payment.user_telegram_id && (
                                <span className="text-accent-300">
                                  TG: {payment.user_telegram_id}
                                </span>
                              )}
                              {!payment.user_telegram_id && payment.user_email && (
                                <span className="text-accent-300">{payment.user_email}</span>
                              )}
                            </button>
                          ) : (
                            <>
                              {payment.user_username && (
                                <span className="text-dark-200">@{payment.user_username}</span>
                              )}
                              {payment.user_username &&
                                (payment.user_telegram_id || payment.user_email) && (
                                  <span className="text-dark-500"> &middot; </span>
                                )}
                              {payment.user_telegram_id && (
                                <span className="text-dark-300">
                                  TG: {payment.user_telegram_id}
                                </span>
                              )}
                              {!payment.user_telegram_id && payment.user_email && (
                                <span className="text-dark-300">{payment.user_email}</span>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="mt-1 text-xs text-dark-500">
                        {new Date(payment.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Action buttons */}
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
                    checkPaymentMutation.variables?.paymentId === payment.id &&
                    checkPaymentMutation.variables?.method === payment.method && (
                      <div
                        className={`mt-3 rounded-lg p-2 text-sm ${
                          checkPaymentMutation.data?.status_changed
                            ? 'border border-green-500/30 bg-green-500/10 text-green-400'
                            : 'bg-dark-700/30 text-dark-400'
                        }`}
                      >
                        {checkPaymentMutation.data?.message}
                      </div>
                    )}
                  {checkPaymentMutation.isError &&
                    checkPaymentMutation.variables?.paymentId === payment.id &&
                    checkPaymentMutation.variables?.method === payment.method && (
                      <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-400">
                        {t('admin.payments.checkError')}
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
              {t('balance.page', {
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
