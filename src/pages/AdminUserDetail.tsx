import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useCurrency } from '../hooks/useCurrency';
import { useNotify } from '../platform/hooks/useNotify';
import {
  adminUsersApi,
  type UserDetailResponse,
  type UserAvailableTariff,
  type UserListItem,
  type UserPanelInfo,
  type UserNodeUsageResponse,
  type PanelSyncStatusResponse,
  type UpdateSubscriptionRequest,
} from '../api/adminUsers';
import { adminApi, type AdminTicket, type AdminTicketDetail } from '../api/admin';
import { promocodesApi, type PromoGroup } from '../api/promocodes';
import { promoOffersApi } from '../api/promoOffers';
import { ticketsApi } from '../api/tickets';
import { AdminBackButton } from '../components/admin';
import { CheckIcon, XIcon } from '../components/icons';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';

// ============ Helpers ============

const getCountryFlag = (code: string | null | undefined): string => {
  if (!code) return '';
  const codeMap: Record<string, string> = {
    RU: '\u{1F1F7}\u{1F1FA}',
    US: '\u{1F1FA}\u{1F1F8}',
    DE: '\u{1F1E9}\u{1F1EA}',
    NL: '\u{1F1F3}\u{1F1F1}',
    GB: '\u{1F1EC}\u{1F1E7}',
    UK: '\u{1F1EC}\u{1F1E7}',
    FR: '\u{1F1EB}\u{1F1F7}',
    FI: '\u{1F1EB}\u{1F1EE}',
    SE: '\u{1F1F8}\u{1F1EA}',
    NO: '\u{1F1F3}\u{1F1F4}',
    PL: '\u{1F1F5}\u{1F1F1}',
    TR: '\u{1F1F9}\u{1F1F7}',
    JP: '\u{1F1EF}\u{1F1F5}',
    SG: '\u{1F1F8}\u{1F1EC}',
    HK: '\u{1F1ED}\u{1F1F0}',
    KR: '\u{1F1F0}\u{1F1F7}',
    AU: '\u{1F1E6}\u{1F1FA}',
    CA: '\u{1F1E8}\u{1F1E6}',
    CH: '\u{1F1E8}\u{1F1ED}',
    AT: '\u{1F1E6}\u{1F1F9}',
    IT: '\u{1F1EE}\u{1F1F9}',
    ES: '\u{1F1EA}\u{1F1F8}',
    BR: '\u{1F1E7}\u{1F1F7}',
    IN: '\u{1F1EE}\u{1F1F3}',
    AE: '\u{1F1E6}\u{1F1EA}',
    IL: '\u{1F1EE}\u{1F1F1}',
    KZ: '\u{1F1F0}\u{1F1FF}',
    UA: '\u{1F1FA}\u{1F1E6}',
    CZ: '\u{1F1E8}\u{1F1FF}',
    RO: '\u{1F1F7}\u{1F1F4}',
    LV: '\u{1F1F1}\u{1F1FB}',
    LT: '\u{1F1F1}\u{1F1F9}',
    EE: '\u{1F1EA}\u{1F1EA}',
    BG: '\u{1F1E7}\u{1F1EC}',
    HU: '\u{1F1ED}\u{1F1FA}',
    MD: '\u{1F1F2}\u{1F1E9}',
  };
  return codeMap[code.toUpperCase()] || code;
};

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
  const notify = useNotify();
  const { id } = useParams<{ id: string }>();

  const localeMap: Record<string, string> = { ru: 'ru-RU', en: 'en-US', zh: 'zh-CN', fa: 'fa-IR' };
  const locale = localeMap[i18n.language] || 'ru-RU';

  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'info' | 'subscription' | 'balance' | 'sync' | 'tickets'
  >('info');
  const [syncStatus, setSyncStatus] = useState<PanelSyncStatusResponse | null>(null);
  const [tariffs, setTariffs] = useState<UserAvailableTariff[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Referrals
  const [referrals, setReferrals] = useState<UserListItem[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  // Panel info & node usage
  const [panelInfo, setPanelInfo] = useState<UserPanelInfo | null>(null);
  const [panelInfoLoading, setPanelInfoLoading] = useState(false);
  const [nodeUsage, setNodeUsage] = useState<UserNodeUsageResponse | null>(null);
  const [nodeUsageDays, setNodeUsageDays] = useState(7);

  // Inline confirm state
  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Balance form
  const [balanceAmount, setBalanceAmount] = useState<number | ''>('');
  const [balanceDescription, setBalanceDescription] = useState('');

  // Tickets
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketDetail | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Subscription form
  const [subAction, setSubAction] = useState<string>('extend');
  const [subDays, setSubDays] = useState<number | ''>(30);
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null);

  // Promo group
  const [promoGroups, setPromoGroups] = useState<PromoGroup[]>([]);
  const [editingPromoGroup, setEditingPromoGroup] = useState(false);

  // Referral commission
  const [editingReferralCommission, setEditingReferralCommission] = useState(false);
  const [referralCommissionValue, setReferralCommissionValue] = useState<number | ''>('');

  // Send promo offer
  const [offerDiscountPercent, setOfferDiscountPercent] = useState<number | ''>('');
  const [offerValidHours, setOfferValidHours] = useState<number | ''>(24);
  const [offerSending, setOfferSending] = useState(false);

  // Traffic packages
  const [selectedTrafficGb, setSelectedTrafficGb] = useState<string>('');

  // Devices
  const [devices, setDevices] = useState<
    { hwid: string; platform: string; device_model: string; created_at: string | null }[]
  >([]);
  const [devicesTotal, setDevicesTotal] = useState(0);
  const [deviceLimit, setDeviceLimit] = useState(0);
  const [devicesLoading, setDevicesLoading] = useState(false);

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

  const loadTickets = useCallback(async () => {
    if (!userId) return;
    try {
      setTicketsLoading(true);
      const data = await adminApi.getTickets({ user_id: userId, per_page: 50 });
      setTickets(data.items);
      setTicketsTotal(data.total);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setTicketsLoading(false);
    }
  }, [userId]);

  const loadTicketDetail = useCallback(async (ticketId: number) => {
    try {
      setTicketDetailLoading(true);
      const data = await adminApi.getTicket(ticketId);
      setSelectedTicket(data);
    } catch (error) {
      console.error('Failed to load ticket detail:', error);
    } finally {
      setTicketDetailLoading(false);
    }
  }, []);

  const loadReferrals = useCallback(async () => {
    if (!userId) return;
    try {
      setReferralsLoading(true);
      const data = await adminUsersApi.getReferrals(userId, 0, 50);
      setReferrals(data.users);
    } catch {
      // ignore
    } finally {
      setReferralsLoading(false);
    }
  }, [userId]);

  const loadPanelInfo = useCallback(async () => {
    if (!userId) return;
    try {
      setPanelInfoLoading(true);
      const data = await adminUsersApi.getPanelInfo(userId);
      setPanelInfo(data);
    } catch {
      // ignore
    } finally {
      setPanelInfoLoading(false);
    }
  }, [userId]);

  const loadNodeUsage = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await adminUsersApi.getNodeUsage(userId);
      setNodeUsage(data);
    } catch {
      // ignore
    }
  }, [userId]);

  const loadDevices = useCallback(async () => {
    if (!userId) return;
    try {
      setDevicesLoading(true);
      const data = await adminUsersApi.getUserDevices(userId);
      setDevices(data.devices);
      setDevicesTotal(data.total);
      setDeviceLimit(data.device_limit);
    } catch {
      // ignore
    } finally {
      setDevicesLoading(false);
    }
  }, [userId]);

  const loadSubscriptionData = useCallback(async () => {
    await Promise.all([loadPanelInfo(), loadNodeUsage(), loadDevices()]);
  }, [loadPanelInfo, loadNodeUsage, loadDevices]);

  const loadPromoGroups = useCallback(async () => {
    try {
      const data = await promocodesApi.getPromoGroups({ limit: 100 });
      setPromoGroups(data.items);
    } catch {
      // ignore
    }
  }, []);

  const handleTicketReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setReplySending(true);
    try {
      await adminApi.replyToTicket(selectedTicketId, replyText);
      setReplyText('');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setReplySending(false);
    }
  };

  const handleTicketStatusChange = async (newStatus: string) => {
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      await adminApi.updateTicketStatus(selectedTicketId, newStatus);
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId, loadTicketDetail]);

  useEffect(() => {
    if (selectedTicket && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (!userId || isNaN(userId)) {
      navigate('/admin/users');
      return;
    }
    loadUser();
  }, [userId, loadUser, navigate]);

  useEffect(() => {
    if (activeTab === 'info') {
      loadReferrals();
      loadPromoGroups();
    }
    if (activeTab === 'sync') loadSyncStatus();
    if (activeTab === 'subscription') {
      loadTariffs();
      loadSubscriptionData();
    }
    if (activeTab === 'tickets') loadTickets();
  }, [
    activeTab,
    loadSyncStatus,
    loadTariffs,
    loadTickets,
    loadReferrals,
    loadSubscriptionData,
    loadPromoGroups,
  ]);

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (balanceAmount === '' || !userId) return;
    setActionLoading(true);
    try {
      const amount = Math.abs(toNumber(balanceAmount) * 100);
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

  const handleUpdateSubscription = async (overrideAction?: string) => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const action = overrideAction || subAction;
      const data: UpdateSubscriptionRequest = {
        action: action as UpdateSubscriptionRequest['action'],
        ...(action === 'extend' ? { days: toNumber(subDays, 30) } : {}),
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
      await adminUsersApi.deleteUserDevice(userId, hwid);
      notify.success(t('admin.users.detail.devices.deleted'));
      await loadDevices();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDevices = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminUsersApi.resetUserDevices(userId);
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
      await adminUsersApi.updateSubscription(userId, { action: 'add_traffic', traffic_gb: gb });
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
      });
      notify.success(t('admin.users.detail.subscription.deviceLimitUpdated'));
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const currentTariff = tariffs.find((t) => t.id === user?.subscription?.tariff_id) || null;

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

  const handleDeactivateOffer = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await promocodesApi.deactivateDiscount(userId);
      notify.success(t('admin.users.detail.offerDeactivated'), t('common.success'));
      await loadUser();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (!userId || offerDiscountPercent === '' || offerValidHours === '') return;
    setOfferSending(true);
    try {
      await promoOffersApi.broadcastOffer({
        user_id: userId,
        notification_type: 'admin_personal',
        discount_percent: toNumber(offerDiscountPercent),
        valid_hours: toNumber(offerValidHours, 24),
        effect_type: 'percent_discount',
        send_notification: true,
      });
      notify.success(t('admin.users.detail.offerSent'), t('common.success'));
      setOfferDiscountPercent('');
      setOfferValidHours(24);
      await loadUser();
    } catch {
      notify.error(t('admin.users.detail.offerSendError'), t('common.error'));
    } finally {
      setOfferSending(false);
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
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify.success(t('admin.users.detail.copied'));
    } catch {
      // ignore
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
        {(['info', 'subscription', 'balance', 'sync', 'tickets'] as const).map((tab) => (
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
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-dark-100">{user.email || '-'}</div>
                  {user.email && (
                    <span
                      className={`flex shrink-0 items-center justify-center rounded-full p-1 ${
                        user.email_verified
                          ? 'bg-success-500/20'
                          : 'bg-error-500/20'
                      }`}
                    >
                      {user.email_verified ? (
                        <CheckIcon className="h-3 w-3 text-success-400" />
                      ) : (
                        <XIcon className="h-3 w-3 text-error-400" />
                      )}
                    </span>
                  )}
                </div>
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

            {/* Campaign */}
            {user.campaign_name && (
              <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3">
                <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.campaign')}</div>
                <div className="text-sm font-medium text-accent-400">{user.campaign_name}</div>
              </div>
            )}

            {/* Promo Group */}
            <div className="rounded-xl bg-dark-800/50 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-dark-500">{t('admin.users.detail.promoGroup')}</span>
                <button
                  onClick={() => setEditingPromoGroup(!editingPromoGroup)}
                  className="text-xs text-accent-400 transition-colors hover:text-accent-300"
                >
                  {editingPromoGroup
                    ? t('common.cancel')
                    : t('admin.users.detail.changePromoGroup')}
                </button>
              </div>
              {editingPromoGroup ? (
                <div className="mt-2 space-y-2">
                  <select
                    value={user.promo_group?.id ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChangePromoGroup(val ? parseInt(val, 10) : null);
                    }}
                    disabled={actionLoading}
                    className="input text-sm"
                  >
                    <option value="">{t('admin.users.detail.selectPromoGroup')}</option>
                    {promoGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  {user.promo_group && (
                    <button
                      onClick={() => handleChangePromoGroup(null)}
                      disabled={actionLoading}
                      className="w-full rounded-lg bg-dark-700 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-600"
                    >
                      {t('admin.users.detail.removePromoGroup')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-sm font-medium text-dark-100">
                  {user.promo_group?.name || (
                    <span className="text-dark-500">{t('admin.users.detail.noPromoGroup')}</span>
                  )}
                </div>
              )}
            </div>

            {/* Referral */}
            <div className="rounded-xl bg-dark-800/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">
                  {t('admin.users.detail.referral.title')}
                </span>
                <button
                  onClick={() => {
                    if (!editingReferralCommission) {
                      setReferralCommissionValue(user.referral.commission_percent ?? '');
                    }
                    setEditingReferralCommission(!editingReferralCommission);
                  }}
                  className="text-xs text-accent-400 transition-colors hover:text-accent-300"
                >
                  {editingReferralCommission ? t('common.cancel') : t('common.edit')}
                </button>
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
                  {editingReferralCommission ? (
                    <div className="space-y-1">
                      <input
                        type="number"
                        value={referralCommissionValue}
                        onChange={createNumberInputHandler(setReferralCommissionValue, 0)}
                        placeholder="0-100"
                        className="input w-full text-center text-sm"
                        min={0}
                        max={100}
                        disabled={actionLoading}
                      />
                      <button
                        onClick={handleUpdateReferralCommission}
                        disabled={actionLoading}
                        className="w-full rounded-lg bg-accent-500 px-2 py-1 text-xs text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                      >
                        {actionLoading ? t('common.loading') : t('common.save')}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-lg font-bold text-dark-100">
                        {user.referral.commission_percent != null
                          ? `${user.referral.commission_percent}%`
                          : t('admin.users.detail.referral.default')}
                      </div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.referral.commission')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Referrals list */}
            {user.referral.referrals_count > 0 && (
              <div className="rounded-xl bg-dark-800/50 p-3">
                <div className="mb-2 text-sm font-medium text-dark-200">
                  {t('admin.users.detail.referralsList')}
                </div>
                {referralsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  </div>
                ) : referrals.length === 0 ? (
                  <div className="py-2 text-center text-xs text-dark-500">
                    {t('admin.users.detail.noReferrals')}
                  </div>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {referrals.map((ref) => (
                      <button
                        key={ref.id}
                        onClick={() => navigate(`/admin/users/${ref.id}`)}
                        className="flex w-full items-center justify-between rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-dark-600 text-xs font-bold text-dark-300">
                            {ref.first_name?.[0] || ref.username?.[0] || '?'}
                          </div>
                          <div>
                            <div className="text-sm text-dark-100">{ref.full_name}</div>
                            <div className="text-xs text-dark-500">
                              {formatDate(ref.created_at)}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-dark-400">
                          {formatWithCurrency(ref.total_spent_kopeks / 100)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            {/* Actions */}
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 text-sm font-medium text-dark-200">
                {t('admin.users.detail.actions.title')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleInlineConfirm('resetTrial', handleResetTrial)}
                  disabled={actionLoading}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    confirmingAction === 'resetTrial'
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                  }`}
                >
                  {confirmingAction === 'resetTrial'
                    ? t('admin.users.detail.actions.areYouSure')
                    : t('admin.users.userActions.resetTrial')}
                </button>
                <button
                  onClick={() => handleInlineConfirm('resetSubscription', handleResetSubscription)}
                  disabled={actionLoading}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    confirmingAction === 'resetSubscription'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                  }`}
                >
                  {confirmingAction === 'resetSubscription'
                    ? t('admin.users.detail.actions.areYouSure')
                    : t('admin.users.userActions.resetSubscription')}
                </button>
                <button
                  onClick={() => handleInlineConfirm('disable', handleDisableUser)}
                  disabled={actionLoading}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    confirmingAction === 'disable'
                      ? 'bg-dark-500 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  {confirmingAction === 'disable'
                    ? t('admin.users.detail.actions.areYouSure')
                    : t('admin.users.userActions.disable')}
                </button>
                <button
                  onClick={() => handleInlineConfirm('fullDelete', handleFullDeleteUser)}
                  disabled={actionLoading}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
                    confirmingAction === 'fullDelete'
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25'
                  }`}
                >
                  {confirmingAction === 'fullDelete'
                    ? t('admin.users.detail.actions.areYouSure')
                    : t('admin.users.userActions.delete')}
                </button>
              </div>
            </div>
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetDeviceLimit(user.subscription!.device_limit - 1)}
                          disabled={actionLoading || user.subscription.device_limit <= 1}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-dark-700 text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-30"
                        >
                          <MinusIcon />
                        </button>
                        <span className="min-w-[2ch] text-center text-dark-100">
                          {user.subscription.device_limit}
                        </span>
                        <button
                          onClick={() => handleSetDeviceLimit(user.subscription!.device_limit + 1)}
                          disabled={
                            actionLoading ||
                            (currentTariff?.max_device_limit != null &&
                              user.subscription.device_limit >= currentTariff.max_device_limit)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-dark-700 text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-30"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traffic Packages */}
                {user.subscription.traffic_purchases &&
                  user.subscription.traffic_purchases.length > 0 && (
                    <div className="rounded-xl bg-dark-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-dark-200">
                          {t('admin.users.detail.subscription.trafficPackages')}
                          {user.subscription.purchased_traffic_gb > 0 && (
                            <span className="ml-2 text-xs text-dark-400">
                              ({user.subscription.purchased_traffic_gb} {t('common.units.gb')})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {user.subscription.traffic_purchases.map((tp) => (
                          <div
                            key={tp.id}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                              tp.is_expired ? 'bg-dark-700/30 opacity-60' : 'bg-dark-700/50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 text-sm text-dark-200">
                                <span className="font-medium">
                                  {tp.traffic_gb} {t('common.units.gb')}
                                </span>
                                {tp.is_expired ? (
                                  <span className="rounded-full bg-error-500/20 px-1.5 py-0.5 text-[10px] text-error-400">
                                    {t('admin.users.detail.subscription.expired')}
                                  </span>
                                ) : (
                                  <span className="text-xs text-dark-400">
                                    {tp.days_remaining}{' '}
                                    {t('admin.users.detail.subscription.daysLeft')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!tp.is_expired && (
                              <button
                                onClick={() =>
                                  handleInlineConfirm(`removeTraffic_${tp.id}`, () =>
                                    handleRemoveTraffic(tp.id),
                                  )
                                }
                                disabled={actionLoading}
                                className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs transition-all disabled:opacity-50 ${
                                  confirmingAction === `removeTraffic_${tp.id}`
                                    ? 'bg-error-500 text-white'
                                    : 'text-dark-500 hover:bg-error-500/15 hover:text-error-400'
                                }`}
                              >
                                {confirmingAction === `removeTraffic_${tp.id}` ? '?' : '\u00D7'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Add Traffic */}
                {currentTariff &&
                  currentTariff.traffic_topup_enabled &&
                  Object.keys(currentTariff.traffic_topup_packages).length > 0 && (
                    <div className="rounded-xl bg-dark-800/50 p-4">
                      <div className="mb-3 text-sm font-medium text-dark-200">
                        {t('admin.users.detail.subscription.addTraffic')}
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={selectedTrafficGb}
                          onChange={(e) => setSelectedTrafficGb(e.target.value)}
                          className="input flex-1"
                        >
                          <option value="">
                            {t('admin.users.detail.subscription.selectPackage')}
                          </option>
                          {Object.entries(currentTariff.traffic_topup_packages)
                            .sort(([a], [b]) => Number(a) - Number(b))
                            .map(([gb]) => (
                              <option key={gb} value={gb}>
                                {gb} {t('common.units.gb')}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() =>
                            selectedTrafficGb && handleAddTraffic(Number(selectedTrafficGb))
                          }
                          disabled={actionLoading || !selectedTrafficGb}
                          className="shrink-0 rounded-lg bg-accent-500 px-4 py-2 text-sm text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                        >
                          {t('admin.users.detail.subscription.addButton')}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-dark-500">
                        {t('admin.users.detail.subscription.addTrafficNote')}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="mb-3 font-medium text-dark-200">
                    {t('admin.users.detail.subscription.actions')}
                  </div>
                  <div className="space-y-3">
                    <select
                      value={subAction}
                      onChange={(e) => setSubAction(e.target.value)}
                      className="input"
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
                        onChange={createNumberInputHandler(setSubDays, 1)}
                        placeholder={t('admin.users.detail.subscription.days')}
                        className="input"
                        min={1}
                        max={3650}
                      />
                    )}

                    {subAction === 'change_tariff' && (
                      <select
                        value={selectedTariffId || ''}
                        onChange={(e) =>
                          setSelectedTariffId(e.target.value ? parseInt(e.target.value) : null)
                        }
                        className="input"
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
                      onClick={() => handleUpdateSubscription()}
                      disabled={actionLoading}
                      className="btn-primary w-full"
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
                    className="input"
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
                    onChange={createNumberInputHandler(setSubDays, 1)}
                    placeholder={t('admin.users.detail.subscription.days')}
                    className="input"
                    min={1}
                    max={3650}
                  />
                  <button
                    onClick={() => handleUpdateSubscription('create')}
                    disabled={actionLoading}
                    className="btn-primary w-full"
                  >
                    {actionLoading
                      ? t('admin.users.detail.subscription.creating')
                      : t('admin.users.detail.subscription.create')}
                  </button>
                </div>
              </div>
            )}

            {/* Panel Info */}
            {panelInfoLoading ? (
              <div className="flex justify-center rounded-xl bg-dark-800/50 py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            ) : panelInfo && !panelInfo.found ? (
              <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-center text-sm text-dark-400">
                {t('admin.users.detail.panelNotFound')}
              </div>
            ) : panelInfo && panelInfo.found ? (
              <>
                {/* Links */}
                {(panelInfo.subscription_url || panelInfo.happ_link) && (
                  <div className="rounded-xl bg-dark-800/50 p-4">
                    <div className="mb-3 text-sm font-medium text-dark-200">
                      {t('admin.users.detail.subscriptionUrl')} / {t('admin.users.detail.happLink')}
                    </div>
                    <div className="space-y-2">
                      {panelInfo.subscription_url && (
                        <button
                          onClick={() => copyToClipboard(panelInfo.subscription_url!)}
                          className="w-full rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                        >
                          <div className="mb-0.5 text-xs text-dark-500">
                            {t('admin.users.detail.subscriptionUrl')}
                          </div>
                          <div className="truncate font-mono text-xs text-dark-200">
                            {panelInfo.subscription_url}
                          </div>
                        </button>
                      )}
                      {panelInfo.happ_link && (
                        <button
                          onClick={() => copyToClipboard(panelInfo.happ_link!)}
                          className="w-full rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                        >
                          <div className="mb-0.5 text-xs text-dark-500">
                            {t('admin.users.detail.happLink')}
                          </div>
                          <div className="truncate font-mono text-xs text-dark-200">
                            {panelInfo.happ_link}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Config */}
                {(panelInfo.trojan_password || panelInfo.vless_uuid || panelInfo.ss_password) && (
                  <div className="rounded-xl bg-dark-800/50 p-4">
                    <div className="mb-3 text-sm font-medium text-dark-200">
                      {t('admin.users.detail.panelConfig')}
                    </div>
                    <div className="space-y-2">
                      {panelInfo.trojan_password && (
                        <button
                          onClick={() => copyToClipboard(panelInfo.trojan_password!)}
                          className="w-full rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                        >
                          <div className="mb-0.5 text-xs text-dark-500">
                            {t('admin.users.detail.trojanPassword')}
                          </div>
                          <div className="truncate font-mono text-xs text-dark-200">
                            {panelInfo.trojan_password}
                          </div>
                        </button>
                      )}
                      {panelInfo.vless_uuid && (
                        <button
                          onClick={() => copyToClipboard(panelInfo.vless_uuid!)}
                          className="w-full rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                        >
                          <div className="mb-0.5 text-xs text-dark-500">
                            {t('admin.users.detail.vlessUuid')}
                          </div>
                          <div className="truncate font-mono text-xs text-dark-200">
                            {panelInfo.vless_uuid}
                          </div>
                        </button>
                      )}
                      {panelInfo.ss_password && (
                        <button
                          onClick={() => copyToClipboard(panelInfo.ss_password!)}
                          className="w-full rounded-lg bg-dark-700/50 p-2 text-left transition-colors hover:bg-dark-700"
                        >
                          <div className="mb-0.5 text-xs text-dark-500">
                            {t('admin.users.detail.ssPassword')}
                          </div>
                          <div className="truncate font-mono text-xs text-dark-200">
                            {panelInfo.ss_password}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Connection info */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.firstConnected')}
                      </div>
                      <div className="text-sm text-dark-100">
                        {formatDate(panelInfo.first_connected_at)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-dark-500">
                        {t('admin.users.detail.lastOnline')}
                      </div>
                      <div className="text-sm text-dark-100">{formatDate(panelInfo.online_at)}</div>
                    </div>
                    {panelInfo.last_connected_node_name && (
                      <div className="col-span-2">
                        <div className="text-xs text-dark-500">
                          {t('admin.users.detail.lastNode')}
                        </div>
                        <div className="text-sm text-dark-100">
                          {panelInfo.last_connected_node_name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live traffic */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="mb-3 text-sm font-medium text-dark-200">
                    {t('admin.users.detail.liveTraffic')}
                  </div>
                  <div className="mb-2">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-dark-400">
                        {formatBytes(panelInfo.used_traffic_bytes)}
                      </span>
                      <span className="text-dark-500">
                        {panelInfo.traffic_limit_bytes > 0
                          ? formatBytes(panelInfo.traffic_limit_bytes)
                          : '∞'}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-dark-700">
                      <div
                        className="h-full rounded-full bg-accent-500 transition-all"
                        style={{
                          width:
                            panelInfo.traffic_limit_bytes > 0
                              ? `${Math.min(100, (panelInfo.used_traffic_bytes / panelInfo.traffic_limit_bytes) * 100)}%`
                              : '0%',
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('admin.users.detail.lifetime')}:{' '}
                    {formatBytes(panelInfo.lifetime_used_traffic_bytes)}
                  </div>
                </div>

                {/* Node usage */}
                <div className="rounded-xl bg-dark-800/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-dark-200">
                      {t('admin.users.detail.nodeUsage')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 3, 7, 14, 30].map((d) => (
                          <button
                            key={d}
                            onClick={() => setNodeUsageDays(d)}
                            className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                              nodeUsageDays === d
                                ? 'bg-accent-500/20 text-accent-400'
                                : 'text-dark-500 hover:text-dark-300'
                            }`}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => loadSubscriptionData()}
                        className="rounded-lg p-1 text-dark-500 transition-colors hover:text-dark-300"
                        title={t('common.refresh')}
                      >
                        <RefreshIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {nodeUsageForPeriod.length > 0 ? (
                    <div className="space-y-2">
                      {nodeUsageForPeriod.map((item) => {
                        const maxBytes = nodeUsageForPeriod[0].total_bytes;
                        const pct = maxBytes > 0 ? (item.total_bytes / maxBytes) * 100 : 0;
                        return (
                          <div key={item.node_uuid}>
                            <div className="mb-1 flex justify-between text-xs">
                              <span className="text-dark-300">
                                {item.country_code && (
                                  <span className="mr-1">{getCountryFlag(item.country_code)}</span>
                                )}
                                {item.node_name}
                              </span>
                              <span className="text-dark-400">{formatBytes(item.total_bytes)}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-dark-700">
                              <div
                                className="h-full rounded-full bg-accent-500/60"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-xs text-dark-500">-</div>
                  )}
                </div>
              </>
            ) : null}

            {/* Devices */}
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">
                  {t('admin.users.detail.devices.title')} ({devicesTotal}/{deviceLimit})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadDevices()}
                    className="rounded-lg p-1 text-dark-500 transition-colors hover:text-dark-300"
                    title={t('common.refresh')}
                  >
                    <RefreshIcon className="h-3.5 w-3.5" />
                  </button>
                  {devices.length > 0 && (
                    <button
                      onClick={() => handleInlineConfirm('resetDevices', handleResetDevices)}
                      disabled={actionLoading}
                      className={`rounded-lg px-2 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                        confirmingAction === 'resetDevices'
                          ? 'bg-error-500 text-white'
                          : 'bg-error-500/15 text-error-400 hover:bg-error-500/25'
                      }`}
                    >
                      {confirmingAction === 'resetDevices'
                        ? t('admin.users.detail.actions.areYouSure')
                        : t('admin.users.detail.devices.resetAll')}
                    </button>
                  )}
                </div>
              </div>
              {devicesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : devices.length > 0 ? (
                <div className="space-y-2">
                  {devices.map((device) => (
                    <div
                      key={device.hwid}
                      className="flex items-center justify-between rounded-lg bg-dark-700/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-dark-200">
                          {device.platform || device.device_model || device.hwid.slice(0, 12)}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-dark-500">
                          {device.device_model && device.platform && (
                            <span>{device.device_model}</span>
                          )}
                          <span className="font-mono">{device.hwid.slice(0, 8)}...</span>
                          {device.created_at && (
                            <span>{new Date(device.created_at).toLocaleDateString(locale)}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleInlineConfirm(`deleteDevice_${device.hwid}`, () =>
                            handleDeleteDevice(device.hwid),
                          )
                        }
                        disabled={actionLoading}
                        className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs transition-all disabled:opacity-50 ${
                          confirmingAction === `deleteDevice_${device.hwid}`
                            ? 'bg-error-500 text-white'
                            : 'text-dark-500 hover:bg-error-500/15 hover:text-error-400'
                        }`}
                      >
                        {confirmingAction === `deleteDevice_${device.hwid}` ? '?' : '\u00D7'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-dark-500">
                  {t('admin.users.detail.devices.none')}
                </div>
              )}
            </div>
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
                onChange={createNumberInputHandler(setBalanceAmount)}
                placeholder={t('admin.users.detail.balance.amountPlaceholder')}
                className="input"
              />
              <input
                type="text"
                value={balanceDescription}
                onChange={(e) => setBalanceDescription(e.target.value)}
                placeholder={t('admin.users.detail.balance.descriptionPlaceholder')}
                className="input"
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateBalance(true)}
                  disabled={actionLoading || balanceAmount === ''}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success-500 py-2 text-white transition-colors hover:bg-success-600 disabled:opacity-50"
                >
                  <PlusIcon /> {t('admin.users.detail.balance.add')}
                </button>
                <button
                  onClick={() => handleUpdateBalance(false)}
                  disabled={actionLoading || balanceAmount === ''}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-error-500 py-2 text-white transition-colors hover:bg-error-600 disabled:opacity-50"
                >
                  <MinusIcon /> {t('admin.users.detail.balance.subtract')}
                </button>
              </div>
            </div>

            {/* Active promo offer */}
            {user.promo_offer_discount_percent > 0 && (
              <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-accent-400">
                    {t('admin.users.detail.activePromoOffer')}
                  </span>
                  <button
                    onClick={() => handleInlineConfirm('deactivateOffer', handleDeactivateOffer)}
                    disabled={actionLoading}
                    className={`rounded-lg px-3 py-1 text-xs font-medium transition-all disabled:opacity-50 ${
                      confirmingAction === 'deactivateOffer'
                        ? 'bg-error-500 text-white'
                        : 'bg-error-500/15 text-error-400 hover:bg-error-500/25'
                    }`}
                  >
                    {confirmingAction === 'deactivateOffer'
                      ? t('admin.users.detail.actions.areYouSure')
                      : t('admin.users.detail.deactivateOffer')}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-dark-100">
                      {user.promo_offer_discount_percent}%
                    </div>
                    <div className="text-xs text-dark-500">{t('admin.users.detail.discount')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-100">
                      {user.promo_offer_discount_source || '-'}
                    </div>
                    <div className="text-xs text-dark-500">{t('admin.users.detail.source')}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-100">
                      {user.promo_offer_discount_expires_at
                        ? formatDate(user.promo_offer_discount_expires_at)
                        : '-'}
                    </div>
                    <div className="text-xs text-dark-500">{t('admin.users.detail.expiresAt')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Send promo offer */}
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 text-sm font-medium text-dark-200">
                {t('admin.users.detail.sendOffer')}
              </div>
              <div className="space-y-3">
                <input
                  type="number"
                  value={offerDiscountPercent}
                  onChange={createNumberInputHandler(setOfferDiscountPercent, 1)}
                  placeholder={t('admin.users.detail.discountPercent')}
                  className="input"
                  min={1}
                  max={100}
                />
                <input
                  type="number"
                  value={offerValidHours}
                  onChange={createNumberInputHandler(setOfferValidHours, 1)}
                  placeholder={t('admin.users.detail.validHours')}
                  className="input"
                  min={1}
                  max={8760}
                />
                <button
                  onClick={handleSendOffer}
                  disabled={offerSending || offerDiscountPercent === '' || offerValidHours === ''}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {offerSending ? t('common.loading') : t('admin.users.detail.sendOffer')}
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

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {selectedTicketId ? (
              /* Ticket Chat View */
              ticketDetailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : selectedTicket ? (
                <div className="space-y-4">
                  {/* Chat header */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedTicketId(null);
                        setSelectedTicket(null);
                      }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dark-800 transition-colors hover:bg-dark-700"
                    >
                      <svg
                        className="h-4 w-4 text-dark-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                      </svg>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-dark-100">
                        #{selectedTicket.id} {selectedTicket.title}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-dark-500">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 ${
                            {
                              open: 'border-blue-500/30 bg-blue-500/20 text-blue-400',
                              pending: 'border-warning-500/30 bg-warning-500/20 text-warning-400',
                              answered: 'border-success-500/30 bg-success-500/20 text-success-400',
                              closed: 'border-dark-500 bg-dark-600 text-dark-400',
                            }[selectedTicket.status] || 'border-dark-500 bg-dark-600 text-dark-400'
                          }`}
                        >
                          {selectedTicket.status}
                        </span>
                        <span>{formatDate(selectedTicket.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {(['open', 'pending', 'answered', 'closed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleTicketStatusChange(s)}
                        disabled={selectedTicket.status === s || actionLoading}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition-all ${
                          selectedTicket.status === s
                            ? 'border-accent-500/50 bg-accent-500/20 text-accent-400'
                            : 'border-dark-700/50 text-dark-400 hover:border-dark-600 hover:text-dark-200'
                        } disabled:opacity-50`}
                      >
                        {t(`admin.tickets.status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                      </button>
                    ))}
                  </div>

                  {/* Messages */}
                  <div className="scrollbar-hide max-h-[60vh] space-y-3 overflow-y-auto rounded-xl bg-dark-800/30 p-3">
                    {selectedTicket.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-xl p-3 ${
                          msg.is_from_admin
                            ? 'ml-6 border border-accent-500/20 bg-accent-500/10'
                            : 'mr-6 border border-dark-700/30 bg-dark-800/50'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={`text-xs font-medium ${msg.is_from_admin ? 'text-accent-400' : 'text-dark-400'}`}
                          >
                            {msg.is_from_admin
                              ? t('admin.tickets.adminLabel')
                              : t('admin.tickets.userLabel')}
                          </span>
                          <span className="text-xs text-dark-500">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-dark-200">
                          {msg.message_text}
                        </p>
                        {msg.has_media && msg.media_file_id && (
                          <div className="mt-2">
                            {msg.media_type === 'photo' ? (
                              <img
                                src={ticketsApi.getMediaUrl(msg.media_file_id)}
                                alt={msg.media_caption || ''}
                                className="max-h-48 max-w-full rounded-lg"
                              />
                            ) : (
                              <a
                                href={ticketsApi.getMediaUrl(msg.media_file_id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-dark-700 px-2 py-1 text-xs text-dark-200 hover:bg-dark-600"
                              >
                                {msg.media_caption || msg.media_type}
                              </a>
                            )}
                            {msg.media_caption && msg.media_type === 'photo' && (
                              <p className="mt-1 text-xs text-dark-400">{msg.media_caption}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply form */}
                  {selectedTicket.status !== 'closed' && (
                    <div className="flex gap-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t('admin.tickets.replyPlaceholder')}
                        rows={2}
                        className="input flex-1 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTicketReply();
                          }
                        }}
                      />
                      <button
                        onClick={handleTicketReply}
                        disabled={!replyText.trim() || replySending}
                        className="shrink-0 self-end rounded-lg bg-accent-500 px-4 py-2 text-sm text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                      >
                        {replySending ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : null
            ) : ticketsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-dark-800/50 py-12">
                <svg
                  className="mb-3 h-12 w-12 text-dark-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
                <p className="text-dark-400">{t('admin.users.detail.noTickets')}</p>
              </div>
            ) : (
              <>
                <div className="text-sm text-dark-400">
                  {ticketsTotal} {t('admin.users.detail.ticketsCount')}
                </div>
                <div className="space-y-2">
                  {tickets.map((ticket) => {
                    const statusStyles: Record<string, string> = {
                      open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                      pending: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
                      answered: 'bg-success-500/20 text-success-400 border-success-500/30',
                      closed: 'bg-dark-600 text-dark-400 border-dark-500',
                    };
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className="w-full rounded-xl bg-dark-800/50 p-4 text-left transition-colors hover:bg-dark-700/50"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-dark-100">
                            #{ticket.id} {ticket.title}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${statusStyles[ticket.status] || statusStyles.closed}`}
                          >
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-dark-500">
                          <span>{formatDate(ticket.created_at)}</span>
                          <span>
                            {ticket.messages_count} {t('admin.users.detail.messagesCount')}
                          </span>
                        </div>
                        {ticket.last_message && (
                          <div className="mt-2 truncate text-sm text-dark-400">
                            {ticket.last_message.is_from_admin ? '> ' : ''}
                            {ticket.last_message.message_text}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
