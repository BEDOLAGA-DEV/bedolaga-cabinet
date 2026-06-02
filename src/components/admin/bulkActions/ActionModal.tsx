import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronDownIcon, XCloseIcon, XIcon } from '@/components/icons';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { DropdownSelect } from './DropdownSelect';
import type { UserListItem } from '../../../api/adminUsers';
import type { TariffListItem } from '../../../api/tariffs';
import type { PromoGroup } from '../../../api/promocodes';
import type {
  BulkActionType,
  BulkActionParams,
  BulkActionResult,
  BulkProgressEvent,
} from '../../../api/adminBulkActions';

// ──────────────────────────────────────────────────────────────────
// ActionModal
//
// The per-action configuration + execution modal for AdminBulkActions.
// Wraps three internal views:
//   - ProgressView (live SSE log + counters while a job streams)
//   - ErrorDetails (collapsible per-row error list after completion)
//   - the per-action form (days / tariff / traffic / balance /
//     promo-group / grant / set-devices / delete-* confirmations)
//
// Self-contained: the parent feeds modal state + reference data
// (tariffs, promo groups, users for active-paid counting) and
// receives onExecute(params) when the operator confirms. No queries
// or mutations here — execution flow lives in the parent's
// handleExecuteAction (which streams progress back into the modal
// via setModal({ ..., progress })).
// ──────────────────────────────────────────────────────────────────

export interface ProgressState {
  current: number;
  total: number;
  successCount: number;
  errorCount: number;
  log: BulkProgressEvent[];
}

export interface ModalState {
  open: boolean;
  action: BulkActionType | null;
  loading: boolean;
  result: BulkActionResult | null;
  progress: ProgressState | null;
}

