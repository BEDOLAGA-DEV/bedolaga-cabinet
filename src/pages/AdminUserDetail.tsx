import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import i18n from '../i18n';
import { useNotify } from '../platform/hooks/useNotify';
import { copyToClipboard as copyText } from '../utils/clipboard';
import {
  adminUsersApi,
  type UserDetailResponse,
  type UserAvailableTariff,
  type UserPanelInfo,
  type UserNodeUsageResponse,
  type PanelSyncStatusResponse,
  type UpdateRestrictionsRequest,
  type UpdateSubscriptionRequest,
  type SubscriptionRequestRecord,
} from '../api/adminUsers';
import { adminApi } from '../api/admin';
import { promocodesApi } from '../api/promocodes';
import { AdminBackButton } from '../components/admin';
import {
  ActivityHub,
  ACTIVITY_VIEWS,
  type ActivityView,
} from '../components/admin/userDetail/ActivityHub';
import { BalanceTab } from '../components/admin/userDetail/BalanceTab';
import { OverviewTab, type DetailTab } from '../components/admin/userDetail/OverviewTab';
import { ReferralsTab } from '../components/admin/userDetail/ReferralsTab';
import { SendMessageDialog } from '../components/admin/userDetail/SendMessageDialog';
import { SubscriptionTab } from '../components/admin/userDetail/SubscriptionTab';
import { UserActionsMenu } from '../components/admin/userDetail/UserActionsMenu';
import { UserFacts } from '../components/admin/userDetail/UserFacts';
import { UserHeader } from '../components/admin/userDetail/UserHeader';
import { buildReachabilityLink } from '../components/admin/reachability/deepLink';
import { useReachabilityAvailable } from '../components/admin/reachability/useReachabilityStatus';
import { getApiErrorMessage } from '../utils/api-error';
import { usePermissionStore } from '../store/permissions';
import { TelegramSmallIcon } from '@/components/icons';
import { PageSkeleton, Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────────
// Карточка пользователя. Страница держит запросы и обработчики мутаций,
// вкладки — «фасады» над ними (components/admin/userDetail/*). Вкладка и
// подвид «Активности» живут в адресе (`?tab=&view=`), чтобы обновление
// страницы и ссылка коллеге открывали то же место.
// ──────────────────────────────────────────────────────────────────

const TABS: readonly DetailTab[] = ['overview', 'subscription', 'balance', 'referrals', 'activity'];
const RECENT_EVENTS = 5;

function pickTab(value: string | null): DetailTab {
  return value && (TABS as readonly string[]).includes(value) ? (value as DetailTab) : 'overview';
}

function pickView(value: string | null): ActivityView {
  return value && (ACTIVITY_VIEWS as readonly string[]).includes(value)
    ? (value as ActivityView)
    : 'timeline';
}

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();
  const hasPermission = usePermissionStore((s) => s.hasPermission);
  const [params, setParams] = useSearchParams();

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';

  const activeTab = pickTab(params.get('tab'));
  const activityView = pickView(params.get('view'));

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [syncStatus, setSyncStatus] = useState<PanelSyncStatusResponse | null>(null);
  const [tariffs, setTariffs] = useState<UserAvailableTariff[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);

  // Panel info & node usage
  const [panelInfo, setPanelInfo] = useState<UserPanelInfo | null>(null);
  const [nodeUsage, setNodeUsage] = useState<UserNodeUsageResponse | null>(null);
  const [nodeUsageDays, setNodeUsageDays] = useState(7);

  // Subscription selection (multi-tariff)
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<number | null>(null);
  const hasAutoSelectedSub = useRef(false);
  const [subscriptionDetailView, setSubscriptionDetailView] = useState(false);

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

  // Subscription request history
  const [requestHistory, setRequestHistory] = useState<SubscriptionRequestRecord[]>([]);
  const [requestHistoryLoading, setRequestHistoryLoading] = useState(false);
  const [requestHistoryOffset, setRequestHistoryOffset] = useState(0);
  const [requestHistoryTotal, setRequestHistoryTotal] = useState(0);
  const [requestHistoryExpanded, setRequestHistoryExpanded] = useState(false);
  const [requestHistorySubId, setRequestHistorySubId] = useState<number | null>(null);

  const userId = id ? parseInt(id, 10) : null;
  const validUserId = !!userId && !Number.isNaN(userId);
  // Ярлык «Проверить через операторов РФ» у подписки: право запуска + включённая интеграция.
  const reachabilityAvailable = useReachabilityAvailable();
  const reachabilityLink =
    hasPermission('reachability:run') && reachabilityAvailable && validUserId
      ? buildReachabilityLink({ mode: 'vless', userId })
      : null;

  const goTo = useCallback(
    (tab: DetailTab, view?: string) => {
      const next = new URLSearchParams(params);
      if (tab === 'overview') next.delete('tab');
      else next.set('tab', tab);
      if (tab === 'activity' && view) next.set('view', view);
      else next.delete('view');
      // Вкладка «Подписка» сама откроет нужную форму и подкрутит к ней.
      if (tab === 'subscription' && view) next.set('do', view);
      else next.delete('do');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const userQuery = useQuery({
    queryKey: ['admin-user-detail', userId] as const,
    queryFn: () => {
      if (!userId) throw new Error('No userId');
      return adminUsersApi.getUser(userId);
    },
    enabled: validUserId,
  });

  useEffect(() => {
    if (userQuery.data) setUser(userQuery.data);
  }, [userQuery.data]);

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
    // userQuery.refetch стабилен между рендерами; сам объект userQuery — нет.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userQuery.refetch],
  );

  // ---- Запросы вкладок: включаются по activeTab / activeSubscriptionId ----
  const syncStatusQuery = useQuery({
    queryKey: ['admin-user-sync-status', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getSyncStatus(userId as number, activeSubscriptionId ?? undefined),
    enabled: validUserId && activeTab === 'subscription' && hasPermission('users:sync'),
  });
  const tariffsQuery = useQuery({
    queryKey: ['admin-user-tariffs', userId] as const,
    queryFn: () => adminUsersApi.getAvailableTariffs(userId as number, true),
    enabled: validUserId && activeTab === 'subscription',
  });
  const panelInfoQuery = useQuery({
    queryKey: ['admin-user-panel-info', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getPanelInfo(userId as number, activeSubscriptionId ?? undefined),
    enabled: validUserId,
  });
  const nodeUsageQuery = useQuery({
    queryKey: ['admin-user-node-usage', userId, activeSubscriptionId] as const,
    queryFn: () => adminUsersApi.getNodeUsage(userId as number, activeSubscriptionId ?? undefined),
    enabled: validUserId && activeTab === 'subscription',
  });
  // Устройства нужны и фактам под шапкой, и «Обзору» — грузим всегда.
  const devicesQuery = useQuery({
    queryKey: ['admin-user-devices', userId, activeSubscriptionId] as const,
    queryFn: () =>
      adminUsersApi.getUserDevices(userId as number, activeSubscriptionId ?? undefined),
    enabled: validUserId,
  });
  const promoGroupsQuery = useQuery({
    queryKey: ['admin-promo-groups-all'] as const,
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
    enabled: activeTab === 'overview' && hasPermission('users:promo_group'),
  });
  const recentActivityQuery = useQuery({
    queryKey: ['admin-user-recent-activity', userId] as const,
    queryFn: () => adminUsersApi.getUserActivity(userId as number, 0, RECENT_EVENTS),
    enabled: validUserId && activeTab === 'overview',
  });
  const ticketsCountQuery = useQuery({
    queryKey: ['admin-user-tickets-count', userId] as const,
    queryFn: () => adminApi.getTickets({ user_id: userId as number, per_page: 1 }),
    enabled: validUserId && activeTab === 'overview',
  });
  const giftsCountQuery = useQuery({
    queryKey: ['admin-user-gifts', userId] as const,
    queryFn: () => adminUsersApi.getUserGifts(userId as number),
    enabled: validUserId && activeTab === 'overview',
  });

  useEffect(() => {
    if (syncStatusQuery.data) setSyncStatus(syncStatusQuery.data);
  }, [syncStatusQuery.data]);
  useEffect(() => {
    if (tariffsQuery.data) setTariffs(tariffsQuery.data.tariffs);
  }, [tariffsQuery.data]);
  useEffect(() => {
    if (panelInfoQuery.data) setPanelInfo(panelInfoQuery.data);
  }, [panelInfoQuery.data]);
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

  const loadSyncStatus = useCallback(
    async () => {
      await syncStatusQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [syncStatusQuery.refetch],
  );
  const loadPanelInfo = useCallback(
    async () => {
      await panelInfoQuery.refetch();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelInfoQuery.refetch],
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

  useEffect(() => {
    if (!validUserId) navigate('/admin/users');
  }, [validUserId, navigate]);

  // Reload request history when the request-history subscription selector changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: перезагрузка только при смене выбранной подписки
  useEffect(() => {
    if (!requestHistoryExpanded || requestHistorySubId === null) return;
    setRequestHistory([]);
    setRequestHistoryOffset(0);
    setRequestHistoryTotal(0);
    loadRequestHistory(0);
  }, [requestHistorySubId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Обработчики мутаций --------------------------------------------------

  const handleUpdateSubscription = async (
    action: string,
    extra: { days?: number; tariffId?: number | null } = {},
  ) => {
    if (!userId) return;
    const days = extra.days ?? 30;
    if ((action === 'extend' || action === 'shorten') && days <= 0) {
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
        ...(action === 'extend' || action === 'shorten' ? { days } : {}),
        ...(action === 'change_tariff' && extra.tariffId ? { tariff_id: extra.tariffId } : {}),
        ...(action === 'create'
          ? { days, ...(extra.tariffId ? { tariff_id: extra.tariffId } : {}) }
          : {}),
      };
      await adminUsersApi.updateSubscription(userId, data);
      await loadUser();
    } catch (err) {
      notify.error(getApiErrorMessage(err, t('admin.users.userActions.error')), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!userId) return;
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
        { update_subscription: true, update_traffic: true },
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
      await loadDevices();
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

  const currentTariff = tariffs.find((item) => item.id === selectedSub?.tariff_id) || null;

  const handleChangePromoGroup = async (groupId: number | null) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updatePromoGroup(userId, groupId);
      await loadUser();
    } catch (err) {
      notify.error(getApiErrorMessage(err, t('admin.users.userActions.error')), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRestrictions = async (data: UpdateRestrictionsRequest) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.updateRestrictions(userId, data);
      notify.success(t('admin.users.detail.restrictionsSaved'), t('common.success'));
      await loadUser();
    } catch (err) {
      notify.error(getApiErrorMessage(err, t('admin.users.userActions.error')), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

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

  const handleCancelSbpRecurring = async () => {
    if (!userId || !selectedSub?.sbp_recurring_id) return;
    setActionLoading(true);
    try {
      await adminUsersApi.cancelSbpRecurring(userId, selectedSub.id);
      notify.success(t('admin.users.detail.subscription.sbpCancelled'), t('common.success'));
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubscription = async () => {
    if (!userId || !selectedSub) return;
    setActionLoading(true);
    try {
      // Активную платную подписку сервер по умолчанию бережёт — админ уже
      // подтвердил намерение, поэтому просим удалить именно её.
      const force = Boolean(selectedSub.is_active) && !selectedSub.is_trial;
      await adminUsersApi.deleteSubscription(userId, selectedSub.id, force);
      notify.success(t('admin.users.detail.subscription.deleted'), t('common.success'));
      setSubscriptionDetailView(false);
      await loadUser();
    } catch (err) {
      // Отказы тут осмысленные (открытый grace, активная платная без force,
      // подписки нет) — показываем текст сервера, а не общее «Ошибка».
      notify.error(getApiErrorMessage(err, t('admin.users.userActions.error')), t('common.error'));
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
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await copyText(text);
      notify.success(t('admin.users.detail.copied'));
    } catch {
      notify.error(t('common.error'));
    }
  };

  if (!user && userQuery.isLoading) {
    return (
      <PageSkeleton
        variant="admin"
        leading={['h-10 w-10 rounded-xl', 'h-14 w-14 rounded-full']}
        titleWidth="w-56"
        className="space-y-6"
      >
        <Skeleton variant="card" count={2} className="h-40" />
      </PageSkeleton>
    );
  }

  if (!user) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/users" />
          <h1 className="text-xl font-bold text-dark-100">{t('admin.users.notFound')}</h1>
        </div>
        <button type="button" onClick={() => navigate('/admin/users')} className="btn-secondary">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const overviewDevices = devicesQuery.data
    ? {
        total: devicesTotal,
        limit: deviceLimit,
        names: devices.map((device) => device.local_name || device.device_model || device.platform),
      }
    : null;

  const headerActions = (
    <>
      {hasPermission('users:send_message') && (
        <button
          type="button"
          onClick={() => setSendMessageOpen(true)}
          disabled={actionLoading || !user.telegram_id}
          title={!user.telegram_id ? t('admin.users.sendMessage.noTelegram') : undefined}
          className="btn-secondary min-w-0 flex-1 px-3 sm:flex-none sm:px-4"
        >
          <TelegramSmallIcon className="hidden h-4 w-4 sm:block" />
          {t('admin.users.detail.header.write')}
        </button>
      )}
      {hasPermission('users:subscription') && (
        <button
          type="button"
          onClick={() => goTo('subscription', selectedSub ? 'extend' : 'create')}
          className="btn-primary min-w-0 flex-1 px-3 sm:flex-none sm:px-4"
        >
          {t('admin.users.detail.header.extend')}
        </button>
      )}
      {hasPermission('users:balance') && (
        <button
          type="button"
          onClick={() => goTo('balance')}
          className="btn-secondary min-w-0 flex-1 px-3 sm:flex-none sm:px-4"
        >
          {t('admin.users.detail.header.topUp')}
        </button>
      )}
      <UserActionsMenu
        user={user}
        disabled={actionLoading}
        reachabilityLink={reachabilityLink}
        can={{
          block: hasPermission('users:block'),
          subscription: hasPermission('users:subscription'),
          delete: hasPermission('users:delete'),
        }}
        onBlock={handleBlockUser}
        onUnblock={handleUnblockUser}
        onResetTrial={handleResetTrial}
        onResetSubscription={handleResetSubscription}
        onDisable={handleDisableUser}
        onDelete={handleFullDeleteUser}
      />
    </>
  );

  return (
    <div className="animate-fade-in space-y-5">
      <UserHeader
        user={user}
        subscription={selectedSub}
        panelInfo={panelInfo}
        refreshing={userQuery.isFetching}
        onRefresh={loadUser}
        actions={headerActions}
      />

      <UserFacts
        user={user}
        subscription={selectedSub}
        devicesTotal={devicesQuery.data ? devicesTotal : null}
      />

      <div
        role="tablist"
        aria-label={t('admin.users.title')}
        className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => goTo(tab)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 active:bg-dark-700',
            )}
          >
            {t(`admin.users.detail.tabs.${tab}`)}
            {tab === 'referrals' && user.referral.referrals_count > 0 && (
              <span className="ml-1.5 rounded-full bg-dark-700 px-1.5 text-[11px] text-dark-200">
                {user.referral.referrals_count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'overview' && (
          <OverviewTab
            user={user}
            subscription={selectedSub}
            panelInfo={panelInfo}
            devices={overviewDevices}
            promoGroups={promoGroupsQuery.data?.items ?? []}
            canEditPromoGroup={hasPermission('users:promo_group')}
            canEditRestrictions={hasPermission('users:edit')}
            canManageSubscription={hasPermission('users:subscription')}
            actionLoading={actionLoading}
            onChangePromoGroup={handleChangePromoGroup}
            onUpdateRestrictions={handleUpdateRestrictions}
            onGoTo={goTo}
            ticketsCount={ticketsCountQuery.data ? ticketsCountQuery.data.total : null}
            giftsCount={
              giftsCountQuery.data
                ? giftsCountQuery.data.sent_total + giftsCountQuery.data.received_total
                : null
            }
            recentActivity={recentActivityQuery.data?.items ?? null}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionTab
            accountStatus={user.status}
            userSubscriptions={userSubscriptions}
            selectedSub={selectedSub}
            activeSubscriptionId={activeSubscriptionId}
            onActiveSubscriptionChange={setActiveSubscriptionId}
            subscriptionDetailView={subscriptionDetailView}
            onSubscriptionDetailViewChange={setSubscriptionDetailView}
            tariffs={tariffs}
            currentTariff={currentTariff}
            panelInfo={panelInfo}
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
            onUpdateSubscription={handleUpdateSubscription}
            onSetDeviceLimit={handleSetDeviceLimit}
            onAddTraffic={handleAddTraffic}
            onRemoveTraffic={handleRemoveTraffic}
            onResetDevices={handleResetDevices}
            onCancelSbpRecurring={handleCancelSbpRecurring}
            onDeleteSubscription={handleDeleteSubscription}
            onDeleteDevice={handleDeleteDevice}
            onRenameDevice={handleRenameDevice}
            onLoadDevices={loadDevices}
            onLoadSubscriptionData={loadSubscriptionData}
            onLoadRequestHistory={loadRequestHistory}
            syncStatus={syncStatus}
            syncLoading={syncStatusQuery.isFetching}
            canSync={hasPermission('users:sync')}
            remnawaveId={user.remnawave_id}
            onReloadSyncStatus={() => loadSyncStatus()}
            onSyncFromPanel={handleSyncFromPanel}
            onSyncToPanel={handleSyncToPanel}
            hasPermission={hasPermission}
            formatDate={formatDate}
            locale={locale}
            reachabilityLink={reachabilityLink}
          />
        )}

        {activeTab === 'balance' && userId && (
          <BalanceTab
            user={user}
            userId={userId}
            hasPermission={hasPermission}
            onUserRefresh={loadUser}
            formatDate={formatDate}
          />
        )}

        {activeTab === 'referrals' && userId && (
          <ReferralsTab user={user} userId={userId} onUserRefresh={loadUser} />
        )}

        {activeTab === 'activity' && userId && (
          <ActivityHub
            userId={userId}
            view={activityView}
            onViewChange={(view) => goTo('activity', view)}
            formatDate={formatDate}
            locale={locale}
            onNavigateToUser={(targetId) => navigate(`/admin/users/${targetId}`)}
          />
        )}
      </div>

      {userId && (
        <SendMessageDialog
          userId={userId}
          open={sendMessageOpen}
          onClose={() => setSendMessageOpen(false)}
        />
      )}
    </div>
  );
}
