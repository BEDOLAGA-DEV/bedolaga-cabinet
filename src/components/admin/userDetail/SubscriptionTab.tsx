import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type {
  PanelSyncStatusResponse,
  SubscriptionRequestRecord,
  UserAvailableTariff,
  UserNodeUsageItem,
  UserPanelInfo,
  UserSubscriptionInfo,
} from '@/api/adminUsers';
import { UserStatusChip } from '@/components/admin/users';
import { BackIcon, ChevronRightIcon } from '@/components/icons';
import { formatShortDate } from '@/utils/format';
import { CreateSubscriptionForm } from './CreateSubscriptionForm';
import { DangerZone } from './DangerZone';
import { type DeviceRow, DevicesCard } from './DevicesCard';
import { NodeUsageCard } from './NodeUsageCard';
import { PanelSyncCard } from './PanelSyncCard';
import { SubscriptionCard, type SubscriptionPanel } from './SubscriptionCard';
import { SupportDetails } from './SupportDetails';

// ──────────────────────────────────────────────────────────────────
// Вкладка «Подписка»: сверху то, что делают каждый день (продлить, сменить
// тариф, трафик, устройства), ниже — ноды, панель, техданные, и в самом
// конце опасная зона. Мультитариф: список подписок → карточка выбранной.
// ──────────────────────────────────────────────────────────────────

const PANELS: readonly SubscriptionPanel[] = ['extend', 'shorten', 'tariff', 'traffic', 'devices'];

export interface SubscriptionTabProps {
  accountStatus: string;
  userSubscriptions: UserSubscriptionInfo[];
  selectedSub: UserSubscriptionInfo | null;
  activeSubscriptionId: number | null;
  onActiveSubscriptionChange: (id: number) => void;
  subscriptionDetailView: boolean;
  onSubscriptionDetailViewChange: (open: boolean) => void;
  tariffs: UserAvailableTariff[];
  currentTariff: UserAvailableTariff | null;
  panelInfo: UserPanelInfo | null;
  copyToClipboard: (text: string) => void | Promise<void>;
  formatBytes: (bytes: number) => string;
  nodeUsageDays: number;
  onNodeUsageDaysChange: (days: number) => void;
  nodeUsageForPeriod: (UserNodeUsageItem & { total_bytes: number })[];
  devices: DeviceRow[];
  devicesLoading: boolean;
  devicesTotal: number;
  deviceLimit: number;
  editingDeviceHwid: string | null;
  editingDeviceName: string;
  onEditingDeviceHwidChange: (hwid: string | null) => void;
  onEditingDeviceNameChange: (name: string) => void;
  renameSaving: boolean;
  requestHistory: SubscriptionRequestRecord[];
  requestHistoryLoading: boolean;
  requestHistoryTotal: number;
  requestHistoryOffset: number;
  requestHistorySubId: number | null;
  requestHistoryExpanded: boolean;
  onRequestHistoryExpandedChange: (open: boolean) => void;
  onRequestHistorySubIdChange: (id: number | null) => void;
  actionLoading: boolean;
  onUpdateSubscription: (
    action: string,
    extra?: { days?: number; tariffId?: number | null },
  ) => Promise<void>;
  onSetDeviceLimit: (limit: number) => Promise<void>;
  onAddTraffic: (gb: number) => Promise<void>;
  onRemoveTraffic: (purchaseId: number) => Promise<void>;
  onResetDevices: () => Promise<void>;
  onCancelSbpRecurring: () => Promise<void>;
  onDeleteSubscription: () => Promise<void>;
  onDeleteDevice: (hwid: string) => Promise<void>;
  onRenameDevice: (hwid: string) => Promise<void>;
  onLoadDevices: () => Promise<void>;
  onLoadSubscriptionData: () => Promise<void>;
  onLoadRequestHistory: (offset: number, append?: boolean) => Promise<void>;
  syncStatus: PanelSyncStatusResponse | null;
  syncLoading: boolean;
  canSync: boolean;
  remnawaveId: number | null;
  onReloadSyncStatus: () => void;
  onSyncFromPanel: () => Promise<void>;
  onSyncToPanel: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  formatDate: (date: string | null) => string;
  locale: string;
  reachabilityLink?: string | null;
}