function ProgressView({ progress }: { progress: ProgressState }) {
  const { t } = useTranslation();
  const logEndRef = useRef<HTMLDivElement>(null);
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.log.length]);

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-dark-200">
            {t('admin.bulkActions.progress.processed', {
              current: progress.current,
              total: progress.total,
            })}
          </span>
          <span className="font-bold tabular-nums text-accent-400">{percentage}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-dark-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success-400" />
          <span className="text-sm tabular-nums text-success-400">{progress.successCount}</span>
          <span className="text-xs text-dark-500">{t('admin.bulkActions.progress.succeeded')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-error-400" />
          <span className="text-sm tabular-nums text-error-400">{progress.errorCount}</span>
          <span className="text-xs text-dark-500">{t('admin.bulkActions.progress.failed')}</span>
        </div>
      </div>

      {progress.log.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-dark-700 bg-dark-800/50 p-3">
          <div className="space-y-1">
            {progress.log.slice(-10).map((entry, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {entry.success ? (
                  <span className="mt-0.5 shrink-0 text-success-400" aria-hidden="true">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="mt-0.5 shrink-0 text-error-400" aria-hidden="true">
                    <XIcon className="h-3 w-3" />
                  </span>
                )}
                <span className="font-mono text-dark-400">
                  {entry.username ? `@${entry.username}` : `#${entry.user_id}`}
                </span>
                <span className={entry.success ? 'text-dark-300' : 'text-error-300'}>
                  {entry.success
                    ? entry.message || t('admin.bulkActions.progress.ok')
                    : entry.message || entry.error || t('admin.bulkActions.progress.errorGeneric')}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorDetails({ result }: { result: BulkActionResult }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (result.error_count === 0 || result.errors.length === 0) return null;

  return (
    <div className="rounded-xl border border-error-500/20 bg-error-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-error-400">
          {t('admin.bulkActions.errors.title', { count: result.error_count })}
        </span>
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-error-400 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
        />
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-error-500/20 px-4 py-3">
          <div className="space-y-2">
            {result.errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0 text-error-400" aria-hidden="true">
                  <XIcon className="h-3 w-3" />
                </span>
                <span className="shrink-0 font-mono text-dark-400">
                  {err.username ? `@${err.username}` : `#${err.user_id}`}
                </span>
                <span className="text-error-300">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface ActionModalProps {
  modal: ModalState;
  selectedCount: number;
  tariffs: TariffListItem[];
  promoGroups: PromoGroup[];
  users: UserListItem[];
  selectedSubscriptionIds: number[];
  onClose: () => void;
  onExecute: (params: BulkActionParams) => void;
}

export function ActionModal({
  modal,
  selectedCount,
  tariffs,
  promoGroups,
  users,
  selectedSubscriptionIds,
  onClose,
  onExecute,
}: ActionModalProps) {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [tariffId, setTariffId] = useState<number>(tariffs[0]?.id ?? 0);
  const [trafficGb, setTrafficGb] = useState(10);
  const [balanceRub, setBalanceRub] = useState(100);
  const [promoGroupId, setPromoGroupId] = useState<number | null>(promoGroups[0]?.id ?? null);
  const [grantTariffId, setGrantTariffId] = useState<number>(tariffs[0]?.id ?? 0);
  const [grantDays, setGrantDays] = useState(30);
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [deleteFromPanel, setDeleteFromPanel] = useState(true);
  const [forceDeleteActivePaid, setForceDeleteActivePaid] = useState(false);

  useEffect(() => {
    if (tariffs.length > 0 && tariffId === 0) {
      setTariffId(tariffs[0].id);
    }
    if (tariffs.length > 0 && grantTariffId === 0) {
      setGrantTariffId(tariffs[0].id);
    }
  }, [tariffs, tariffId, grantTariffId]);

  useEffect(() => {
    if (promoGroups.length > 0 && promoGroupId === null) {
      setPromoGroupId(promoGroups[0].id);
    }
  }, [promoGroups, promoGroupId]);

  useEffect(() => {
    if (modal.open) {
      if (modal.action === 'delete_user') {
        setDeleteFromPanel(true);
      }
      if (modal.action === 'delete_subscription') {
        setForceDeleteActivePaid(false);
      }
    }
  }, [modal.open, modal.action]);

  // Focus trap + scroll lock + Escape close (only while not loading).
  const dialogRef = useFocusTrap<HTMLDivElement>(modal.open, {
    onEscape: modal.loading ? undefined : onClose,
  });

  // Count active paid subscriptions among selected ones
  const activePaidCount = useMemo(() => {
    if (modal.action !== 'delete_subscription') return 0;
    const selectedSubIdSet = new Set(selectedSubscriptionIds);
    let count = 0;
    for (const user of users) {
      for (const sub of user.subscriptions ?? []) {
        if (selectedSubIdSet.has(sub.id) && sub.status === 'active' && !sub.is_trial) {
          count++;
        }
      }
    }
    return count;
  }, [modal.action, selectedSubscriptionIds, users]);

  const isConfirmDisabled =
    modal.loading ||
    (modal.action === 'delete_subscription' && activePaidCount > 0 && !forceDeleteActivePaid);

  if (!modal.open || !modal.action) return null;

  const actionLabelKeys: Record<BulkActionType, string> = {
    extend_subscription: 'admin.bulkActions.actions.extend',
    add_days: 'admin.bulkActions.actions.extend',
    cancel_subscription: 'admin.bulkActions.actions.cancel',
    activate_subscription: 'admin.bulkActions.actions.activate',
    change_tariff: 'admin.bulkActions.actions.changeTariff',
    add_traffic: 'admin.bulkActions.actions.addTraffic',
    add_balance: 'admin.bulkActions.actions.addBalance',
    assign_promo_group: 'admin.bulkActions.actions.assignPromoGroup',
    grant_subscription: 'admin.bulkActions.actions.grantSubscription',
    set_devices: 'admin.bulkActions.actions.setDevices',
    delete_subscription: 'admin.bulkActions.actions.deleteSubscription',
    delete_user: 'admin.bulkActions.actions.deleteUser',
  };

  const handleSubmit = () => {
    const params: BulkActionParams = {};
    switch (modal.action) {
      case 'extend_subscription':
        params.days = days;
        break;
      case 'change_tariff':
        params.tariff_id = tariffId;
        break;
      case 'add_traffic':
        params.traffic_gb = trafficGb;
        break;
      case 'add_balance':
        params.amount_kopeks = Math.round(balanceRub * 100);
        break;
      case 'assign_promo_group':
        params.promo_group_id = promoGroupId;
        break;
      case 'grant_subscription':
        params.tariff_id = grantTariffId;
        params.days = grantDays;
        break;
      case 'set_devices':
        params.device_limit = deviceLimit;
        break;
      case 'delete_subscription':
        params.force_delete_active_paid = forceDeleteActivePaid;
        break;
      case 'delete_user':
        params.delete_from_panel = deleteFromPanel;
        break;
    }
    onExecute(params);
  };

  const handleBackdropClick = () => {
    if (!modal.loading) {
      onClose();
    }
  };

  const renderInputs = () => {
    switch (modal.action) {
      case 'extend_subscription':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.days')}
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'change_tariff':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.tariff')}
            </label>
            <DropdownSelect
              value={String(tariffId)}
              options={tariffs.map((tt) => ({ value: String(tt.id), label: tt.name }))}
              onChange={(v) => setTariffId(Number(v))}
            />
          </div>
        );
      case 'add_traffic':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.trafficGb')}
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={trafficGb}
              onChange={(e) => setTrafficGb(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'add_balance':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.balanceRub')}
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={balanceRub}
              onChange={(e) => setBalanceRub(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'assign_promo_group':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.promoGroup')}
            </label>
            <DropdownSelect
              value={promoGroupId !== null ? String(promoGroupId) : 'null'}
              options={[
                { value: 'null', label: t('admin.bulkActions.params.removePromoGroup') },
                ...promoGroups.map((pg) => ({ value: String(pg.id), label: pg.name })),
              ]}
              onChange={(v) => setPromoGroupId(v === 'null' ? null : Number(v))}
            />
          </div>
        );
      case 'set_devices':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.deviceLimit')}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={deviceLimit}
              onChange={(e) => setDeviceLimit(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'grant_subscription':
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-300">
                {t('admin.bulkActions.params.tariff')}
              </label>
              <DropdownSelect
                value={String(grantTariffId)}
                options={tariffs.map((tt) => ({ value: String(tt.id), label: tt.name }))}
                onChange={(v) => setGrantTariffId(Number(v))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-300">
                {t('admin.bulkActions.params.days')}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
              />
            </div>
            <div className="rounded-xl border border-warning-500/20 bg-warning-500/5 px-3 py-2.5">
              <p className="text-xs text-warning-400">
                {t('admin.bulkActions.grantSubscription.warning')}
              </p>
            </div>
          </div>
        );
      case 'delete_subscription': {
        const totalSelected = selectedSubscriptionIds.length;
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-3 py-2.5">
              <p className="text-sm font-medium text-error-400">
                {t('admin.bulkActions.deleteSubscription.warning')}
              </p>
              <p className="mt-1 text-xs text-error-300/70">
                {t('admin.bulkActions.deleteSubscription.hint')}
              </p>
            </div>
            {activePaidCount > 0 && (
              <>
                <div className="rounded-xl border border-warning-500/20 bg-warning-500/5 px-3 py-2.5">
                  <p className="text-sm font-medium text-warning-400">
                    {t('admin.bulkActions.deleteSubscription.activePaidWarning', {
                      count: activePaidCount,
                      total: totalSelected,
                    })}
                  </p>
                </div>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
                  <button
                    onClick={() => setForceDeleteActivePaid((prev) => !prev)}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-150',
                      forceDeleteActivePaid
                        ? 'border-error-500 bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                        : 'border-dark-500 bg-dark-700/60 hover:border-error-500/50 hover:bg-dark-600/60',
                    )}
                    aria-pressed={forceDeleteActivePaid}
                  >
                    {forceDeleteActivePaid && <CheckIcon className="h-3 w-3" />}
                  </button>
                  <span
                    className={cn(
                      'text-sm',
                      forceDeleteActivePaid ? 'font-medium text-error-400' : 'text-dark-400',
                    )}
                  >
                    {t('admin.bulkActions.deleteSubscription.forceDeleteConfirm')}
                  </span>
                </label>
              </>
            )}
          </div>
        );
      }
      case 'delete_user':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-3 py-2.5">
              <p className="text-sm font-medium text-error-400">
                {t('admin.bulkActions.deleteUser.warning')}
              </p>
              <p className="mt-1 text-xs text-error-300/70">
                {t('admin.bulkActions.deleteUser.hint')}
              </p>
            </div>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
              <button
                onClick={() => setDeleteFromPanel((prev) => !prev)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-150',
                  deleteFromPanel
                    ? 'border-error-500 bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : 'border-dark-500 bg-dark-700/60 hover:border-error-500/50 hover:bg-dark-600/60',
                )}
                aria-pressed={deleteFromPanel}
              >
                {deleteFromPanel && <CheckIcon className="h-3 w-3" />}
              </button>
              <span
                className={cn(
                  'text-sm',
                  deleteFromPanel ? 'font-medium text-error-400' : 'text-dark-400',
                )}
              >
                {t('admin.bulkActions.deleteUser.deleteFromPanel')}
              </span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-action-modal-title"
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 id="bulk-action-modal-title" className="text-lg font-bold text-dark-100">
            {t(actionLabelKeys[modal.action])}
          </h3>
          {!modal.loading && (
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
              aria-label={t('common.close')}
            >
              <XCloseIcon />
            </button>
          )}
        </div>

        {modal.loading && modal.progress ? (
          <div className="space-y-4">
            <ProgressView progress={modal.progress} />
            <p className="text-center text-xs text-dark-500">
              {t('admin.bulkActions.progress.doNotClose')}
            </p>
          </div>
        ) : modal.result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
              <div className="mb-3 text-center text-sm font-semibold text-dark-100">
                {t('admin.bulkActions.complete')}
              </div>
              <div className="mb-3 text-center text-sm">
                <span className="font-medium text-success-400">
                  {t('admin.bulkActions.progress.summarySuccess', {
                    count: modal.result.success_count,
                  })}
                </span>
                {modal.result.error_count > 0 && (
                  <>
                    <span className="mx-1.5 text-dark-600" aria-hidden="true">
                      /
                    </span>
                    <span className="font-medium text-error-400">
                      {t('admin.bulkActions.progress.summaryErrors', {
                        count: modal.result.error_count,
                      })}
                    </span>
                  </>
                )}
              </div>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-400">
                    {modal.result.success_count}
                  </div>
                  <div className="text-xs text-dark-400">
                    {t('admin.bulkActions.successCount', { count: modal.result.success_count })}
                  </div>
                </div>
                {modal.result.error_count > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-error-400">
                      {modal.result.error_count}
                    </div>
                    <div className="text-xs text-dark-400">
                      {t('admin.bulkActions.errorCount', { count: modal.result.error_count })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <ErrorDetails result={modal.result} />

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-accent-500/20 bg-accent-500/5 px-4 py-3">
              <p className="text-sm text-dark-200">
                {t('admin.bulkActions.selectedCount', { count: selectedCount })}
              </p>
            </div>

            <div className="mb-6">{renderInputs()}</div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={modal.loading}
                className="min-h-[44px] flex-1 rounded-xl border border-dark-700 bg-dark-800 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
              >
                {t('admin.bulkActions.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isConfirmDisabled}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                {t('admin.bulkActions.confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
