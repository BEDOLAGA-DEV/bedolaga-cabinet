import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import i18n from '../i18n';
import { useNotify } from '../platform/hooks/useNotify';
import { copyToClipboard as copyText } from '../utils/clipboard';
import {
  adminUsersApi,
  type UserDetailResponse,
  type UserAvailableTariff,
  type UserListItem,
  type UserPanelInfo,
  type UserNodeUsageResponse,
  type PanelSyncStatusResponse,
  type UpdateSubscriptionRequest,
  type AdminUserGiftsResponse,
  type SubscriptionRequestRecord,
} from '../api/adminUsers';
import { promocodesApi, type PromoGroup } from '../api/promocodes';
import { AdminBackButton } from '../components/admin';
import { GiftsTab } from '../components/admin/userDetail/GiftsTab';
import { SyncTab } from '../components/admin/userDetail/SyncTab';
import { ReferralsTab } from '../components/admin/userDetail/ReferralsTab';
import { BalanceTab } from '../components/admin/userDetail/BalanceTab';
import { TicketsTab } from '../components/admin/userDetail/TicketsTab';
import { InfoTab } from '../components/admin/userDetail/InfoTab';
import { SubscriptionTab } from '../components/admin/userDetail/SubscriptionTab';
import { toNumber } from '../utils/inputHelpers';
import { usePermissionStore } from '../store/permissions';

// (Subscription-tab helpers: getCountryFlag / PlusIcon / MinusIcon /
// StatusBadge / GiftStatusBadge / GiftCard moved to
// components/admin/userDetail/{SubscriptionTab,GiftsTab,InfoTab,SyncTab}.tsx)

// RefreshIcon stays here — the page header's reload button uses it.
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

