import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import { useToast } from '../components/Toast';
import { adminUsersApi, type UserListItem, type UsersStatsResponse } from '../api/adminUsers';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// ============ Icons ============

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

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const RefreshIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const DotsVerticalIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const ArrowPathIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const NoSymbolIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
    />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

// ============ Confirmation Modal ============

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
}

function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmButtonClass = 'bg-rose-500 hover:bg-rose-600',
  isLoading = false,
}: ConfirmationModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
            <ExclamationTriangleIcon />
          </div>
          <h3 className="text-lg font-semibold text-dark-100">{title}</h3>
        </div>
        <p className="mb-6 text-dark-300">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-xl border border-dark-600 bg-dark-700 py-2.5 text-dark-200 transition-colors hover:bg-dark-600 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-xl py-2.5 text-white transition-colors disabled:opacity-50 ${confirmButtonClass}`}
          >
            {isLoading ? t('common.loading') : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ User Actions Menu ============

type UserAction = 'delete' | 'resetTrial' | 'resetSubscription' | 'disable';

interface UserActionsMenuProps {
  user: UserListItem;
  onAction: (action: UserAction, user: UserListItem) => void;
}

function UserActionsMenu({ user, onAction }: UserActionsMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: UserAction) => {
    setIsOpen(false);
    onAction(action, user);
  };

  const actions = [
    {
      key: 'resetTrial' as const,
      label: t('admin.users.userActions.resetTrial'),
      icon: <ArrowPathIcon />,
      className: 'text-blue-400 hover:bg-blue-500/10',
    },
    {
      key: 'resetSubscription' as const,
      label: t('admin.users.userActions.resetSubscription'),
      icon: <ArrowPathIcon />,
      className: 'text-amber-400 hover:bg-amber-500/10',
    },
    {
      key: 'disable' as const,
      label: t('admin.users.userActions.disable'),
      icon: <NoSymbolIcon />,
      className: 'text-dark-400 hover:bg-dark-700',
    },
    {
      key: 'delete' as const,
      label: t('admin.users.userActions.delete'),
      icon: <TrashIcon />,
      className: 'text-rose-400 hover:bg-rose-500/10',
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
      >
        <DotsVerticalIcon />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={(e) => {
                e.stopPropagation();
                handleAction(action.key);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${action.className}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Components ============

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  const colors = {
    blue: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    green: 'bg-success-500/20 text-success-400 border-success-500/30',
    yellow: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    red: 'bg-error-500/20 text-error-400 border-error-500/30',
    purple: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="mb-1 text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
      {subtitle && <div className="mt-1 text-xs opacity-60">{subtitle}</div>}
    </div>
  );
}

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

// ============ User List Component ============

interface UserRowProps {
  user: UserListItem;
  onClick: () => void;
  onAction: (action: UserAction, user: UserListItem) => void;
  formatAmount: (rubAmount: number) => string;
}

function UserRow({ user, onClick, onAction, formatAmount }: UserRowProps) {
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
                    : 'border-warning-500/30 bg-warning-500/20 text-warning-400'
              }`}
            >
              {user.subscription_status === 'active'
                ? t('admin.users.status.subscription')
                : user.subscription_status === 'trial'
                  ? t('admin.users.status.trial')
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

      {/* Actions Menu - hide chevron on mobile, show only dots */}
      <UserActionsMenu user={user} onAction={onAction} />

      <div className="hidden sm:block">
        <ChevronRightIcon />
      </div>
    </div>
  );
}

// ============ Main Page ============

interface ConfirmModalState {
  isOpen: boolean;
  action: UserAction | null;
  user: UserListItem | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [stats, setStats] = useState<UsersStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    action: null,
    user: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const limit = 20;

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = { offset, limit, sort_by: sortBy };
      if (search) params.search = search;
      if (emailSearch) params.email = emailSearch;
      if (statusFilter) params.status = statusFilter;

