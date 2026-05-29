import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { adminUsersApi, type UserListItem, type UserListItemSubscription } from '../api/adminUsers';
import { tariffsApi, type TariffListItem } from '../api/tariffs';
import { promocodesApi, type PromoGroup } from '../api/promocodes';
import { campaignsApi, type CampaignListItem } from '../api/campaigns';
import { partnerApi, type AdminPartnerItem } from '../api/partners';
import {
  adminBulkActionsApi,
  type BulkActionType,
  type BulkActionParams,
} from '../api/adminBulkActions';
import { usePlatform } from '../platform/hooks/usePlatform';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '@/lib/utils';
import { ActionModal, type ModalState } from '@/components/admin/bulkActions/ActionModal';
import { DropdownSelect, type DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { FloatingActionBar } from '@/components/admin/bulkActions/FloatingActionBar';
import { isSubscriptionLevelAction } from '@/components/admin/bulkActions/actionTargets';
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from '@/components/admin/bulkActions/MultiSelectDropdown';
import { SubscriptionSubRow, StatusBadge } from '@/components/admin/bulkActions/SubscriptionSubRow';

// ============ Types ============

type SubscriptionStatusFilter = '' | 'active' | 'expired' | 'trial' | 'limited' | 'disabled';

// (ActionConfig moved into ./bulkActions/FloatingActionBar.tsx as a private type)

// (ProgressState + ModalState moved into <ActionModal>; ModalState is re-exported.)

// Local CheckIcon — still used by MultiSelectDropdown checkboxes and
// the user-table column defs (not the modal). Kept here rather than
// re-exported from a shared icons module.
const CheckIcon = () => (
  <svg
    className="h-3 w-3 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

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

const ChevronExpandIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={cn('h-4 w-4 text-white transition-transform duration-200', expanded && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// (SUBSCRIPTION_LEVEL_ACTIONS + isSubscriptionLevelAction moved into ./bulkActions/actionTargets.ts)

// (SubscriptionSubRow + StatusBadge moved into ./bulkActions/SubscriptionSubRow.tsx)

// ============ Progress Bar ============

function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 8;
          if (prev < 60) return prev + 3;
          if (prev < 85) return prev + 1;
          if (prev < 95) return prev + 0.3;
          return prev;
        });
      }, 100);
    } else {
      if (visible) {
        setProgress(100);
        clearInterval(intervalRef.current);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div className="absolute left-0 right-0 top-0 z-50 h-0.5 overflow-hidden rounded-full bg-dark-700/50">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// (DropdownSelect moved into ./bulkActions/DropdownSelect.tsx)

// (MultiSelectDropdown moved into ./bulkActions/MultiSelectDropdown.tsx)

// (ProgressView moved into <ActionModal>)

// (ErrorDetails moved into <ActionModal>)

// (ActionModal moved into ./bulkActions/ActionModal.tsx)

// (FloatingActionBar moved into ./bulkActions/FloatingActionBar.tsx)

// ============ Helpers ============

// ============ Main Page ============

export default function AdminBulkActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();
  const { formatWithCurrency } = useCurrency();

  // Data
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tariffs, setTariffs] = useState<TariffListItem[]>([]);
  const [promoGroups, setPromoGroups] = useState<PromoGroup[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [partners, setPartners] = useState<AdminPartnerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>('');
  const [trialOnly, setTrialOnly] = useState(false);
  const [tariffFilter, setTariffFilter] = useState<number[]>([]);
  const [promoGroupFilter, setPromoGroupFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);

  // Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [subscriptionSelection, setSubscriptionSelection] = useState<Record<number, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Modal
  const [modal, setModal] = useState<ModalState>({
    open: false,
    action: null,
    loading: false,
    result: null,
    progress: null,
  });

  // Debounce timer ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ---- Multi-tariff detection ----
  const isMultiTariff = useMemo(
    () => users.some((u) => (u.subscriptions?.length ?? 0) > 1),
    [users],
  );

  // ---- Data loading ----

  // React Query owns network state; existing setters stay so downstream
  // selection / handler code does not need to change.
  const usersQuery = useQuery({
    queryKey: [
      'admin-bulk-users',
      offset,
      limit,
      committedSearch,
      statusFilter,
      tariffFilter.join(','),
      promoGroupFilter,
      campaignFilter,
      partnerFilter,
    ] as const,
    queryFn: () => {
      const params: Record<string, unknown> = { offset, limit };
      if (committedSearch) params.search = committedSearch;
      if (statusFilter) params.subscription_status = statusFilter;
      if (tariffFilter.length > 0) params.tariff_id = tariffFilter.join(',');
      if (promoGroupFilter) params.promo_group_id = Number(promoGroupFilter);
      if (campaignFilter) params.campaign_id = Number(campaignFilter);
      if (partnerFilter) params.partner_id = Number(partnerFilter);
      return adminUsersApi.getUsers(params as Parameters<typeof adminUsersApi.getUsers>[0]);
    },
  });

  useEffect(() => {
    if (!usersQuery.data) return;
    setUsers(usersQuery.data.users);
    setTotal(usersQuery.data.total);
    // Auto-expand all users who have subscriptions
    const autoExpand: Record<number, boolean> = {};
    for (const u of usersQuery.data.users) {
      if ((u.subscriptions?.length ?? 0) > 0) {
        autoExpand[u.id] = true;
      }
    }
    setExpandedRows(autoExpand);
  }, [usersQuery.data]);

  useEffect(() => {
    setLoading(usersQuery.isFetching);
  }, [usersQuery.isFetching]);

  const loadUsers = useCallback(
    async () => {
      await usersQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usersQuery.refetch],
  );

  // Static lookup tables — long staleTime since these change rarely.
  const tariffsLookupQuery = useQuery({
    queryKey: ['admin-bulk-tariffs-lookup'] as const,
    queryFn: () => tariffsApi.getTariffs(true),
    staleTime: 5 * 60 * 1000,
  });
  const promoGroupsLookupQuery = useQuery({
    queryKey: ['admin-bulk-promo-groups-lookup'] as const,
    queryFn: () => promocodesApi.getPromoGroups({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });
  const campaignsLookupQuery = useQuery({
    queryKey: ['admin-bulk-campaigns-lookup'] as const,
    queryFn: () => campaignsApi.getCampaigns(true, 0, 100),
    staleTime: 5 * 60 * 1000,
  });
  const partnersLookupQuery = useQuery({
    queryKey: ['admin-bulk-partners-lookup'] as const,
    queryFn: () => partnerApi.getPartners({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (tariffsLookupQuery.data) setTariffs(tariffsLookupQuery.data.tariffs);
  }, [tariffsLookupQuery.data]);
  useEffect(() => {
    if (promoGroupsLookupQuery.data) setPromoGroups(promoGroupsLookupQuery.data.items);
  }, [promoGroupsLookupQuery.data]);
  useEffect(() => {
    if (campaignsLookupQuery.data) setCampaigns(campaignsLookupQuery.data.campaigns);
  }, [campaignsLookupQuery.data]);
  useEffect(() => {
    if (partnersLookupQuery.data) setPartners(partnersLookupQuery.data.items);
  }, [partnersLookupQuery.data]);

  // ---- Handlers ----

  const clearAllSelections = useCallback(() => {
    setRowSelection({});
    setSubscriptionSelection({});
    setExpandedRows({});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setOffset(0);
      setCommittedSearch(value);
    }, 400);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => clearTimeout(searchTimerRef.current);
  }, []);

  const handleSearchSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    clearTimeout(searchTimerRef.current);
    setOffset(0);
    setCommittedSearch(searchInput);
  };

  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v as SubscriptionStatusFilter);
    setOffset(0);
  };

  const handleTariffFilterChange = (ids: number[]) => {
    setTariffFilter(ids);
    setOffset(0);
  };

  const handlePromoGroupFilterChange = (v: string) => {
    setPromoGroupFilter(v);
    setOffset(0);
  };

  const handleCampaignFilterChange = (v: string) => {
    setCampaignFilter(v);
    setOffset(0);
  };

  const handlePartnerFilterChange = (v: string) => {
    setPartnerFilter(v);
    setOffset(0);
  };

  const handleRefresh = () => {
    loadUsers();
  };

  const selectedUserIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map(Number)
      .filter((id) => id > 0);
  }, [rowSelection]);

  const selectedSubscriptionIds = useMemo(() => {
    return Object.keys(subscriptionSelection)
      .filter((k) => subscriptionSelection[Number(k)])
      .map(Number);
  }, [subscriptionSelection]);

  const toggleExpandRow = useCallback((userId: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

  const toggleSubscriptionSelection = useCallback((subscriptionId: number) => {
    setSubscriptionSelection((prev) => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId],
    }));
  }, []);

  const getFilteredSubs = useCallback(
    (subs: UserListItemSubscription[]): UserListItemSubscription[] => {
      let result = subs;
      if (tariffFilter.length > 0) {
        result = result.filter((s) => s.tariff_id !== null && tariffFilter.includes(s.tariff_id));
      }
      if (trialOnly) {
        result = result.filter((s) => s.is_trial);
      }
      return result;
    },
    [tariffFilter, trialOnly],
  );

  // Selection-related derivations live here so the columns useMemo (below)
  // can list them as deps without forward-reference warnings.
  // When multiple tariffs are selected, filter users client-side
  // (server only supports single tariff_id filter)
  const filteredUsers = useMemo(() => {
    let result = users;
    if (trialOnly) {
      result = result.filter(
        (u) => u.subscription_is_trial || (u.subscriptions ?? []).some((s) => s.status === 'trial'),
      );
    }
    return result;
  }, [users, trialOnly]);

  const allVisibleSubscriptionIds = useMemo(() => {
    const ids: number[] = [];
    for (const user of filteredUsers) {
      const subs = user.subscriptions ?? [];
      const filtered = getFilteredSubs(subs);
      for (const sub of filtered) {
        ids.push(sub.id);
      }
    }
    return ids;
  }, [filteredUsers, getFilteredSubs]);

  const toggleAllSubscriptions = useCallback(() => {
    const allSelected =
      allVisibleSubscriptionIds.length > 0 &&
      allVisibleSubscriptionIds.every((id) => subscriptionSelection[id]);

    if (allSelected) {
      const next: Record<number, boolean> = {};
      for (const key of Object.keys(subscriptionSelection)) {
        const id = Number(key);
        if (!allVisibleSubscriptionIds.includes(id)) {
          next[id] = subscriptionSelection[id];
        }
      }
      setSubscriptionSelection(next);
    } else {
      const next = { ...subscriptionSelection };
      for (const id of allVisibleSubscriptionIds) {
        next[id] = true;
      }
      setSubscriptionSelection(next);
    }

    // Auto-expand rows that have filtered subs
    const expanded: Record<number, boolean> = { ...expandedRows };
    for (const user of users) {
      const subs = user.subscriptions ?? [];
      const filtered = getFilteredSubs(subs);
      if (filtered.length > 1) {
        expanded[user.id] = true;
      }
    }
    setExpandedRows(expanded);
  }, [allVisibleSubscriptionIds, subscriptionSelection, expandedRows, users, getFilteredSubs]);

  const handleOpenAction = (type: BulkActionType) => {
    setModal({ open: true, action: type, loading: false, result: null, progress: null });
  };

  const handleExecuteAction = async (params: BulkActionParams) => {
    if (!modal.action) return;

    const isSubAction = isMultiTariff && isSubscriptionLevelAction(modal.action);
    const targetIds = isSubAction ? selectedSubscriptionIds : selectedUserIds;
    if (targetIds.length === 0) return;

    const totalCount = targetIds.length;
    setModal((prev) => ({
      ...prev,
      loading: true,
      progress: {
        current: 0,
        total: totalCount,
        successCount: 0,
        errorCount: 0,
        log: [],
      },
    }));

    const requestPayload = isSubAction
      ? { action: modal.action, subscription_ids: targetIds, params }
      : { action: modal.action, user_ids: targetIds, params };

    try {
      await adminBulkActionsApi.executeWithStream(requestPayload, (event) => {
        if (event.type === 'progress') {
          setModal((prev) => ({
            ...prev,
            progress: prev.progress
              ? {
                  current: event.current,
                  total: event.total,
                  successCount: prev.progress.successCount + (event.success ? 1 : 0),
                  errorCount: prev.progress.errorCount + (event.success ? 0 : 1),
                  log: [...prev.progress.log, event],
                }
              : prev.progress,
          }));
        } else if (event.type === 'complete') {
          setModal((prev) => {
            // Build errors from accumulated progress log
            const errors = (prev.progress?.log ?? [])
              .filter((e) => !e.success)
              .map((e) => ({
                user_id: e.user_id,
                username: e.username,
                error: e.message || e.error || '',
              }));
            return {
              ...prev,
              loading: false,
              progress: null,
              result: {
                success: event.error_count === 0,
                total: event.total,
                success_count: event.success_count,
                error_count: event.error_count,
                skipped_count: event.skipped_count || 0,
                errors,
              },
            };
          });
          loadUsers();
        }
      });

      // If stream ended without a complete event, finalize from progress
      setModal((prev) => {
        if (prev.loading && prev.progress) {
          return {
            ...prev,
            loading: false,
            result: {
              success: prev.progress.errorCount === 0,
              total: prev.progress.total,
              success_count: prev.progress.successCount,
              error_count: prev.progress.errorCount,
              skipped_count: 0,
              errors: prev.progress.log
                .filter((e) => !e.success)
                .map((e) => ({
                  user_id: e.user_id,
                  username: e.username,
                  error: e.error || '',
                })),
            },
            progress: null,
          };
        }
        return prev;
      });

      loadUsers();
    } catch {
      setModal((prev) => ({
        ...prev,
        loading: false,
        progress: null,
        result: {
          success: false,
          total: totalCount,
          success_count: prev.progress?.successCount ?? 0,
          error_count: totalCount - (prev.progress?.successCount ?? 0),
          skipped_count: 0,
          errors: [],
        },
      }));
    }
  };

  const handleCloseModal = () => {
    if (modal.loading) return;
    if (modal.result) {
      clearAllSelections();
    }
    setModal({ open: false, action: null, loading: false, result: null, progress: null });
  };

  // ---- TanStack Table ----

  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        id: 'select',
        size: 56,
        header: ({ table }) => {
          const allSubsSelected =
            allVisibleSubscriptionIds.length > 0 &&
            allVisibleSubscriptionIds.every((id) => subscriptionSelection[id]);
          const someSubsSelected =
            !allSubsSelected && allVisibleSubscriptionIds.some((id) => subscriptionSelection[id]);
          return (
            <div className="flex items-center justify-center gap-1.5">
              {/* Select all users */}
              <button
                onClick={table.getToggleAllRowsSelectedHandler()}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                  table.getIsAllRowsSelected()
                    ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                    : table.getIsSomeRowsSelected()
                      ? 'border-accent-500 bg-accent-500/30'
                      : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
                )}
                aria-label={t('admin.bulkActions.selectAll')}
                title={t('admin.bulkActions.selectAll')}
              >
                {table.getIsAllRowsSelected() && <CheckIcon />}
                {table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected() && (
                  <div className="h-0.5 w-2 rounded-full bg-white" />
                )}
              </button>
              {/* Select all subscriptions */}
              {isMultiTariff && allVisibleSubscriptionIds.length > 0 && (
                <button
                  onClick={toggleAllSubscriptions}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                    allSubsSelected
                      ? 'border-success-500 bg-success-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      : someSubsSelected
                        ? 'border-success-500 bg-success-500/30'
                        : 'border-dark-500 bg-dark-700/60 hover:border-success-500/50 hover:bg-dark-600/60',
                  )}
                  aria-label={t('admin.bulkActions.selectAllSubs')}
                  title={t('admin.bulkActions.selectAllSubs')}
                >
                  {allSubsSelected && <CheckIcon />}
                  {someSubsSelected && <div className="h-0.5 w-2 rounded-full bg-white" />}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const userName =
            row.original.full_name || row.original.username || String(row.original.telegram_id);
          return (
            <div className="flex items-center justify-center">
              <button
                onClick={row.getToggleSelectedHandler()}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                  row.getIsSelected()
                    ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                    : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
                )}
                aria-label={
                  row.getIsSelected()
                    ? t('admin.bulkActions.deselectUser', { name: userName })
                    : t('admin.bulkActions.selectUser', { name: userName })
                }
              >
                {row.getIsSelected() && <CheckIcon />}
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'user',
        accessorFn: (row) => row.full_name,
        header: t('admin.bulkActions.columns.user'),
        size: 200,
        cell: ({ row }) => {
          const user = row.original;
          const filteredSubs = getFilteredSubs(user.subscriptions ?? []);
          const subCount = filteredSubs.length;
          const canExpand = isMultiTariff && subCount > 0;
          const isExpanded = expandedRows[user.id] ?? false;
          return (
            <div className="flex items-center gap-2.5">
              {canExpand ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpandRow(user.id);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 transition-transform"
                  aria-label={
                    isExpanded
                      ? t('admin.bulkActions.collapseSubscriptions')
                      : t('admin.bulkActions.expandSubscriptions')
                  }
                  aria-expanded={isExpanded}
                >
                  <ChevronExpandIcon expanded={isExpanded} />
                </button>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[10px] font-medium text-white">
                  {user.first_name?.[0] || user.username?.[0] || '?'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-dark-100">
                    {user.full_name}
                  </span>
                  {canExpand && (
                    <span className="shrink-0 rounded-md bg-dark-700/60 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-dark-400">
                      {subCount}
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] leading-tight text-dark-500">
                  {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'subscription_status',
        accessorFn: (row) => row.subscription_status,
        header: t('admin.bulkActions.columns.status'),
        size: 100,
        cell: ({ row }) => {
          const user = row.original;
          if (!user.has_subscription) {
            return <span className="text-xs text-dark-500">-</span>;
          }
          return <StatusBadge status={user.subscription_status} />;
        },
      },
      {
        id: 'tariff',
        accessorFn: (row) => row.tariff_name,
        header: t('admin.bulkActions.columns.tariff'),
        size: 160,
        cell: ({ row }) => {
          const user = row.original;
          const subs = user.subscriptions ?? [];
          const tariffNames = subs
            .map((s) => s.tariff_name)
            .filter((name): name is string => !!name);
          const uniqueNames = [...new Set(tariffNames)];

          if (uniqueNames.length === 0) {
            if (!user.tariff_name) {
              return <span className="text-xs text-dark-500">—</span>;
            }
            return <span className="text-xs text-dark-200">{user.tariff_name}</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {uniqueNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex rounded-md border border-dark-600/40 bg-dark-700/40 px-1.5 py-0.5 text-[10px] font-medium text-dark-200"
                >
                  {name}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'balance',
        accessorKey: 'balance_rubles',
        header: t('admin.bulkActions.columns.balance'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-dark-200">
            {formatWithCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'promo_group',
        accessorFn: (row) => row.promo_group_name,
        header: t('admin.bulkActions.columns.promoGroup'),
        size: 120,
        cell: ({ getValue }) => {
          const name = getValue() as string | null;
          return name ? (
            <span className="inline-flex rounded-lg border border-accent-500/20 bg-accent-500/5 px-2 py-0.5 text-[10px] font-medium text-accent-400">
              {name}
            </span>
          ) : (
            <span className="text-xs text-dark-500">-</span>
          );
        },
      },
      {
        id: 'total_spent',
        accessorKey: 'total_spent_kopeks',
        header: t('admin.bulkActions.columns.spent'),
        size: 100,
        cell: ({ getValue }) => {
          const kopeks = getValue() as number;
          return (
            <span className="text-xs text-dark-300">
              {kopeks > 0 ? formatWithCurrency(kopeks / 100) : '-'}
            </span>
          );
        },
      },
    ],
    [
      t,
      formatWithCurrency,
      expandedRows,
      toggleExpandRow,
      getFilteredSubs,
      allVisibleSubscriptionIds,
      isMultiTariff,
      subscriptionSelection,
      toggleAllSubscriptions,
    ],
  );

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
  });

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // ---- Status filter options ----
  const statusOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allStatuses') },
    { value: 'active', label: t('admin.bulkActions.statuses.active') },
    { value: 'expired', label: t('admin.bulkActions.statuses.expired') },
    { value: 'limited', label: t('admin.bulkActions.statuses.limited') },
    { value: 'disabled', label: t('admin.bulkActions.statuses.disabled') },
  ];

  const tariffMultiOptions: MultiSelectOption[] = tariffs.map((tt) => ({
    value: tt.id,
    label: tt.name,
  }));

  const promoGroupOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allGroups') },
    ...promoGroups.map((pg) => ({ value: String(pg.id), label: pg.name })),
  ];

  const campaignOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allCampaigns') },
    ...campaigns.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const partnerOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allPartners') },
    ...partners.map((p) => ({
      value: String(p.user_id),
      label: p.username ? `@${p.username}` : p.first_name || String(p.telegram_id),
    })),
  ];

  return (
    <div className="relative animate-fade-in">
      <ProgressBar loading={loading} />

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
              aria-label={t('common.back')}
            >
              <BackIcon />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-dark-100">{t('admin.bulkActions.title')}</h1>
              <span className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-0.5 text-xs font-medium tabular-nums text-dark-400">
                {total.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-dark-400">{t('admin.bulkActions.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
          aria-label={t('common.refresh')}
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('admin.bulkActions.filters.search')}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2.5 pl-10 pr-4 text-sm text-dark-100 outline-none transition-colors placeholder:text-dark-500 focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
              <SearchIcon />
            </div>
          </div>
        </form>

        {/* Filter dropdowns + trial toggle */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DropdownSelect
            value={statusFilter}
            options={statusOptions}
            onChange={handleStatusFilterChange}
          />
          <MultiSelectDropdown
            options={tariffMultiOptions}
            selected={tariffFilter}
            onChange={handleTariffFilterChange}
            placeholder={t('admin.bulkActions.filters.allTariffs')}
          />
          <DropdownSelect
            value={promoGroupFilter}
            options={promoGroupOptions}
            onChange={handlePromoGroupFilterChange}
          />
        </div>

        {/* Campaign & Partner filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DropdownSelect
            value={campaignFilter}
            options={campaignOptions}
            onChange={handleCampaignFilterChange}
          />
          <DropdownSelect
            value={partnerFilter}
            options={partnerOptions}
            onChange={handlePartnerFilterChange}
          />
        </div>

        {/* Trial filter checkbox */}
        <label className="inline-flex cursor-pointer items-center gap-2">
          <button
            onClick={() => {
              setTrialOnly((prev) => !prev);
              setOffset(0);
            }}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
              trialOnly
                ? 'border-warning-500 bg-warning-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'border-dark-500 bg-dark-700/60 hover:border-warning-500/50 hover:bg-dark-600/60',
            )}
            aria-pressed={trialOnly}
          >
            {trialOnly && <CheckIcon />}
          </button>
          <span
            className={cn('text-sm', trialOnly ? 'font-medium text-warning-400' : 'text-dark-400')}
          >
            {t('admin.bulkActions.filters.trialOnly')}
          </span>
        </label>
      </div>

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-700/50 bg-dark-800/40 text-dark-500">
            <SearchIcon />
          </div>
          <p className="text-sm font-medium text-dark-300">{t('admin.bulkActions.noResults')}</p>
        </div>
      ) : (
        <div
          className={cn(
            'transition-opacity duration-200',
            loading && users.length > 0 && 'opacity-60',
          )}
        >
          <div className="overflow-x-auto rounded-xl border border-dark-700">
            <table className="w-full text-left text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-dark-700 bg-dark-800/80">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-dark-400"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const user = row.original;
                  const filteredSubs = getFilteredSubs(user.subscriptions ?? []);
                  const canExpand = isMultiTariff && filteredSubs.length > 0;
                  const isExpanded = expandedRows[user.id] ?? false;

                  return (
                    <React.Fragment key={row.id}>
                      {/* User row */}
                      <tr
                        className={cn(
                          'border-b transition-colors',
                          canExpand && isExpanded ? 'border-dark-700/30' : 'border-dark-700/50',
                          row.getIsSelected() ? 'bg-accent-500/5' : 'hover:bg-dark-800/50',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-2.5"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>

                      {/* Subscription sub-rows (only when expanded and multi-sub) */}
                      {canExpand &&
                        isExpanded &&
                        filteredSubs.map((sub) => (
                          <SubscriptionSubRow
                            key={`sub-${sub.id}`}
                            subscription={sub}
                            isSelected={subscriptionSelection[sub.id] ?? false}
                            onToggleSelect={() => toggleSubscriptionSelection(sub.id)}
                            isMultiTariff={isMultiTariff}
                          />
                        ))}

                      {/* Single subscription — auto-select with user (no separate sub-row) */}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination + per-page selector */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-400">
            {offset + 1}&ndash;{Math.min(offset + limit, total)} / {total}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dark-500">{t('admin.bulkActions.perPage')}</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1.5 text-xs text-dark-200 outline-none transition-colors focus:border-accent-500/40"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOffset(Math.max(0, offset - limit));
              }}
              disabled={offset === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
              aria-label={t('common.back')}
            >
              <ChevronLeftIcon />
            </button>
            <span className="px-3 py-2 text-sm text-dark-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                setOffset(offset + limit);
              }}
              disabled={offset + limit >= total}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
              aria-label={t('common.next')}
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Bottom spacer to prevent floating bar from covering pagination */}
      {(selectedUserIds.length > 0 || selectedSubscriptionIds.length > 0) && (
        <div className="h-24" />
      )}

      {/* Floating action bar — portal to body for correct fixed positioning */}
      {createPortal(
        <FloatingActionBar
          selectedUserCount={selectedUserIds.length}
          selectedSubscriptionCount={selectedSubscriptionIds.length}
          isMultiTariff={isMultiTariff}
          totalVisibleSubscriptionCount={allVisibleSubscriptionIds.length}
          onAction={handleOpenAction}
          onToggleAllSubscriptions={toggleAllSubscriptions}
        />,
        document.body,
      )}

      {/* Action modal */}
      <ActionModal
        modal={modal}
        selectedCount={
          modal.action && isMultiTariff && isSubscriptionLevelAction(modal.action)
            ? selectedSubscriptionIds.length
            : selectedUserIds.length
        }
        tariffs={tariffs}
        promoGroups={promoGroups}
        users={users}
        selectedSubscriptionIds={selectedSubscriptionIds}
        onClose={handleCloseModal}
        onExecute={handleExecuteAction}
      />
    </div>
  );
}
