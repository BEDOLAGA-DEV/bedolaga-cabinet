import { useTranslation } from 'react-i18next';
import { DEVICE_ALIAS_MAX_LENGTH } from '../../../constants/devices';
import { createNumberInputHandler } from '../../../utils/inputHelpers';
import { getFlagEmoji } from '../../../utils/subscriptionHelpers';
import type {
  UserAvailableTariff,
  UserPanelInfo,
  UserSubscriptionInfo,
  UserNodeUsageItem,
  SubscriptionRequestRecord,
} from '../../../api/adminUsers';

// ──────────────────────────────────────────────────────────────────
// Local helpers / icons. Each is small enough to live inline; the
// equivalents in the parent are kept because they're consumed by
// other code paths there.
// ──────────────────────────────────────────────────────────────────

const getCountryFlag = (code: string | null | undefined): string => getFlagEmoji(code);

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    active: 'bg-success-500/20 text-success-400 border-success-500/30',
    blocked: 'bg-error-500/20 text-error-400 border-error-500/30',
    expired: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    trial: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    limited: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    deleted: 'bg-dark-600 text-dark-400 border-dark-500',
  };
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status] || styles.deleted}`}
    >
      {t(`admin.users.status.${status}`, status)}
    </span>
  );
}

const PlusIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MinusIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
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

// Local device row type (matches the parent's inline type)
type DeviceRow = {
  hwid: string;
  platform: string;
  device_model: string;
  created_at: string | null;
  local_name?: string | null;
};

// ──────────────────────────────────────────────────────────────────
// Subscription tab — single-sub detail view OR multi-sub list +
// detail. Many of the inputs (panelInfo, devices, tariffs, etc.)
// live in the parent because they're shared with the Info tab; this
// is a view facade.
// ──────────────────────────────────────────────────────────────────

export interface SubscriptionTabProps {
  // Selection
  userSubscriptions: UserSubscriptionInfo[];
  selectedSub: UserSubscriptionInfo | null;
  activeSubscriptionId: number | null;
  onActiveSubscriptionChange: (id: number) => void;
  subscriptionDetailView: boolean;
  onSubscriptionDetailViewChange: (open: boolean) => void;

  // Tariffs / current tariff
  tariffs: UserAvailableTariff[];
  currentTariff: UserAvailableTariff | null;

  // Action form (extend/shorten/create/etc.)
  subAction: string;
  subDays: number | '';
  onSubActionChange: (s: string) => void;
  onSubDaysChange: (d: number | '') => void;
  selectedTariffId: number | null;
  onSelectedTariffIdChange: (id: number | null) => void;

  // Traffic add form
  selectedTrafficGb: string;
  onSelectedTrafficGbChange: (gb: string) => void;

  // Panel info
  panelInfo: UserPanelInfo | null;
  panelInfoLoading: boolean;
  copyToClipboard: (text: string) => void | Promise<void>;
  formatBytes: (bytes: number) => string;

  // Node usage
  nodeUsageDays: number;
  onNodeUsageDaysChange: (d: number) => void;
  nodeUsageForPeriod: (UserNodeUsageItem & { total_bytes: number })[];

  // Devices
  devices: DeviceRow[];
  devicesLoading: boolean;
  devicesTotal: number;
  deviceLimit: number;
  editingDeviceHwid: string | null;
  editingDeviceName: string;
  onEditingDeviceHwidChange: (hwid: string | null) => void;
  onEditingDeviceNameChange: (name: string) => void;
  renameSaving: boolean;

  // Request history
  requestHistory: SubscriptionRequestRecord[];
  requestHistoryLoading: boolean;
  requestHistoryTotal: number;
  requestHistoryOffset: number;
  requestHistorySubId: number | null;
  requestHistoryExpanded: boolean;
  onRequestHistoryExpandedChange: (open: boolean) => void;
  onRequestHistorySubIdChange: (id: number | null) => void;

  // Mutation handlers (all parent-owned)
  actionLoading: boolean;
  confirmingAction: string | null;
  onInlineConfirm: (key: string, fn: () => Promise<void>) => void;
  onUpdateSubscription: (overrideAction?: string) => Promise<void>;
  onSetDeviceLimit: (newLimit: number) => Promise<void>;
  onAddTraffic: (gb: number) => Promise<void>;
  onRemoveTraffic: (purchaseId: number) => Promise<void>;
  onResetDevices: () => Promise<void>;
  onDeleteDevice: (hwid: string) => Promise<void>;
  onRenameDevice: (hwid: string) => Promise<void>;
  onLoadDevices: () => Promise<void>;
  onLoadSubscriptionData: () => Promise<void>;
  onLoadRequestHistory: (offset: number, append?: boolean) => Promise<void>;

  // Misc
  hasPermission: (perm: string) => boolean;
  formatDate: (date: string | null) => string;
  locale: string;
}

export function SubscriptionTab(props: SubscriptionTabProps) {
  const { t } = useTranslation();
  const {
    userSubscriptions,
    selectedSub,
    activeSubscriptionId,
    onActiveSubscriptionChange,
    subscriptionDetailView,
    onSubscriptionDetailViewChange,
    tariffs,
    currentTariff,
    subAction,
    subDays,
    onSubActionChange,
    onSubDaysChange,
    selectedTariffId,
    onSelectedTariffIdChange,
    selectedTrafficGb,
    onSelectedTrafficGbChange,
    panelInfo,
    panelInfoLoading,
    copyToClipboard,
    formatBytes,
    nodeUsageDays,
    onNodeUsageDaysChange,
    nodeUsageForPeriod,
    devices,
    devicesLoading,
    devicesTotal,
    deviceLimit,
    editingDeviceHwid,
    editingDeviceName,
    onEditingDeviceHwidChange,
    onEditingDeviceNameChange,
    renameSaving,
    requestHistory,
    requestHistoryLoading,
    requestHistoryTotal,
    requestHistoryOffset,
    requestHistorySubId,
    requestHistoryExpanded,
    onRequestHistoryExpandedChange,
    onRequestHistorySubIdChange,
    actionLoading,
    confirmingAction,
    onInlineConfirm,
    onUpdateSubscription,
    onSetDeviceLimit,
    onAddTraffic,
    onRemoveTraffic,
    onResetDevices,
    onDeleteDevice,
    onRenameDevice,
    onLoadDevices,
    onLoadSubscriptionData,
    onLoadRequestHistory,
    hasPermission,
    formatDate,
    locale,
  } = props;
  // Suppress activeSubscriptionId-unused; the parent uses it for query keys.
  void activeSubscriptionId;

  return (
    <div className="space-y-4">
      {/* Multi-subscription: Level 1 — subscription list */}
      {userSubscriptions.length > 1 && !subscriptionDetailView && (
        <>
          <div className="space-y-3">
            {userSubscriptions.map((sub) => (
              <button
                key={sub.id}
                onClick={() => {
                  onActiveSubscriptionChange(sub.id);
                  onSubscriptionDetailViewChange(true);
                }}
                className="w-full rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 text-left transition-all hover:border-dark-600"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark-100">
                      {sub.tariff_name || `#${sub.id}`}
                    </span>
                    <StatusBadge status={sub.status} />
                  </div>
                  <svg
                    className="h-4 w-4 text-dark-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-dark-400">
                  <span>
                    {sub.traffic_used_gb.toFixed(1)} / {sub.traffic_limit_gb} {t('common.units.gb')}
                  </span>
                  <span>{formatDate(sub.end_date)}</span>
                  <span>
                    {sub.device_limit} {t('admin.users.detail.subscription.devices', 'устройств')}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Create new subscription — at list level */}
          {hasPermission('users:subscription') && (
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 text-sm font-medium text-dark-200">
                {t('admin.users.detail.subscription.createNew', 'Создать подписку')}
              </div>
              <div className="space-y-3">
                <select
                  value={selectedTariffId || ''}
                  onChange={(e) =>
                    onSelectedTariffIdChange(e.target.value ? parseInt(e.target.value) : null)
                  }
                  className="input"
                >
                  <option value="">{t('admin.users.detail.subscription.selectTariff')}</option>
                  {tariffs
                    .filter((tariffItem) => {
                      const purchasedIds = new Set(
                        userSubscriptions
                          .filter(
                            (s) => s.is_active || s.status === 'trial' || s.status === 'limited',
                          )
                          .map((s) => s.tariff_id),
                      );
                      return !purchasedIds.has(tariffItem.id);
                    })
                    .map((tariffItem) => (
                      <option key={tariffItem.id} value={tariffItem.id}>
                        {tariffItem.name}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  value={subDays}
                  onChange={createNumberInputHandler(onSubDaysChange, 1)}
                  placeholder={t('admin.users.detail.subscription.days')}
                  className="input"
                  min={1}
                  max={3650}
                />
                <button
                  onClick={() => onUpdateSubscription('create')}
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
        </>
      )}

      {/* Level 2 — subscription detail (or single subscription) */}
      {(subscriptionDetailView || userSubscriptions.length <= 1) && selectedSub ? (
        <>
          {/* Back to list (multi-subscription) */}
          {subscriptionDetailView && userSubscriptions.length > 1 && (
            <button
              onClick={() => onSubscriptionDetailViewChange(false)}
              className="flex items-center gap-1.5 text-sm text-dark-400 transition-colors hover:text-dark-200"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {t('admin.users.detail.subscription.backToList', 'Все подписки')}
            </button>
          )}

          {/* Current subscription */}
          <div className="rounded-xl bg-dark-800/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-medium text-dark-200">
                {t('admin.users.detail.subscription.current')}
                {userSubscriptions.length > 1 && (
                  <span className="ml-2 text-xs text-dark-500">#{selectedSub.id}</span>
                )}
              </span>
              <StatusBadge status={selectedSub.status} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-dark-500">
                  {t('admin.users.detail.subscription.tariff')}
                </div>
                <div className="text-dark-100">
                  {selectedSub.tariff_name || t('admin.users.detail.subscription.notSpecified')}
                </div>
              </div>
              <div>
                <div className="text-xs text-dark-500">
                  {t('admin.users.detail.subscription.validUntil')}
                </div>
                <div className="text-dark-100">{formatDate(selectedSub.end_date)}</div>
              </div>
              <div>
                <div className="text-xs text-dark-500">
                  {t('admin.users.detail.subscription.traffic')}
                </div>
                <div className="text-dark-100">
                  {panelInfo?.found
                    ? (panelInfo.used_traffic_bytes / (1024 * 1024 * 1024)).toFixed(1)
                    : selectedSub.traffic_used_gb.toFixed(1)}{' '}
                  / {selectedSub.traffic_limit_gb} {t('common.units.gb')}
                </div>
              </div>
              <div>
                <div className="text-xs text-dark-500">
                  {t('admin.users.detail.subscription.devices')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSetDeviceLimit(selectedSub.device_limit - 1)}
                    disabled={actionLoading || selectedSub.device_limit <= 1}
                    className="flex h-6 w-6 items-center justify-center rounded-md bg-dark-700 text-dark-300 transition-colors hover:bg-dark-600 disabled:opacity-30"
                  >
                    <MinusIcon />
                  </button>
                  <span className="min-w-[2ch] text-center text-dark-100">
                    {selectedSub.device_limit}
                  </span>
                  <button
                    onClick={() => onSetDeviceLimit(selectedSub.device_limit + 1)}
                    disabled={
                      actionLoading ||
                      (currentTariff?.max_device_limit != null &&
                        selectedSub.device_limit >= currentTariff.max_device_limit)
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
          {selectedSub.traffic_purchases && selectedSub.traffic_purchases.length > 0 && (
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-dark-200">
                  {t('admin.users.detail.subscription.trafficPackages')}
                  {selectedSub.purchased_traffic_gb > 0 && (
                    <span className="ml-2 text-xs text-dark-400">
                      ({selectedSub.purchased_traffic_gb} {t('common.units.gb')})
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {selectedSub.traffic_purchases.map((tp) => (
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
                            {tp.days_remaining} {t('admin.users.detail.subscription.daysLeft')}
                          </span>
                        )}
                      </div>
                    </div>
                    {!tp.is_expired && (
                      <button
                        onClick={() =>
                          onInlineConfirm(`removeTraffic_${tp.id}`, () => onRemoveTraffic(tp.id))
                        }
                        disabled={actionLoading}
                        className={`ml-2 shrink-0 rounded-lg px-2 py-1 text-xs transition-all disabled:opacity-50 ${
                          confirmingAction === `removeTraffic_${tp.id}`
                            ? 'bg-error-500 text-white'
                            : 'text-dark-500 hover:bg-error-500/15 hover:text-error-400'
                        }`}
                      >
                        {confirmingAction === `removeTraffic_${tp.id}` ? '?' : '×'}
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
                    onChange={(e) => onSelectedTrafficGbChange(e.target.value)}
                    className="input flex-1"
                  >
                    <option value="">{t('admin.users.detail.subscription.selectPackage')}</option>
                    {Object.entries(currentTariff.traffic_topup_packages)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([gb]) => (
                        <option key={gb} value={gb}>
                          {gb} {t('common.units.gb')}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => selectedTrafficGb && onAddTraffic(Number(selectedTrafficGb))}
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
          {hasPermission('users:subscription') && (
            <div className="rounded-xl bg-dark-800/50 p-4">
              <div className="mb-3 font-medium text-dark-200">
                {t('admin.users.detail.subscription.actions')}
              </div>
              <div className="space-y-3">
                <select
                  value={subAction}
                  onChange={(e) => onSubActionChange(e.target.value)}
                  className="input"
                >
                  <option value="extend">{t('admin.users.detail.subscription.extend')}</option>
                  <option value="shorten">{t('admin.users.detail.subscription.shorten')}</option>
                  {userSubscriptions.length <= 1 && (
                    <option value="change_tariff">
                      {t('admin.users.detail.subscription.changeTariff')}
                    </option>
                  )}
                  <option value="cancel">{t('admin.users.detail.subscription.cancel')}</option>
                  <option value="activate">{t('admin.users.detail.subscription.activate')}</option>
                </select>

                {(subAction === 'extend' || subAction === 'shorten') && (
                  <input
                    type="number"
                    value={subDays}
                    onChange={createNumberInputHandler(onSubDaysChange, 1)}
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
                      onSelectedTariffIdChange(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="input"
                  >
                    <option value="">{t('admin.users.detail.subscription.selectTariff')}</option>
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
                  onClick={() => onUpdateSubscription()}
                  disabled={actionLoading}
                  className="btn-primary w-full"
                >
                  {actionLoading
                    ? t('admin.users.actions.applying')
                    : t('admin.users.actions.apply')}
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Create new subscription — only for single-sub users or no subs */}
      {hasPermission('users:subscription') && userSubscriptions.length <= 1 && (
        <div className="rounded-xl bg-dark-800/50 p-4">
          {userSubscriptions.length === 0 && (
            <div className="mb-4 text-center text-dark-400">
              {t('admin.users.detail.subscription.noActive')}
            </div>
          )}
          <div className="mb-3 text-sm font-medium text-dark-200">
            {t('admin.users.detail.subscription.createNew', 'Создать подписку')}
          </div>
          <div className="space-y-3">
            <select
              value={selectedTariffId || ''}
              onChange={(e) =>
                onSelectedTariffIdChange(e.target.value ? parseInt(e.target.value) : null)
              }
              className="input"
            >
              <option value="">{t('admin.users.detail.subscription.selectTariff')}</option>
              {tariffs
                .filter((tariffItem) => {
                  if (userSubscriptions.length > 0) {
                    const purchasedIds = new Set(
                      userSubscriptions
                        .filter((s) => s.is_active || s.status === 'trial')
                        .map((s) => s.tariff_id),
                    );
                    return !purchasedIds.has(tariffItem.id);
                  }
                  return true;
                })
                .map((tariffItem) => (
                  <option key={tariffItem.id} value={tariffItem.id}>
                    {tariffItem.name}
                  </option>
                ))}
            </select>
            <input
              type="number"
              value={subDays}
              onChange={createNumberInputHandler(onSubDaysChange, 1)}
              placeholder={t('admin.users.detail.subscription.days')}
              className="input"
              min={1}
              max={3650}
            />
            <button
              onClick={() => onUpdateSubscription('create')}
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

      {/* Panel Info, Traffic, Devices — only inside subscription detail */}
      {(subscriptionDetailView || userSubscriptions.length <= 1) && (
        <>
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
                          onClick={() => onNodeUsageDaysChange(d)}
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
                      onClick={() => onLoadSubscriptionData()}
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
                  onClick={() => onLoadDevices()}
                  className="rounded-lg p-1 text-dark-500 transition-colors hover:text-dark-300"
                  title={t('common.refresh')}
                >
                  <RefreshIcon className="h-3.5 w-3.5" />
                </button>
                {devices.length > 0 && (
                  <button
                    onClick={() => onInlineConfirm('resetDevices', onResetDevices)}
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
                {devices.map((device) => {
                  const isEditing = editingDeviceHwid === device.hwid;
                  const displayName =
                    (device.local_name && device.local_name.trim()) ||
                    device.platform ||
                    device.device_model ||
                    device.hwid.slice(0, 12);
                  return (
                    <div
                      key={device.hwid}
                      className="flex items-center justify-between rounded-lg bg-dark-700/50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingDeviceName}
                            maxLength={DEVICE_ALIAS_MAX_LENGTH}
                            placeholder={
                              device.platform || device.device_model || device.hwid.slice(0, 12)
                            }
                            onChange={(e) => onEditingDeviceNameChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                onRenameDevice(device.hwid);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                onEditingDeviceHwidChange(null);
                                onEditingDeviceNameChange('');
                              }
                            }}
                            className="w-full rounded-md bg-dark-900/70 px-2 py-1 text-xs font-medium text-dark-50 outline-none ring-1 ring-dark-600/60 focus:ring-accent-500/50"
                          />
                        ) : (
                          <div className="truncate text-xs font-medium text-dark-200">
                            {displayName}
                          </div>
                        )}
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-dark-500">
                          {device.device_model && device.platform && (
                            <span>{device.device_model}</span>
                          )}
                          <span className="font-mono">{device.hwid.slice(0, 8)}...</span>
                          {device.created_at && (
                            <span>{new Date(device.created_at).toLocaleDateString(locale)}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 flex shrink-0 items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onRenameDevice(device.hwid)}
                              disabled={renameSaving}
                              className="rounded-lg px-2 py-1 text-success-400 transition-all hover:bg-success-500/15 disabled:opacity-50"
                              title={t(
                                'admin.users.detail.devices.renameSave',
                                t('common.save', 'Сохранить'),
                              )}
                              aria-label={t('admin.users.detail.devices.renameSave', 'Сохранить')}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onEditingDeviceHwidChange(null);
                                onEditingDeviceNameChange('');
                              }}
                              disabled={renameSaving}
                              className="rounded-lg px-2 py-1 text-dark-500 transition-all hover:bg-dark-700 disabled:opacity-50"
                              title={t('common.cancel', 'Отмена')}
                              aria-label={t('common.cancel', 'Отмена')}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                onEditingDeviceHwidChange(device.hwid);
                                onEditingDeviceNameChange(device.local_name || '');
                              }}
                              className="rounded-lg px-2 py-1 text-dark-500 transition-all hover:bg-accent-500/15 hover:text-accent-400"
                              title={t('admin.users.detail.devices.rename', 'Переименовать')}
                              aria-label={t('admin.users.detail.devices.rename', 'Переименовать')}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                onInlineConfirm(`deleteDevice_${device.hwid}`, () =>
                                  onDeleteDevice(device.hwid),
                                )
                              }
                              disabled={actionLoading}
                              className={`rounded-lg px-2 py-1 text-xs transition-all disabled:opacity-50 ${
                                confirmingAction === `deleteDevice_${device.hwid}`
                                  ? 'bg-error-500 text-white'
                                  : 'text-dark-500 hover:bg-error-500/15 hover:text-error-400'
                              }`}
                            >
                              {confirmingAction === `deleteDevice_${device.hwid}` ? '?' : '×'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-dark-500">
                {t('admin.users.detail.devices.none')}
              </div>
            )}
          </div>

          {/* Subscription Request History */}
          <div className="rounded-xl bg-dark-800/50">
            <button
              onClick={() => {
                const next = !requestHistoryExpanded;
                onRequestHistoryExpandedChange(next);
                if (next && requestHistory.length === 0) {
                  onLoadRequestHistory(0);
                }
              }}
              className="flex w-full items-center justify-between p-4 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-dark-200">
                  {t('admin.users.detail.requestHistory')}
                </span>
                {requestHistoryTotal > 0 && (
                  <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-medium text-accent-400">
                    {requestHistoryTotal}
                  </span>
                )}
              </div>
              <svg
                className={`h-4 w-4 text-dark-500 transition-transform ${requestHistoryExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>

            {requestHistoryExpanded && (
              <div className="border-t border-dark-700/50 px-4 pb-4 pt-3">
                {/* Subscription selector for multi-tariff */}
                {userSubscriptions.length > 1 && (
                  <div className="mb-3">
                    <select
                      value={requestHistorySubId || ''}
                      onChange={(e) => onRequestHistorySubIdChange(Number(e.target.value) || null)}
                      className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-sm text-dark-100"
                    >
                      {userSubscriptions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.tariff_name || `#${sub.id}`} — {sub.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {requestHistoryLoading && requestHistory.length === 0 ? (
                  <div className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                  </div>
                ) : requestHistory.length === 0 && !requestHistoryLoading ? (
                  <div className="py-6 text-center text-sm text-dark-500">
                    {t('admin.users.detail.noRequests')}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 text-xs text-dark-500">
                      {t('admin.users.detail.requestHistoryTotal')}: {requestHistoryTotal}
                    </div>

                    {/* Table */}
                    <div className="-mx-4 overflow-x-auto px-4">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-dark-700/50 text-xs text-dark-500">
                            <th className="pb-2 pr-3 font-medium">
                              {t('admin.users.detail.requestAt')}
                            </th>
                            <th className="pb-2 pr-3 font-medium">
                              {t('admin.users.detail.requestIp')}
                            </th>
                            <th className="pb-2 font-medium">
                              {t('admin.users.detail.requestUserAgent')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {requestHistory.map((record, idx) => (
                            <tr
                              key={record.id}
                              className={`border-b border-dark-700/30 ${idx % 2 === 0 ? 'bg-dark-800/30' : ''}`}
                            >
                              <td className="whitespace-nowrap py-2.5 pr-3 text-dark-200">
                                {formatDate(record.requestAt)}
                              </td>
                              <td className="whitespace-nowrap py-2.5 pr-3 font-mono text-xs text-dark-300">
                                {record.requestIp || '—'}
                              </td>
                              <td
                                className="max-w-[200px] truncate py-2.5 text-xs text-dark-400"
                                title={record.userAgent || ''}
                              >
                                {record.userAgent
                                  ? record.userAgent.length > 60
                                    ? `${record.userAgent.slice(0, 60)}...`
                                    : record.userAgent
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Load more */}
                    {requestHistory.length < requestHistoryTotal && (
                      <button
                        onClick={() => onLoadRequestHistory(requestHistoryOffset, true)}
                        disabled={requestHistoryLoading}
                        className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-dark-700/50 py-2.5 text-sm text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
                      >
                        {requestHistoryLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                        ) : (
                          t('admin.users.detail.loadMore')
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