      const data = await adminUsersApi.getUsers(
        params as Parameters<typeof adminUsersApi.getUsers>[0],
      );
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  }, [offset, search, emailSearch, statusFilter, sortBy]);

  const loadStats = useCallback(async () => {
    try {
      const data = await adminUsersApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    loadUsers();
  };

  const handleUserAction = (action: UserAction, user: UserListItem) => {
    setConfirmModal({ isOpen: true, action, user });
  };

  const closeConfirmModal = () => {
    setConfirmModal({ isOpen: false, action: null, user: null });
  };

  const executeAction = async () => {
    const { action, user } = confirmModal;
    if (!action || !user) return;

    setActionLoading(true);
    try {
      let result: { success: boolean; message: string };

      switch (action) {
        case 'delete':
          result = await adminUsersApi.deleteUser(user.id);
          break;
        case 'resetTrial':
          result = await adminUsersApi.resetTrial(user.id);
          break;
        case 'resetSubscription':
          result = await adminUsersApi.resetSubscription(user.id);
          break;
        case 'disable':
          result = await adminUsersApi.disableUser(user.id);
          break;
        default:
          throw new Error('Unknown action');
      }

      if (result.success) {
        showToast({
          type: 'success',
          title: t('common.success'),
          message: t(`admin.users.userActions.success.${action}`),
        });
        loadUsers();
        loadStats();
      } else {
        showToast({
          type: 'error',
          title: t('common.error'),
          message: result.message || t('admin.users.userActions.error'),
        });
      }
    } catch (error) {
      console.error('Action failed:', error);
      showToast({
        type: 'error',
        title: t('common.error'),
        message: t('admin.users.userActions.error'),
      });
    } finally {
      setActionLoading(false);
      closeConfirmModal();
    }
  };

  const getConfirmModalContent = () => {
    const { action } = confirmModal;
    if (!action) return { title: '', message: '', confirmText: '', confirmButtonClass: '' };

    const configs: Record<
      UserAction,
      { title: string; message: string; confirmText: string; confirmButtonClass: string }
    > = {
      delete: {
        title: t('admin.users.userActions.confirmDelete.title'),
        message: t('admin.users.userActions.confirmDelete.message'),
        confirmText: t('admin.users.userActions.delete'),
        confirmButtonClass: 'bg-rose-500 hover:bg-rose-600',
      },
      resetTrial: {
        title: t('admin.users.userActions.confirmResetTrial.title'),
        message: t('admin.users.userActions.confirmResetTrial.message'),
        confirmText: t('admin.users.userActions.resetTrial'),
        confirmButtonClass: 'bg-blue-500 hover:bg-blue-600',
      },
      resetSubscription: {
        title: t('admin.users.userActions.confirmResetSubscription.title'),
        message: t('admin.users.userActions.confirmResetSubscription.message'),
        confirmText: t('admin.users.userActions.resetSubscription'),
        confirmButtonClass: 'bg-amber-500 hover:bg-amber-600',
      },
      disable: {
        title: t('admin.users.userActions.confirmDisable.title'),
        message: t('admin.users.userActions.confirmDisable.message'),
        confirmText: t('admin.users.userActions.disable'),
        confirmButtonClass: 'bg-dark-600 hover:bg-dark-500',
      },
    };

    return configs[action];
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
            loadUsers();
            loadStats();
          }}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title={t('admin.users.stats.total')} value={stats.total_users} color="blue" />
          <StatCard
            title={t('admin.users.stats.active')}
            value={stats.active_users}
            color="green"
          />
          <StatCard
            title={t('admin.users.stats.withSubscription')}
            value={stats.users_with_active_subscription}
            color="purple"
          />
          <StatCard
            title={t('admin.users.stats.newToday')}
            value={stats.new_today}
            color="yellow"
          />
          <StatCard
            title={t('admin.users.stats.blocked')}
            value={stats.blocked_users}
            color="red"
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
                onChange={(e) => setSearch(e.target.value)}
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
                onChange={(e) => setEmailSearch(e.target.value)}
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
              onAction={handleUserAction}
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

      {/* User action confirmation modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={executeAction}
        isLoading={actionLoading}
        {...getConfirmModalContent()}
      />
    </div>
  );
}
