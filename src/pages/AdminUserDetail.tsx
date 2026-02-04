import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useCurrency } from '../hooks/useCurrency';
import {
  adminUsersApi,
  type UserDetailResponse,
  type UserAvailableTariff,
  type PanelSyncStatusResponse,
  type UpdateSubscriptionRequest,
} from '../api/adminUsers';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

// ============ Icons ============

const RefreshIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MinusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
);

const ArrowDownIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
  </svg>
);

const ArrowUpIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

// ============ Components ============

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

// ============ Main Page ============

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useBackButton(() => navigate('/admin/users'));

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'subscription' | 'balance' | 'sync'>('info');
  const [syncStatus, setSyncStatus] = useState<PanelSyncStatusResponse | null>(null);
  const [tariffs, setTariffs] = useState<UserAvailableTariff[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Balance form
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceDescription, setBalanceDescription] = useState('');

  // Subscription form
  const [subAction, setSubAction] = useState<string>('extend');
  const [subDays, setSubDays] = useState('30');
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);

  const userId = id ? parseInt(id, 10) : null;

  const loadUser = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await adminUsersApi.getUser(userId);
      setUser(data);
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  const loadSyncStatus = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await adminUsersApi.getSyncStatus(userId);
      setSyncStatus(data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }, [userId]);

  const loadTariffs = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await adminUsersApi.getAvailableTariffs(userId, true);
      setTariffs(data.tariffs);
    } catch (error) {
      console.error('Failed to load tariffs:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || isNaN(userId)) {
      navigate('/admin/users');
      return;
    }
    loadUser();
  }, [userId, loadUser, navigate]);

  useEffect(() => {
    if (activeTab === 'sync') loadSyncStatus();
    if (activeTab === 'subscription') loadTariffs();
  }, [activeTab, loadSyncStatus, loadTariffs]);

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (!balanceAmount || !userId) return;
    setActionLoading(true);
    try {
      const amount = Math.abs(parseFloat(balanceAmount) * 100);
      await adminUsersApi.updateBalance(userId, {
        amount_kopeks: isAdd ? amount : -amount,
        description:
          balanceDescription ||
          (isAdd
            ? t('admin.users.detail.balance.addByAdmin')
            : t('admin.users.detail.balance.subtractByAdmin')),
      });
      await loadUser();
      setBalanceAmount('');
      setBalanceDescription('');
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const data: UpdateSubscriptionRequest = {
        action: subAction as UpdateSubscriptionRequest['action'],
        ...(subAction === 'extend' ? { days: parseInt(subDays) } : {}),
        ...(subAction === 'change_tariff' && selectedTariffId
          ? { tariff_id: selectedTariffId }
          : {}),
        ...(subAction === 'create'
          ? {
              days: parseInt(subDays),
              ...(selectedTariffId ? { tariff_id: selectedTariffId } : {}),
            }
          : {}),
      };
      await adminUsersApi.updateSubscription(userId, data);
      await loadUser();
    } catch (error) {
      console.error('Failed to update subscription:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!userId || !confirm(t('admin.users.confirm.block'))) return;
    setActionLoading(true);
    try {
      await adminUsersApi.blockUser(userId);
      await loadUser();
    } catch (error) {
      console.error('Failed to block user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.unblockUser(userId);
      await loadUser();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncFromPanel = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.syncFromPanel(userId, {
        update_subscription: true,
        update_traffic: true,
      });
      await loadUser();
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to sync from panel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncToPanel = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.syncToPanel(userId, { create_if_missing: true });
      await loadUser();
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to sync to panel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-dark-400">{t('admin.users.notFound')}</p>
        <button
          onClick={() => navigate('/admin/users')}
          className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/users" />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-lg font-bold text-white">
            {user.first_name?.[0] || user.username?.[0] || '?'}
          </div>
          <div>
            <div className="font-semibold text-dark-100">{user.full_name}</div>
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <TelegramIcon />
              {user.telegram_id}
              {user.username && <span>@{user.username}</span>}
            </div>
          </div>
        </div>
        <button onClick={loadUser} className="rounded-lg p-2 transition-colors hover:bg-dark-700">
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {(['info', 'subscription', 'balance', 'sync'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 active:bg-dark-700'
            }`}
          >
            {tab === 'info' && t('admin.users.detail.tabs.info')}
            {tab === 'subscription' && t('admin.users.detail.tabs.subscription')}
            {tab === 'balance' && t('admin.users.detail.tabs.balance')}
            {tab === 'sync' && t('admin.users.detail.tabs.sync')}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 p-3">
              <span className="text-dark-400">{t('admin.users.detail.status')}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={user.status} />
                {user.status === 'active' ? (
                  <button
                    onClick={handleBlockUser}
                    disabled={actionLoading}
                    className="rounded-lg bg-error-500/20 px-3 py-1 text-xs text-error-400 transition-colors hover:bg-error-500/30"
                  >
                    {t('admin.users.actions.block')}
                  </button>
                ) : user.status === 'blocked' ? (
                  <button
                    onClick={handleUnblockUser}
                    disabled={actionLoading}
                    className="rounded-lg bg-success-500/20 px-3 py-1 text-xs text-success-400 transition-colors hover:bg-success-500/30"
                  >
                    {t('admin.users.actions.unblock')}
                  </button>
                ) : null}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">Email</div>
                <div className="text-dark-100">{user.email || '-'}</div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.language')}</div>
                <div className="text-dark-100">{user.language}</div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.registration')}
                </div>
                <div className="text-dark-100">{formatDate(user.created_at)}</div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.lastActivity')}
                </div>
                <div className="text-dark-100">{formatDate(user.last_activity)}</div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.totalSpent')}
                </div>
                <div className="text-dark-100">
                  {formatWithCurrency(user.total_spent_kopeks / 100)}
                </div>
              </div>
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.purchases')}
                </div>
                <div className="text-dark-100">{user.purchase_count}</div>
              </div>
            </div>

            {/* Referral */}
            <div className="rounded-xl bg-dark-800/50 p-3">
              <div className="mb-2 text-sm font-medium text-dark-200">
                {t('admin.users.detail.referral.title')}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-dark-100">
                    {user.referral.referrals_count}
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('admin.users.detail.referral.referrals')}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-dark-100">
                    {formatWithCurrency(user.referral.total_earnings_kopeks / 100)}
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('admin.users.detail.referral.earned')}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-dark-100">
                    {user.referral.commission_percent || 0}%
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('admin.users.detail.referral.commission')}
                  </div>
                </div>
              </div>
            </div>

            {/* Restrictions */}
            {(user.restriction_topup || user.restriction_subscription) && (
              <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3">
                <div className="mb-2 text-sm font-medium text-error-400">
                  {t('admin.users.detail.restrictions.title')}
                </div>
                {user.restriction_topup && (
                  <div className="text-xs text-error-300">
                    {t('admin.users.detail.restrictions.topup')}
                  </div>
                )}
                {user.restriction_subscription && (
                  <div className="text-xs text-error-300">
                    {t('admin.users.detail.restrictions.subscription')}
                  </div>
                )}
                {user.restriction_reason && (
                  <div className="mt-1 text-xs text-dark-400">
                    {t('admin.users.detail.restrictions.reason')}: {user.restriction_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-4">
            {user.subscription ? (
              <>
                {/* Current subscription */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium text-dark-200">
                      {t('admin.users.detail.subscription.current')}
                    </span>
                    <StatusBadge status={user.subscription.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.subscription.tariff')}
                      </div>
                      <div className="text-dark-100">
                        {user.subscription.tariff_name ||
                          t('admin.users.detail.subscription.notSpecified')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.subscription.validUntil')}
                      </div>
                      <div className="text-dark-100">{formatDate(user.subscription.end_date)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.subscription.traffic')}
                      </div>
                      <div className="text-dark-100">
                        {user.subscription.traffic_used_gb.toFixed(1)} /{' '}
                        {user.subscription.traffic_limit_gb} {t('common.units.gb')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.subscription.devices')}
                      </div>
                      <div className="text-dark-100">{user.subscription.device_limit}</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="mb-3 font-medium text-dark-200">
                    {t('admin.users.detail.subscription.actions')}
                  </div>
                  <div className="space-y-3">
                    <select
                      value={subAction}
                      onChange={(e) => setSubAction(e.target.value)}
                      className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                    >
                      <option value="extend">{t('admin.users.detail.subscription.extend')}</option>
                      <option value="change_tariff">
                        {t('admin.users.detail.subscription.changeTariff')}
                      </option>
                      <option value="cancel">{t('admin.users.detail.subscription.cancel')}</option>
                      <option value="activate">
                        {t('admin.users.detail.subscription.activate')}
                      </option>
                    </select>

                    {subAction === 'extend' && (
                      <input
                        type="number"
                        value={subDays}
                        onChange={(e) => setSubDays(e.target.value)}
                        placeholder={t('admin.users.detail.subscription.days')}
                        className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                      />
                    )}

                    {subAction === 'change_tariff' && (
                      <select
                        value={selectedTariffId || ''}
                        onChange={(e) =>
                          setSelectedTariffId(e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                      >
                        <option value="">
                          {t('admin.users.detail.subscription.selectTariff')}
                        </option>
                        {tariffs.map((tariffItem) => (
                          <option key={tariffItem.id} value={tariffItem.id}>
                            {tariffItem.name}{' '}
                            {!tariffItem.is_available &&
                              t('admin.users.detail.subscription.unavailable')}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={handleUpdateSubscription}
                      disabled={actionLoading}
                      className="w-full rounded-lg bg-accent-500 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                    >
                      {actionLoading
                        ? t('admin.users.actions.applying')
                        : t('admin.users.actions.apply')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-dark-800/50 p-4">
                <div className="mb-4 text-center text-dark-400">
                  {t('admin.users.detail.subscription.noActive')}
                </div>
                <div className="space-y-3">
                  <select
                    value={selectedTariffId || ''}
                    onChange={(e) =>
                      setSelectedTariffId(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                  >
                    <option value="">{t('admin.users.detail.subscription.selectTariff')}</option>
                    {tariffs.map((tariffItem) => (
                      <option key={tariffItem.id} value={tariffItem.id}>
                        {tariffItem.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={subDays}
                    onChange={(e) => setSubDays(e.target.value)}
                    placeholder={t('admin.users.detail.subscription.days')}
                    className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
                  />
                  <button
                    onClick={() => {
                      setSubAction('create');
                      handleUpdateSubscription();
                    }}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-success-500 py-2 text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                  >
                    {actionLoading
                      ? t('admin.users.detail.subscription.creating')
                      : t('admin.users.detail.subscription.create')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Balance Tab */}
        {activeTab === 'balance' && (
          <div className="space-y-4">
            {/* Current balance */}
            <div className="rounded-xl border border-accent-500/30 bg-gradient-to-r from-accent-500/20 to-accent-700/20 p-4">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.users.detail.balance.current')}
              </div>
              <div className="text-3xl font-bold text-dark-100">
                {formatWithCurrency(user.balance_rubles)}
              </div>
            </div>

            {/* Add/subtract form */}
            <div className="space-y-3 rounded-xl bg-dark-800/50 p-4">
              <input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder={t('admin.users.detail.balance.amountPlaceholder')}
                className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
              />
              <input
                type="text"
                value={balanceDescription}
                onChange={(e) => setBalanceDescription(e.target.value)}
                placeholder={t('admin.users.detail.balance.descriptionPlaceholder')}
                className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateBalance(true)}
                  disabled={actionLoading || !balanceAmount}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success-500 py-2 text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                >
                  <PlusIcon /> {t('admin.users.detail.balance.add')}
                </button>
                <button
                  onClick={() => handleUpdateBalance(false)}
                  disabled={actionLoading || !balanceAmount}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error-500 py-2 text-white transition-colors hover:bg-error-600 disabled:opacity-50"
                >
                  <MinusIcon /> {t('admin.users.detail.balance.subtract')}
                </button>
              </div>
            </div>

            {/* Recent transactions */}
            {user.recent_transactions.length > 0 && (
              <div className="rounded-xl bg-dark-800/50 p-4">
                <div className="mb-3 font-medium text-dark-200">
                  {t('admin.users.detail.balance.recentTransactions')}
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {user.recent_transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between border-b border-dark-700 py-2 last:border-0"
                    >
                      <div>
                        <div className="text-sm text-dark-200">{tx.description || tx.type}</div>
                        <div className="text-xs text-dark-500">{formatDate(tx.created_at)}</div>
                      </div>
                      <div
                        className={tx.amount_kopeks >= 0 ? 'text-success-400' : 'text-error-400'}
                      >
                        {tx.amount_kopeks >= 0 ? '+' : ''}
                        {formatWithCurrency(tx.amount_rubles)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            {/* Sync status */}
            {syncStatus && (
              <div
                className={`rounded-xl border p-4 ${syncStatus.has_differences ? 'border-warning-500/30 bg-warning-500/10' : 'border-success-500/30 bg-success-500/10'}`}
              >
                <div className="mb-3 flex items-center gap-2">
                  {syncStatus.has_differences ? (
                    <span className="font-medium text-warning-400">
                      {t('admin.users.detail.sync.hasDifferences')}
                    </span>
                  ) : (
                    <span className="font-medium text-success-400">
                      {t('admin.users.detail.sync.synced')}
                    </span>
                  )}
                </div>

                {syncStatus.differences.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {syncStatus.differences.map((diff, i) => (
                      <div key={i} className="text-xs text-dark-300">
                        • {diff}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="mb-2 text-xs text-dark-500">
                      {t('admin.users.detail.sync.bot')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.statusLabel')}:
                        </span>
                        <span className="text-dark-200">
                          {syncStatus.bot_subscription_status || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">{t('admin.users.detail.sync.until')}:</span>
                        <span className="text-dark-200">
                          {syncStatus.bot_subscription_end_date
                            ? new Date(syncStatus.bot_subscription_end_date).toLocaleDateString(
                                locale,
                              )
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.traffic')}:
                        </span>
                        <span className="text-dark-200">
                          {syncStatus.bot_traffic_used_gb.toFixed(2)} {t('common.units.gb')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.devices')}:
                        </span>
                        <span className="text-dark-200">{syncStatus.bot_device_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.squads')}:
                        </span>
                        <span className="text-dark-200">{syncStatus.bot_squads?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-dark-500">
                      {t('admin.users.detail.sync.panel')}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.statusLabel')}:
                        </span>
                        <span className="text-dark-200">{syncStatus.panel_status || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">{t('admin.users.detail.sync.until')}:</span>
                        <span className="text-dark-200">
                          {syncStatus.panel_expire_at
                            ? new Date(syncStatus.panel_expire_at).toLocaleDateString(locale)
                            : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.traffic')}:
                        </span>
                        <span className="text-dark-200">
                          {syncStatus.panel_traffic_used_gb.toFixed(2)} {t('common.units.gb')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.devices')}:
                        </span>
                        <span className="text-dark-200">{syncStatus.panel_device_limit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-400">
                          {t('admin.users.detail.sync.squads')}:
                        </span>
                        <span className="text-dark-200">
                          {syncStatus.panel_squads?.length || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* UUID info */}
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-1 text-sm text-dark-400">Remnawave UUID</div>
              <div className="break-all font-mono text-sm text-dark-100">
                {syncStatus?.remnawave_uuid ||
                  user.remnawave_uuid ||
                  t('admin.users.detail.sync.notLinked')}
              </div>
            </div>

            {/* Sync buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSyncFromPanel}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 p-4 text-accent-400 transition-all hover:bg-accent-500/20 disabled:opacity-50"
              >
                <ArrowDownIcon className={`h-6 w-6 ${actionLoading ? 'animate-bounce' : ''}`} />
                <span className="text-center text-xs font-medium">
                  {t('admin.users.detail.sync.fromPanel')}
                </span>
              </button>
              <button
                onClick={handleSyncToPanel}
                disabled={actionLoading}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 p-4 text-accent-400 transition-all hover:bg-accent-500/20 disabled:opacity-50"
              >
                <ArrowUpIcon className={`h-6 w-6 ${actionLoading ? 'animate-bounce' : ''}`} />
                <span className="text-center text-xs font-medium">
                  {t('admin.users.detail.sync.toPanel')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
