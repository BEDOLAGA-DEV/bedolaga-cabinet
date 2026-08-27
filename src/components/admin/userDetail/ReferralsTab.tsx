import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useCurrency } from '../../../hooks/useCurrency';
import { useNotify } from '../../../platform/hooks/useNotify';
import { adminUsersApi, type UserDetailResponse, type UserListItem } from '../../../api/adminUsers';
import { StatCard } from '@/components/stats';
import { BanknotesIcon, PercentIcon, TagIcon, UsersIcon, XIcon } from '@/components/icons';

// ──────────────────────────────────────────────────────────────────
// Referrals tab — top-of-graph referrer + stats + referrals list,
// plus inline search/assign/remove flows. All state stays local;
// the parent only owns the user query and tells us when it refreshes.
// ──────────────────────────────────────────────────────────────────

export interface ReferralsTabProps {
  user: UserDetailResponse;
  userId: number;
  onUserRefresh: () => Promise<void> | void;
}

export function ReferralsTab({ user, userId, onUserRefresh }: ReferralsTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const notify = useNotify();

  // Referrals list — owned here, not in the parent.
  const referralsListQuery = useQuery({
    queryKey: ['admin-user-referrals-list', userId] as const,
    queryFn: () => adminUsersApi.getReferrals(userId, 0, 100),
    enabled: !!userId,
  });
  const referralsList = referralsListQuery.data?.users ?? [];
  const referralsTotal = referralsListQuery.data?.total ?? 0;
  const referralsListLoading = referralsListQuery.isFetching;

  // Action gating — local so other tabs' buttons aren't dimmed during a
  // referral mutation here.
  const [actionLoading, setActionLoading] = useState(false);

  // Inline referrer search dropdown
  const [showReferrerSearch, setShowReferrerSearch] = useState(false);
  const [referrerSearchQuery, setReferrerSearchQuery] = useState('');
  const [referrerSearchResults, setReferrerSearchResults] = useState<UserListItem[]>([]);
  const [referrerSearchLoading, setReferrerSearchLoading] = useState(false);
  const referrerSearchRef = useRef<HTMLDivElement>(null);

  // Inline add-referral search dropdown
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [addReferralSearchQuery, setAddReferralSearchQuery] = useState('');
  const [addReferralSearchResults, setAddReferralSearchResults] = useState<UserListItem[]>([]);
  const [addReferralSearchLoading, setAddReferralSearchLoading] = useState(false);
  const addReferralSearchRef = useRef<HTMLDivElement>(null);

  // Debounced search for referrer
  useEffect(() => {
    if (referrerSearchQuery.length < 2 || !showReferrerSearch) {
      setReferrerSearchResults([]);
      setReferrerSearchLoading(false);
      return;
    }
    setReferrerSearchLoading(true);
    setReferrerSearchResults([]);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await adminUsersApi.getUsers({ search: referrerSearchQuery, limit: 10 });
        if (!cancelled) {
          setReferrerSearchResults(data.users || []);
          setReferrerSearchLoading(false);
        }
      } catch {
        if (!cancelled) {
          setReferrerSearchResults([]);
          setReferrerSearchLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referrerSearchQuery, showReferrerSearch]);

  // Close referrer dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (referrerSearchRef.current && !referrerSearchRef.current.contains(e.target as Node)) {
        setShowReferrerSearch(false);
        setReferrerSearchQuery('');
        setReferrerSearchResults([]);
      }
    };
    if (showReferrerSearch) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReferrerSearch]);

  // Debounced search for adding referral
  useEffect(() => {
    if (addReferralSearchQuery.length < 2 || !showAddReferral) {
      setAddReferralSearchResults([]);
      setAddReferralSearchLoading(false);
      return;
    }
    setAddReferralSearchLoading(true);
    setAddReferralSearchResults([]);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await adminUsersApi.getUsers({ search: addReferralSearchQuery, limit: 10 });
        if (!cancelled) {
          setAddReferralSearchResults(data.users || []);
          setAddReferralSearchLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAddReferralSearchResults([]);
          setAddReferralSearchLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addReferralSearchQuery, showAddReferral]);

  // Close add-referral dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addReferralSearchRef.current &&
        !addReferralSearchRef.current.contains(e.target as Node)
      ) {
        setShowAddReferral(false);
        setAddReferralSearchQuery('');
        setAddReferralSearchResults([]);
      }
    };
    if (showAddReferral) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddReferral]);

  // ─── Mutation handlers ───────────────────────────────────────────

  const handleAssignReferrer = async (referrerId: number) => {
    setActionLoading(true);
    try {
      await adminUsersApi.assignReferrer(userId, referrerId);
      await onUserRefresh();
      setShowReferrerSearch(false);
      setReferrerSearchQuery('');
      setReferrerSearchResults([]);
      notify.success(t('admin.users.detail.referrals.referrerAssigned'));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      notify.error(axiosErr?.response?.data?.detail || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveReferrer = async () => {
    setActionLoading(true);
    try {
      await adminUsersApi.removeReferrer(userId);
      await onUserRefresh();
      notify.success(t('admin.users.detail.referrals.referrerRemoved'));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      notify.error(axiosErr?.response?.data?.detail || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveReferral = async (referralUserId: number) => {
    setActionLoading(true);
    try {
      await adminUsersApi.removeReferral(userId, referralUserId);
      await referralsListQuery.refetch();
      await onUserRefresh();
      notify.success(t('admin.users.detail.referrals.referralRemoved'));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      notify.error(axiosErr?.response?.data?.detail || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddReferral = async (targetUserId: number) => {
    setActionLoading(true);
    try {
      await adminUsersApi.assignReferrer(targetUserId, userId);
      await referralsListQuery.refetch();
      await onUserRefresh();
      setShowAddReferral(false);
      setAddReferralSearchQuery('');
      setAddReferralSearchResults([]);
      notify.success(t('admin.users.detail.referrals.referralAdded'));
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      notify.error(axiosErr?.response?.data?.detail || t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Section 1: Who referred this user */}
      <div className="rounded-2xl border border-dark-700/30 bg-dark-800/40 p-5">
        <h3 className="mb-4 text-base font-semibold text-dark-100">
          {t('admin.users.detail.referrals.referredBy')}
        </h3>

        {user.referral.referred_by_id ? (
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate(`/admin/users/${user.referral.referred_by_id}`)}
              className="flex items-center gap-3 rounded-xl bg-dark-700/30 px-4 py-3 transition-colors hover:bg-dark-700/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-500/20 text-sm font-bold text-accent-400">
                {(user.referral.referred_by_username || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium text-dark-100">
                  {user.referral.referred_by_username || `ID: ${user.referral.referred_by_id}`}
                </div>
                <div className="text-xs text-dark-500">ID: {user.referral.referred_by_id}</div>
              </div>
            </button>
            <button
              onClick={handleRemoveReferrer}
              disabled={actionLoading}
              className="rounded-lg border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-400 transition-colors hover:bg-error-500/20 disabled:opacity-50"
            >
              {t('admin.users.detail.referrals.removeReferrer')}
            </button>
          </div>
        ) : (
          <div>
            {showReferrerSearch ? (
              <div ref={referrerSearchRef} className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={referrerSearchQuery}
                    onChange={(e) => setReferrerSearchQuery(e.target.value)}
                    placeholder={t('admin.users.detail.referrals.searchPlaceholder')}
                    className="flex-1 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-accent-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowReferrerSearch(false);
                      setReferrerSearchQuery('');
                      setReferrerSearchResults([]);
                    }}
                    className="rounded-lg bg-dark-700 px-3 py-2.5 text-sm text-dark-400 hover:bg-dark-600"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
                {referrerSearchQuery.length >= 2 && referrerSearchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
                    {referrerSearchResults
                      .filter((u) => u.id !== userId)
                      .map((u) => (
                        <button
                          key={u.id}
                          onClick={() => handleAssignReferrer(u.id)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-dark-700/50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-600/50 text-xs font-bold text-dark-300">
                            {(u.full_name || u.username || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm text-dark-100">
                              {u.full_name || u.username || `ID: ${u.id}`}
                            </div>
                            <div className="text-xs text-dark-500">
                              {u.telegram_id ? `TG: ${u.telegram_id}` : `ID: ${u.id}`}
                            </div>
                          </div>
                        </button>
                      ))}
                    {referrerSearchResults.filter((u) => u.id !== userId).length === 0 && (
                      <div className="px-3 py-4 text-center text-sm text-dark-500">
                        {t('admin.users.detail.referrals.noUsersFound')}
                      </div>
                    )}
                  </div>
                )}
                {referrerSearchQuery.length >= 2 &&
                  !referrerSearchLoading &&
                  referrerSearchResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-dark-700 bg-dark-800 py-4 text-center text-sm text-dark-500 shadow-xl">
                      {t('admin.users.detail.referrals.noUsersFound')}
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-500">
                  {t('admin.users.detail.referrals.noReferrer')}
                </span>
                <button
                  onClick={() => setShowReferrerSearch(true)}
                  className="rounded-lg bg-accent-500/15 px-3 py-2 text-sm text-accent-400 transition-colors hover:bg-accent-500/25"
                >
                  {t('admin.users.detail.referrals.assignReferrer')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2: Referral stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('admin.users.detail.referrals.totalReferrals')}
          value={user.referral.referrals_count}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.users.detail.referrals.totalEarnings')}
          value={formatWithCurrency(user.referral.total_earnings_kopeks / 100)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.users.detail.referrals.commission')}
          value={
            user.referral.commission_percent != null
              ? `${user.referral.commission_percent}%`
              : t('admin.users.detail.referrals.default')
          }
          icon={<PercentIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.users.detail.referrals.referralCode')}
          value={user.referral.referral_code}
          icon={<TagIcon className="h-5 w-5" />}
          tone="neutral"
          valueClassName="font-mono"
        />
      </div>

      {/* Section 3: Referrals list */}
      <div className="rounded-2xl border border-dark-700/30 bg-dark-800/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-dark-100">
            {t('admin.users.detail.referrals.referralsList')} ({referralsTotal})
          </h3>
          {!showAddReferral && (
            <button
              onClick={() => setShowAddReferral(true)}
              className="rounded-lg bg-accent-500/15 px-3 py-2 text-sm text-accent-400 transition-colors hover:bg-accent-500/25"
            >
              {t('admin.users.detail.referrals.addReferral')}
            </button>
          )}
        </div>

        {/* Add referral search */}
        {showAddReferral && (
          <div ref={addReferralSearchRef} className="relative mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={addReferralSearchQuery}
                onChange={(e) => setAddReferralSearchQuery(e.target.value)}
                placeholder={t('admin.users.detail.referrals.searchPlaceholder')}
                className="flex-1 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-accent-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowAddReferral(false);
                  setAddReferralSearchQuery('');
                  setAddReferralSearchResults([]);
                }}
                className="rounded-lg bg-dark-700 px-3 py-2.5 text-sm text-dark-400 hover:bg-dark-600"
              >
                {t('common.cancel')}
              </button>
            </div>
            {addReferralSearchQuery.length >= 2 && addReferralSearchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
                {addReferralSearchResults
                  .filter((u) => u.id !== userId && !referralsList.some((r) => r.id === u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleAddReferral(u.id)}
                      disabled={actionLoading}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-dark-700/50 disabled:opacity-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-600/50 text-xs font-bold text-dark-300">
                        {(u.full_name || u.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-dark-100">
                          {u.full_name || u.username || `ID: ${u.id}`}
                        </div>
                        <div className="text-xs text-dark-500">
                          {u.telegram_id ? `TG: ${u.telegram_id}` : `ID: ${u.id}`}
                        </div>
                      </div>
                    </button>
                  ))}
                {addReferralSearchResults.filter(
                  (u) => u.id !== userId && !referralsList.some((r) => r.id === u.id),
                ).length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-dark-500">
                    {t('admin.users.detail.referrals.noUsersFound')}
                  </div>
                )}
              </div>
            )}
            {addReferralSearchQuery.length >= 2 &&
              !addReferralSearchLoading &&
              addReferralSearchResults.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-dark-700 bg-dark-800 py-4 text-center text-sm text-dark-500 shadow-xl">
                  {t('admin.users.detail.referrals.noUsersFound')}
                </div>
              )}
          </div>
        )}

        {referralsListLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : referralsList.length === 0 ? (
          <div className="py-8 text-center text-dark-500">
            {t('admin.users.detail.referrals.noReferrals')}
          </div>
        ) : (
          <div className="space-y-2">
            {referralsList.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between rounded-xl bg-dark-700/20 px-4 py-3"
              >
                <button
                  onClick={() => navigate(`/admin/users/${ref.id}`)}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dark-600/50 text-sm font-bold text-dark-300">
                    {(ref.full_name || ref.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-dark-100">
                      {ref.full_name || ref.username || `ID: ${ref.id}`}
                    </div>
                    <div className="text-xs text-dark-500">
                      {ref.telegram_id ? `TG: ${ref.telegram_id}` : `ID: ${ref.id}`}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleRemoveReferral(ref.id)}
                  disabled={actionLoading}
                  className="shrink-0 rounded-lg p-2 text-dark-500 transition-colors hover:bg-error-500/10 hover:text-error-400 disabled:opacity-50"
                  title={t('admin.users.detail.referrals.removeReferral')}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