export function SubscriptionTab(props: SubscriptionTabProps) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [openPanel, setOpenPanel] = useState<SubscriptionPanel | null>(null);
  const {
    accountStatus,
    userSubscriptions,
    selectedSub,
    onActiveSubscriptionChange,
    subscriptionDetailView,
    onSubscriptionDetailViewChange,
    tariffs,
    currentTariff,
    panelInfo,
    devicesTotal,
    actionLoading,
    onUpdateSubscription,
    hasPermission,
    formatDate,
  } = props;

  const canManage = hasPermission('users:subscription');
  const multi = userSubscriptions.length > 1;
  const showDetail = (subscriptionDetailView || !multi) && selectedSub !== null;
  const showList = multi && !subscriptionDetailView;
  const showCreate = canManage && (showList || userSubscriptions.length === 0);
  const purchasedIds = new Set(
    userSubscriptions
      .filter((sub) => sub.is_active || sub.status === 'trial' || sub.status === 'limited')
      .map((sub) => sub.tariff_id)
      .filter((id): id is number => id !== null),
  );

  // Кнопки «Обзора» и шапки приходят сюда с `?do=extend|tariff|…`: открываем
  // нужную форму, подкручиваем к ней и убираем параметр из адреса.
  useEffect(() => {
    const wanted = params.get('do');
    if (!wanted) return;
    if ((PANELS as readonly string[]).includes(wanted)) {
      setOpenPanel(wanted as SubscriptionPanel);
    }
    const target = `subscription-${wanted === 'devices' ? 'extend' : wanted}`;
    requestAnimationFrame(() => {
      const node =
        document.getElementById(target) ?? document.getElementById('subscription-extend');
      node?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    });
    const next = new URLSearchParams(params);
    next.delete('do');
    setParams(next, { replace: true });
  }, [params, setParams]);

  return (
    <div className="space-y-4">
      {showList && (
        <div className="space-y-2">
          {userSubscriptions.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                onActiveSubscriptionChange(sub.id);
                onSubscriptionDetailViewChange(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-dark-700/60 bg-dark-900/40 p-4 text-left transition-colors hover:bg-dark-800/60"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-dark-100">
                    {sub.tariff_name || `#${sub.id}`}
                  </span>
                  <UserStatusChip
                    user={{
                      status: accountStatus,
                      has_subscription: true,
                      subscription_status: sub.status,
                      subscription_is_trial: sub.is_trial,
                      days_remaining: sub.days_remaining,
                      subscription_end_date: sub.end_date,
                    }}
                  />
                  {sub.sbp_recurring_status && (
                    <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-medium text-accent-400">
                      {t('admin.users.detail.subscription.sbpShort')}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-dark-400">
                  <span>
                    {sub.traffic_used_gb.toFixed(1)} / {sub.traffic_limit_gb} {t('common.units.gb')}
                  </span>
                  <span>{t('admin.users.until', { date: formatShortDate(sub.end_date) })}</span>
                  <span>
                    {t('admin.users.detail.facts.devices')}: {sub.device_limit}
                  </span>
                </div>
              </div>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-dark-500" />
            </button>
          ))}
        </div>
      )}

      {showDetail && selectedSub && (
        <>
          {multi && (
            <button
              type="button"
              onClick={() => onSubscriptionDetailViewChange(false)}
              className="btn-ghost -ml-2"
            >
              <BackIcon className="h-4 w-4" />
              {t('admin.users.detail.subscription.backToList')}
            </button>
          )}

          <SubscriptionCard
            sub={selectedSub}
            accountStatus={accountStatus}
            multi={multi}
            tariffs={tariffs}
            currentTariff={currentTariff}
            panelInfo={panelInfo}
            devicesTotal={devicesTotal}
            canManage={canManage}
            disabled={actionLoading}
            openPanel={openPanel}
            onOpenPanel={setOpenPanel}
            onExtend={(days) => onUpdateSubscription('extend', { days })}
            onShorten={(days) => onUpdateSubscription('shorten', { days })}
            onChangeTariff={(tariffId) => onUpdateSubscription('change_tariff', { tariffId })}
            onActivate={() => onUpdateSubscription('activate')}
            onAddTraffic={props.onAddTraffic}
            onRemoveTraffic={props.onRemoveTraffic}
            onSetDeviceLimit={props.onSetDeviceLimit}
            onCancelSbp={props.onCancelSbpRecurring}
            formatDate={formatDate}
          />

          <DevicesCard
            devices={props.devices}
            loading={props.devicesLoading}
            total={devicesTotal}
            limit={props.deviceLimit}
            disabled={actionLoading}
            editingHwid={props.editingDeviceHwid}
            editingName={props.editingDeviceName}
            renameSaving={props.renameSaving}
            locale={props.locale}
            onEditingHwidChange={props.onEditingDeviceHwidChange}
            onEditingNameChange={props.onEditingDeviceNameChange}
            onRename={props.onRenameDevice}
            onDelete={props.onDeleteDevice}
            onResetAll={props.onResetDevices}
            onRefresh={() => props.onLoadDevices()}
          />

          {panelInfo?.found && (
            <NodeUsageCard
              days={props.nodeUsageDays}
              onDaysChange={props.onNodeUsageDaysChange}
              items={props.nodeUsageForPeriod}
              onRefresh={() => props.onLoadSubscriptionData()}
              formatBytes={props.formatBytes}
            />
          )}

          {props.canSync && (
            <PanelSyncCard
              status={props.syncStatus}
              loading={props.syncLoading}
              remnawaveId={props.remnawaveId}
              disabled={actionLoading}
              locale={props.locale}
              onRefresh={props.onReloadSyncStatus}
              onPull={props.onSyncFromPanel}
              onPush={props.onSyncToPanel}
            />
          )}

          <SupportDetails
            panelInfo={panelInfo}
            copyToClipboard={props.copyToClipboard}
            reachabilityLink={props.reachabilityLink}
            userSubscriptions={userSubscriptions}
            requestHistory={props.requestHistory}
            requestHistoryLoading={props.requestHistoryLoading}
            requestHistoryTotal={props.requestHistoryTotal}
            requestHistoryOffset={props.requestHistoryOffset}
            requestHistorySubId={props.requestHistorySubId}
            requestHistoryExpanded={props.requestHistoryExpanded}
            onRequestHistoryExpandedChange={props.onRequestHistoryExpandedChange}
            onRequestHistorySubIdChange={props.onRequestHistorySubIdChange}
            onLoadRequestHistory={props.onLoadRequestHistory}
            formatDate={formatDate}
          />

          {canManage && (
            <DangerZone
              disabled={actionLoading}
              canCancel={selectedSub.is_active}
              onCancel={() => onUpdateSubscription('cancel')}
              onDelete={props.onDeleteSubscription}
            />
          )}
        </>
      )}

      {showCreate && (
        <CreateSubscriptionForm
          tariffs={tariffs}
          excludeTariffIds={purchasedIds}
          disabled={actionLoading}
          noActive={userSubscriptions.length === 0}
          onCreate={(tariffId, days) => onUpdateSubscription('create', { tariffId, days })}
        />
      )}
    </div>
  );
}