// ============ Main Page ============

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const hasPermission = usePermissionStore((s) => s.hasPermission);

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'info' | 'subscription' | 'balance' | 'sync' | 'tickets' | 'gifts' | 'referrals'
  >('info');
  const [syncStatus, setSyncStatus] = useState<PanelSyncStatusResponse | null>(null);
  const [tariffs, setTariffs] = useState<UserAvailableTariff[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Referrals
  const [referrals, setReferrals] = useState<UserListItem[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // (Referrals-tab state, query, handlers, click-outside + debounced search
  // effects moved into components/admin/userDetail/ReferralsTab.tsx)

  // Panel info & node usage
  const [panelInfo, setPanelInfo] = useState<UserPanelInfo | null>(null);
  const [panelInfoLoading, setPanelInfoLoading] = useState(false);
  const [nodeUsage, setNodeUsage] = useState<UserNodeUsageResponse | null>(null);
  const [nodeUsageDays, setNodeUsageDays] = useState(7);

  // Inline confirm state
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (Balance form state moved into BalanceTab.tsx)

  // (Tickets-tab state + query + chat-view state moved into TicketsTab.tsx)

  // Subscription form
  const [subAction, setSubAction] = useState<string>('extend');
  const [subDays, setSubDays] = useState<number | ''>(30);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<number | null>(null);
  const hasAutoSelectedSub = useRef(false);
  const [subscriptionDetailView, setSubscriptionDetailView] = useState(false);

  // Promo group
  const [promoGroups, setPromoGroups] = useState<PromoGroup[]>([]);
  const [editingPromoGroup, setEditingPromoGroup] = useState(false);

  // Referral commission
  const [editingReferralCommission, setEditingReferralCommission] = useState(false);
  const [referralCommissionValue, setReferralCommissionValue] = useState<number | ''>('');

  // (Send-promo-offer form state moved into BalanceTab.tsx)

  // Traffic packages
  const [selectedTrafficGb, setSelectedTrafficGb] = useState<string>('');

  // Devices
  const [devices, setDevices] = useState<
    {
      hwid: string;
      platform: string;
      device_model: string;
      created_at: string | null;
      local_name?: string | null;
    }[]
  >([]);
  const [devicesTotal, setDevicesTotal] = useState(0);
  const [deviceLimit, setDeviceLimit] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [editingDeviceHwid, setEditingDeviceHwid] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  // Gifts
  const [giftsData, setGiftsData] = useState<AdminUserGiftsResponse | null>(null);
  const [giftsLoading, setGiftsLoading] = useState(false);

  // Subscription request history
  const [requestHistory, setRequestHistory] = useState<SubscriptionRequestRecord[]>([]);
  const [requestHistoryLoading, setRequestHistoryLoading] = useState(false);
  const [requestHistoryOffset, setRequestHistoryOffset] = useState(0);
  const [requestHistoryTotal, setRequestHistoryTotal] = useState(0);
  const [requestHistoryExpanded, setRequestHistoryExpanded] = useState(false);
  const [requestHistorySubId, setRequestHistorySubId] = useState<number | null>(null);

  const userId = id ? parseInt(id, 10) : null;

  // React Query owns the main user fetch: caching across navigations + auto-loading
  // state. loadUser is kept as a thin refetch wrapper so the 25+ mutation handlers
  // that call `await loadUser()` after writes need no changes.
  const userQuery = useQuery({
    queryKey: ['admin-user-detail', userId] as const,
    queryFn: () => {
      if (!userId) throw new Error('No userId');
      return adminUsersApi.getUser(userId);
    },
    enabled: !!userId && !isNaN(userId),
  });

  useEffect(() => {
    if (userQuery.data) setUser(userQuery.data);
  }, [userQuery.data]);

  useEffect(() => {
    setLoading(userQuery.isFetching);
  }, [userQuery.isFetching]);

  useEffect(() => {
    if (userQuery.isError) {
      console.error('Failed to load user:', userQuery.error);
      navigate('/admin/users');
    }
  }, [userQuery.isError, userQuery.error, navigate]);

  const loadUser = useCallback(
    async () => {
      await userQuery.refetch();
    },
    // userQuery.refetch is a stable function across renders; including the whole
    // userQuery object would re-create loadUser on every render and cascade into
    // useEffects that depend on it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userQuery.refetch],
  );

  // ---- React Query hooks for the rest of the leaf loaders -----------------
  // Each loader callback below becomes a thin refetch wrapper so existing call
  // sites (mutation handlers, useEffects) continue to work unchanged. queryKey
  // includes the inputs that drive the request (userId / activeSubscriptionId)
  // so changing them auto-invalidates.

  const syncStatusQuery = useQuery({
    queryKey: ['admin-user-sync-status', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getSyncStatus(userId as number, activeSubscriptionId ?? undefined),
    enabled: !!userId && !isNaN(userId) && activeTab === 'sync' && hasPermission('users:sync'),
  });
  const tariffsQuery = useQuery({
    queryKey: ['admin-user-tariffs', userId] as const,
    queryFn: () => adminUsersApi.getAvailableTariffs(userId as number, true),
    enabled: !!userId && !isNaN(userId) && activeTab === 'subscription',
  });
  // (ticketsQuery moved into TicketsTab.tsx)
  const referralsQuery = useQuery({
    queryKey: ['admin-user-referrals', userId] as const,
    queryFn: () => adminUsersApi.getReferrals(userId as number, 0, 50),
    enabled: !!userId && !isNaN(userId) && activeTab === 'info',
  });
  // (referralsListQuery moved into ReferralsTab.tsx — the tab owns it now)
  const panelInfoQuery = useQuery({
    queryKey: ['admin-user-panel-info', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getPanelInfo(userId as number, activeSubscriptionId ?? undefined),
    enabled: !!userId && !isNaN(userId),
  });
  const nodeUsageQuery = useQuery({
    queryKey: ['admin-user-node-usage', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getNodeUsage(userId as number, activeSubscriptionId ?? undefined),
    enabled: !!userId && !isNaN(userId) && activeTab === 'subscription',
  });
  const devicesQuery = useQuery({
    queryKey: ['admin-user-devices', userId, activeSubscriptionId] as const,
    queryFn: () =>
      adminUsersApi.getUserDevices(userId as number, activeSubscriptionId ?? undefined),
    enabled: !!userId && !isNaN(userId) && activeTab === 'subscription',
  });
  const giftsQuery = useQuery({
    queryKey: ['admin-user-gifts', userId] as const,
    queryFn: () => adminUsersApi.getUserGifts(userId as number),
    enabled: !!userId && !isNaN(userId) && activeTab === 'gifts',
  });
  const promoGroupsQuery = useQuery({
    queryKey: ['admin-promo-groups-all'] as const,
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
    enabled: activeTab === 'info' && hasPermission('users:promo_group'),
  });

  // --- Sync each query's data + isFetching into existing state vars --------
  useEffect(() => {
    if (syncStatusQuery.data) setSyncStatus(syncStatusQuery.data);
  }, [syncStatusQuery.data]);
  useEffect(() => {
    if (tariffsQuery.data) setTariffs(tariffsQuery.data.tariffs);
  }, [tariffsQuery.data]);
  // (ticketsQuery sync moved into TicketsTab.tsx)
  useEffect(() => {
    if (referralsQuery.data) setReferrals(referralsQuery.data.users || []);
    setReferralsLoading(referralsQuery.isFetching);
  }, [referralsQuery.data, referralsQuery.isFetching]);
  // (referralsListQuery sync moved into ReferralsTab.tsx)
  useEffect(() => {
    if (panelInfoQuery.data) setPanelInfo(panelInfoQuery.data);
    setPanelInfoLoading(panelInfoQuery.isFetching);
  }, [panelInfoQuery.data, panelInfoQuery.isFetching]);
  useEffect(() => {
    if (nodeUsageQuery.data) setNodeUsage(nodeUsageQuery.data);
  }, [nodeUsageQuery.data]);
  useEffect(() => {
    if (devicesQuery.data) {
      setDevices(devicesQuery.data.devices);
      setDevicesTotal(devicesQuery.data.total);
      setDeviceLimit(devicesQuery.data.device_limit);
    }
    setDevicesLoading(devicesQuery.isFetching);
  }, [devicesQuery.data, devicesQuery.isFetching]);
  useEffect(() => {
    if (giftsQuery.data) setGiftsData(giftsQuery.data);
    setGiftsLoading(giftsQuery.isFetching);
  }, [giftsQuery.data, giftsQuery.isFetching]);
  useEffect(() => {
    if (promoGroupsQuery.data) setPromoGroups(promoGroupsQuery.data.items);
  }, [promoGroupsQuery.data]);

  // --- Loader callbacks: thin refetch wrappers (signatures unchanged) ------

  const loadSyncStatus = useCallback(
    async () => {
      await syncStatusQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncStatusQuery.refetch],
  );

  // (loadTickets / loadTicketDetail moved into TicketsTab.tsx)

  // (loadReferralsList moved into ReferralsTab.tsx)

  const loadPanelInfo = useCallback(
    async () => {
      await panelInfoQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelInfoQuery.refetch],
  );

  const loadRequestHistory = useCallback(
    async (offset = 0, append = false) => {
      if (!userId) return;
      try {
        setRequestHistoryLoading(true);
        const data = await adminUsersApi.getSubscriptionRequestHistory(
          userId,
          requestHistorySubId ?? undefined,
          offset,
          20,
        );
        setRequestHistory((prev) => (append ? [...prev, ...data.records] : data.records));
        setRequestHistoryTotal(data.total);
        setRequestHistoryOffset(offset + data.records.length);
      } catch {
        // silent
      } finally {
        setRequestHistoryLoading(false);
      }
    },
    [userId, requestHistorySubId],
  );

  const loadNodeUsage = useCallback(
    async () => {
      await nodeUsageQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodeUsageQuery.refetch],
  );

  const loadDevices = useCallback(
    async () => {
      await devicesQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devicesQuery.refetch],
  );

  const loadSubscriptionData = useCallback(async () => {
    await Promise.all([loadPanelInfo(), loadNodeUsage(), loadDevices()]);
  }, [loadPanelInfo, loadNodeUsage, loadDevices]);

  // (handleTicketReply / handleTicketStatusChange + selected-ticket/scroll
  // useEffects moved into TicketsTab.tsx)

  useEffect(() => {
    if (!userId || isNaN(userId)) {
      navigate('/admin/users');
    }
    // user data is auto-loaded by userQuery (enabled when userId is valid)
  }, [userId, navigate]);

  // Reload request history when the request-history subscription selector changes
  useEffect(() => {
    if (!requestHistoryExpanded || requestHistorySubId === null) return;
    setRequestHistory([]);
    setRequestHistoryOffset(0);
    setRequestHistoryTotal(0);
    loadRequestHistory(0);
  }, [requestHistorySubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // All other per-tab data fetching is driven by useQuery `enabled` gating
  // wired to userId / activeSubscriptionId / activeTab — no manual triggers needed.

  // (handleUpdateBalance moved into BalanceTab.tsx)

  const handleUpdateSubscription = async (overrideAction?: string) => {
    if (!userId) return;
    const action = overrideAction || subAction;
    if ((action === 'extend' || action === 'shorten') && toNumber(subDays, 0) <= 0) {
      notify.error(t('admin.users.detail.subscription.invalidDays'));
      return;
    }
    setActionLoading(true);
    try {
      const data: UpdateSubscriptionRequest = {
        action: action as UpdateSubscriptionRequest['action'],
        ...(activeSubscriptionId && action !== 'create'
          ? { subscription_id: activeSubscriptionId }
          : {}),
        ...(action === 'extend' || action === 'shorten' ? { days: toNumber(subDays, 30) } : {}),
        ...(action === 'change_tariff' && selectedTariffId ? { tariff_id: selectedTariffId } : {}),
        ...(action === 'create'
          ? {
              days: toNumber(subDays, 30),
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
      await adminUsersApi.syncFromPanel(
        userId,
        {
          update_subscription: true,
          update_traffic: true,
        },
        activeSubscriptionId ?? undefined,
      );
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
      await adminUsersApi.syncToPanel(
        userId,
        { create_if_missing: true },
        activeSubscriptionId ?? undefined,
      );
      await loadUser();
      await loadSyncStatus();
    } catch (error) {
      console.error('Failed to sync to panel:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleInlineConfirm = (actionKey: string, executeFn: () => Promise<void>) => {
    if (confirmingAction === actionKey) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingAction(null);
      executeFn().catch(() => {});
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmingAction(actionKey);
      confirmTimerRef.current = setTimeout(() => setConfirmingAction(null), 3000);
    }
  };

  const handleDeleteDevice = async (hwid: string) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.deleteUserDevice(userId, hwid, activeSubscriptionId ?? undefined);
      notify.success(t('admin.users.detail.devices.deleted'));
      await loadDevices();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Admin renames a device on behalf of the user. Empty/whitespace input
  // clears the alias and falls back to the platform/model default.
  const handleRenameDevice = async (hwid: string) => {
    if (!userId) return;
    setRenameSaving(true);
    // Snapshot inputs BEFORE the await so a fast click on another device
    // mid-flight doesn't smuggle a different alias into this hwid's request.
    const snapshotName = editingDeviceName.trim();
    try {
      await adminUsersApi.renameUserDevice(userId, hwid, snapshotName || null);
      notify.success(t('admin.users.detail.devices.renamed', 'Имя устройства обновлено'));
      // Reset edit state only if user is still on the saved row.
      setEditingDeviceHwid((current) => (current === hwid ? null : current));
      await loadDevices();
    } catch (err) {
      const apiMessage = (err as { response?: { data?: { detail?: string } } })?.response?.data
        ?.detail;
      notify.error(apiMessage || t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setRenameSaving(false);
    }
  };

  const handleResetDevices = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.resetUserDevices(userId, activeSubscriptionId ?? undefined);
      notify.success(t('admin.users.detail.devices.allDeleted'));
      await loadDevices();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTraffic = async (gb: number) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updateSubscription(userId, {
        action: 'add_traffic',
        traffic_gb: gb,
        ...(activeSubscriptionId ? { subscription_id: activeSubscriptionId } : {}),
      });
      notify.success(t('admin.users.detail.subscription.trafficAdded'));
      setSelectedTrafficGb('');
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTraffic = async (purchaseId: number) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updateSubscription(userId, {
        action: 'remove_traffic',
        traffic_purchase_id: purchaseId,
        ...(activeSubscriptionId ? { subscription_id: activeSubscriptionId } : {}),
      });
      notify.success(t('admin.users.detail.subscription.trafficRemoved'));
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDeviceLimit = async (newLimit: number) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updateSubscription(userId, {
        action: 'set_device_limit',
        device_limit: newLimit,
        ...(activeSubscriptionId ? { subscription_id: activeSubscriptionId } : {}),
      });
      notify.success(t('admin.users.detail.subscription.deviceLimitUpdated'));
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  // Multi-subscription: pick active subscription or first from list
  const userSubscriptions = useMemo(() => user?.subscriptions ?? [], [user?.subscriptions]);
  const selectedSub =
    userSubscriptions.find((s) => s.id === activeSubscriptionId) ?? user?.subscription ?? null;

  // Auto-select first subscription when user loads (one-time init)
  useEffect(() => {
    if (user && userSubscriptions.length > 0 && !hasAutoSelectedSub.current) {
      const activeSub = userSubscriptions.find((s) => s.is_active) ?? userSubscriptions[0];
      setActiveSubscriptionId(activeSub.id);
      setRequestHistorySubId(activeSub.id);
      hasAutoSelectedSub.current = true;
    }
  }, [user, userSubscriptions]);

  const currentTariff = tariffs.find((t) => t.id === selectedSub?.tariff_id) || null;

  const handleChangePromoGroup = async (groupId: number | null) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updatePromoGroup(userId, groupId);
      await loadUser();
      setEditingPromoGroup(false);
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateReferralCommission = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const value = referralCommissionValue === '' ? null : toNumber(referralCommissionValue);
      if (value !== null && (value < 0 || value > 100)) {
        notify.error(t('admin.users.detail.referral.invalidPercent'), t('common.error'));
        return;
      }
      await adminUsersApi.updateReferralCommission(userId, value);
      await loadUser();
      setEditingReferralCommission(false);
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  // (handleDeactivateOffer / handleSendOffer moved into BalanceTab.tsx)

  // (Referrals-tab handlers + debounced search useEffects + click-outside
  // useEffects moved into components/admin/userDetail/ReferralsTab.tsx)

  const handleResetTrial = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const result = await adminUsersApi.resetTrial(userId);
      if (result.success) {
        notify.success(t('admin.users.userActions.success.resetTrial'), t('common.success'));
        await loadUser();
      } else {
        notify.error(result.message || t('admin.users.userActions.error'), t('common.error'));
      }
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSubscription = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const result = await adminUsersApi.resetSubscription(userId);
      if (result.success) {
        notify.success(t('admin.users.userActions.success.resetSubscription'), t('common.success'));
        await loadUser();
      } else {
        notify.error(result.message || t('admin.users.userActions.error'), t('common.error'));
      }
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableUser = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const result = await adminUsersApi.disableUser(userId);
      if (result.success) {
        notify.success(t('admin.users.userActions.success.disable'), t('common.success'));
        await loadUser();
      } else {
        notify.error(result.message || t('admin.users.userActions.error'), t('common.error'));
      }
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFullDeleteUser = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const result = await adminUsersApi.fullDeleteUser(userId);
      if (result.success) {
        notify.success(t('admin.users.userActions.success.delete'), t('common.success'));
        navigate('/admin/users');
      } else {
        notify.error(result.message || t('admin.users.userActions.error'), t('common.error'));
      }
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
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

  // Compute node usage for selected period from cached 30-day data
  const nodeUsageForPeriod = (() => {
    if (!nodeUsage || nodeUsage.items.length === 0) return [];
    return nodeUsage.items
      .map((item) => {
        const daily = item.daily_bytes || [];
        const sliced = daily.slice(-nodeUsageDays);
        const total = sliced.reduce((sum, v) => sum + v, 0);
        return { ...item, total_bytes: total };
      })
      .sort((a, b) => b.total_bytes - a.total_bytes);
  })();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await copyText(text);
      notify.success(t('admin.users.detail.copied'));
    } catch {
      // copy adapter already handles fallback + permission errors; surface
      // the failure to the user instead of swallowing it silently.
      notify.error(t('common.error'));
    }
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
        {(['info', 'subscription', 'balance', 'sync', 'tickets', 'gifts', 'referrals'] as const)
          .filter((tab) => tab !== 'sync' || hasPermission('users:sync'))
          .map((tab) => (
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
              {tab === 'tickets' && t('admin.users.detail.tabs.tickets')}
              {tab === 'gifts' && t('admin.users.detail.tabs.gifts')}
              {tab === 'referrals' && t('admin.users.detail.tabs.referrals')}
            </button>
          ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <InfoTab
            user={user}
            hasPermission={hasPermission}
            formatDate={formatDate}
            locale={locale}
            panelInfo={panelInfo}
            panelInfoLoading={panelInfoLoading}
            userSubscriptions={userSubscriptions}
            activeSubscriptionId={activeSubscriptionId}
            onActiveSubscriptionChange={setActiveSubscriptionId}
            promoGroups={promoGroups}
            editingPromoGroup={editingPromoGroup}
            onToggleEditingPromoGroup={() => setEditingPromoGroup(!editingPromoGroup)}
            onChangePromoGroup={handleChangePromoGroup}
            editingReferralCommission={editingReferralCommission}
            referralCommissionValue={referralCommissionValue}
            onSetReferralCommissionValue={setReferralCommissionValue}
            onToggleEditingReferralCommission={() => {
              if (!editingReferralCommission) {
                setReferralCommissionValue(user.referral.commission_percent ?? '');
              }
              setEditingReferralCommission(!editingReferralCommission);
            }}
            onUpdateReferralCommission={handleUpdateReferralCommission}
            referrals={referrals}
            referralsLoading={referralsLoading}
            actionLoading={actionLoading}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            confirmingAction={confirmingAction}
            onInlineConfirm={handleInlineConfirm}
            onResetTrial={handleResetTrial}
            onResetSubscription={handleResetSubscription}
            onDisableUser={handleDisableUser}
            onFullDeleteUser={handleFullDeleteUser}
          />
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <SubscriptionTab
            userSubscriptions={userSubscriptions}
            selectedSub={selectedSub}
            activeSubscriptionId={activeSubscriptionId}
            onActiveSubscriptionChange={setActiveSubscriptionId}
            subscriptionDetailView={subscriptionDetailView}
            onSubscriptionDetailViewChange={setSubscriptionDetailView}
            tariffs={tariffs}
            currentTariff={currentTariff}
            subAction={subAction}
            subDays={subDays}
            onSubActionChange={setSubAction}
            onSubDaysChange={setSubDays}
            selectedTariffId={selectedTariffId}
            onSelectedTariffIdChange={setSelectedTariffId}
            selectedTrafficGb={selectedTrafficGb}
            onSelectedTrafficGbChange={setSelectedTrafficGb}
            panelInfo={panelInfo}
            panelInfoLoading={panelInfoLoading}
            copyToClipboard={copyToClipboard}
            formatBytes={formatBytes}
            nodeUsageDays={nodeUsageDays}
            onNodeUsageDaysChange={setNodeUsageDays}
            nodeUsageForPeriod={nodeUsageForPeriod}
            devices={devices}
            devicesLoading={devicesLoading}
            devicesTotal={devicesTotal}
            deviceLimit={deviceLimit}
            editingDeviceHwid={editingDeviceHwid}
            editingDeviceName={editingDeviceName}
            onEditingDeviceHwidChange={setEditingDeviceHwid}
            onEditingDeviceNameChange={setEditingDeviceName}
            renameSaving={renameSaving}
            requestHistory={requestHistory}
            requestHistoryLoading={requestHistoryLoading}
            requestHistoryTotal={requestHistoryTotal}
            requestHistoryOffset={requestHistoryOffset}
            requestHistorySubId={requestHistorySubId}
            requestHistoryExpanded={requestHistoryExpanded}
            onRequestHistoryExpandedChange={setRequestHistoryExpanded}
            onRequestHistorySubIdChange={setRequestHistorySubId}
            actionLoading={actionLoading}
            confirmingAction={confirmingAction}
            onInlineConfirm={handleInlineConfirm}
            onUpdateSubscription={handleUpdateSubscription}
            onSetDeviceLimit={handleSetDeviceLimit}
            onAddTraffic={handleAddTraffic}
            onRemoveTraffic={handleRemoveTraffic}
            onResetDevices={handleResetDevices}
            onDeleteDevice={handleDeleteDevice}
            onRenameDevice={handleRenameDevice}
            onLoadDevices={loadDevices}
            onLoadSubscriptionData={loadSubscriptionData}
            onLoadRequestHistory={loadRequestHistory}
            hasPermission={hasPermission}
            formatDate={formatDate}
            locale={locale}
          />
        )}

        {/* Balance Tab */}
        {activeTab === 'balance' && userId && (
          <BalanceTab
            user={user}
            userId={userId}
            hasPermission={hasPermission}
            onUserRefresh={loadUser}
            formatDate={formatDate}
          />
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <SyncTab
            user={user}
            syncStatus={syncStatus}
            userSubscriptions={userSubscriptions}
            activeSubscriptionId={activeSubscriptionId}
            onActiveSubscriptionChange={setActiveSubscriptionId}
            actionLoading={actionLoading}
            onSyncFromPanel={handleSyncFromPanel}
            onSyncToPanel={handleSyncToPanel}
            locale={locale}
          />
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && userId && (
          <TicketsTab userId={userId} formatDate={formatDate} />
        )}

        {/* Gifts Tab */}
        {activeTab === 'gifts' && (
          <GiftsTab
            giftsLoading={giftsLoading}
            giftsData={giftsData}
            locale={locale}
            onNavigateToUser={(id) => navigate(`/admin/users/${id}`)}
          />
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && user && userId && (
          <ReferralsTab user={user} userId={userId} onUserRefresh={loadUser} />
        )}
      </div>
    </div>
  );
}
