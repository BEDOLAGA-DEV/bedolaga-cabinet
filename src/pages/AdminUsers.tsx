import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useCurrency } from '../hooks/useCurrency';
import { adminUsersApi, type UserListItem } from '../api/adminUsers';
import { usePlatform } from '../platform/hooks/usePlatform';
import { StatCard } from '@/components/stats';
import {
  BackIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshIcon,
  TelegramSmallIcon as TelegramIcon,
  UsersIcon,
  CheckCircleIcon,
  SubscriptionIcon,
  UserPlusIcon,
  BanIcon,
} from '@/components/icons';

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-success-500/20 text-success-400 border-success-500/30',
    blocked: 'bg-error-500/20 text-error-400 border-error-500/30',
    deleted: 'bg-dark-600 text-dark-400 border-dark-500',
    trial: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    expired: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    disabled: 'bg-dark-600 text-dark-400 border-dark-500',
  };

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${styles[status] || styles.active}`}>
      {status}
    </span>
  );
}

interface UserRowProps {
  user: UserListItem;
  onClick: () => void;
  formatAmount: (rubAmount: number) => string;
}

function UserRow({ user, onClick, formatAmount }: UserRowProps) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-dark-700 bg-dark-800/50 p-3 transition-all hover:border-dark-600 hover:bg-dark-800 sm:items-center sm:gap-4 sm:p-4"
    >
      {/* Avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-medium text-white sm:text-base">
        {user.first_name?.[0] || user.username?.[0] || '?'}
      </div>

      {/* Info - flex column on mobile, row on desktop */}
      <div className="min-w-0 flex-1">
        {/* Name and username */}
        <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="truncate font-medium text-dark-100">{user.full_name}</span>
          {user.username && (
            <span className="truncate text-xs text-dark-500 sm:text-xs">@{user.username}</span>
          )}
        </div>

        {/* Telegram ID - full width on mobile */}
        <div className="mb-1 flex items-center gap-1 text-xs text-dark-400 sm:mb-0">
          <TelegramIcon />
          <span className="truncate">{user.telegram_id}</span>
        </div>

        {/* Status badges - wrap on mobile */}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {user.status !== 'active' && <StatusBadge status={user.status} />}
          {user.has_subscription && user.subscription_status && (
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                user.subscription_status === 'active'
                  ? 'border-success-500/30 bg-success-500/20 text-success-400'
                  : user.subscription_status === 'trial'
                    ? 'border-accent-500/30 bg-accent-500/20 text-accent-400'
                    : user.subscription_status === 'limited'
                      ? 'border-warning-500/30 bg-warning-500/20 text-warning-400'
                      : 'border-warning-500/30 bg-warning-500/20 text-warning-400'
              }`}
            >
              {user.subscription_status === 'active'
                ? t('admin.users.status.subscription')
                : user.subscription_status === 'trial'
                  ? t('admin.users.status.trial')
                  : user.subscription_status === 'limited'
                    ? t('subscription.trafficLimited')
                    : t('admin.users.status.expired')}
            </span>
          )}
        </div>
      </div>

      {/* Balance - smaller on mobile, show inline */}
      <div className="shrink-0 text-right">
        <div className="text-sm font-medium text-dark-100 sm:text-base">
          {formatAmount(user.balance_rubles)}
        </div>
        <div className="hidden text-xs text-dark-500 sm:block">
          {user.purchase_count > 0
            ? t('admin.users.purchaseCount', { count: user.purchase_count })
            : t('admin.users.noPurchases')}
        </div>
      </div>

      <ChevronRightIcon />
    </div>
  );
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [search, setSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [offset, setOffset] = useState(0);

  const limit = 20;

  const usersQuery = useQuery({
    queryKey: ['admin-users', offset, limit, sortBy, search, emailSearch, statusFilter] as const,
    queryFn: () => {
      const params: Record<string, unknown> = { offset, limit, sort_by: sortBy };
      if (search) params.search = search;
      if (emailSearch) params.email = emailSearch;
      if (statusFilter) params.status = statusFilter;
      return adminUsersApi.getUsers(params as Parameters<typeof adminUsersApi.getUsers>[0]);
    },
  });
  const users = usersQuery.data?.users ?? [];
  const total = usersQuery.data?.total ?? 0;
  const loading = usersQuery.isLoading;

  const statsQuery = useQuery({
    queryKey: ['admin-users-stats'] as const,
    queryFn: () => adminUsersApi.getStats(),
  });
  const stats = statsQuery.data ?? null;

  const handleSearch = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
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
            <h1 className="text-xl font-bold text-dark-100">{t('admin.users.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.users.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => {
            usersQuery.refetch();
            statsQuery.refetch();
          }}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label={t('admin.users.stats.total')}
            value={stats.total_users}
            icon={<UsersIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.users.stats.active')}
            value={stats.active_users}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.users.stats.withSubscription')}
            value={stats.users_with_active_subscription}
            icon={<SubscriptionIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.users.stats.newToday')}
            value={stats.new_today}
            icon={<UserPlusIcon className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label={t('admin.users.stats.blocked')}
            value={stats.blocked_users}
            icon={<BanIcon className="h-5 w-5" />}
            tone="error"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Search fields row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder={t('admin.users.search')}
                className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2 pl-10 pr-4 text-dark-100 placeholder-dark-500 focus:border-dark-600 focus:outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                <SearchIcon />
              </div>
            </div>
          </form>
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="email"
                value={emailSearch}
                onChange={(e) => {
                  setEmailSearch(e.target.value);
                  setOffset(0);
                }}
                placeholder={t('admin.users.searchEmail')}
                className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2 pl-10 pr-4 text-dark-100 placeholder-dark-500 focus:border-dark-600 focus:outline-none"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                <SearchIcon />
              </div>
            </div>
          </form>
        </div>
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-dark-100"
          >
            <option value="">{t('admin.users.filters.allStatuses')}</option>
            <option value="active">{t('admin.users.status.active')}</option>
            <option value="blocked">{t('admin.users.status.blocked')}</option>
            <option value="deleted">{t('admin.users.status.deleted')}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setOffset(0);
            }}
            className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-dark-100"
          >
            <option value="created_at">{t('admin.users.filters.byDate')}</option>
            <option value="balance">{t('admin.users.filters.byBalance')}</option>
            <option value="last_activity">{t('admin.users.filters.byActivity')}</option>
            <option value="total_spent">{t('admin.users.filters.bySpent')}</option>
          </select>
        </div>
      </div>

      {/* Users list */}
      <div className="mb-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-dark-400">{t('admin.users.noData')}</div>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onClick={() => navigate(`/admin/users/${user.id}`)}
              formatAmount={(amount) => formatWithCurrency(amount)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-dark-400">
            {t('admin.users.pagination.showing', {
              from: offset + 1,
              to: Math.min(offset + limit, total),
              total,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              <ChevronLeftIcon />
            </button>
            <span className="px-3 py-2 text-dark-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
