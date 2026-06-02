import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useCurrency } from '../../../hooks/useCurrency';
import { createNumberInputHandler } from '../../../utils/inputHelpers';
import type {
  UserDetailResponse,
  UserListItem,
  UserPanelInfo,
  UserSubscriptionInfo,
} from '../../../api/adminUsers';
import type { PromoGroup } from '../../../api/promocodes';
import { ServerIcon } from '@/components/icons';

// ──────────────────────────────────────────────────────────────────
// Local status badge (parent has its own — duplicating here to keep
// this file self-contained for the tab's smallest unit of meaning).
// ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    active: 'bg-success-500/20 text-success-400 border-success-500/30',
    blocked: 'bg-error-500/20 text-error-400 border-error-500/30',
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

// ──────────────────────────────────────────────────────────────────
// Info tab — user metadata + VPN connection + promo group + referral
// + restrictions + 4 destructive actions (reset/disable/delete).
//
// The tab is a "view facade" — it reads parent state (panelInfo,
// promoGroups, etc. live up there because subscription tab also
// consumes them) and delegates every mutation to a parent handler.
// Local UI state is parent-owned for the same reason: the parent
// already maintains the inline-confirm armer for actions shared
// with the subscription tab.
// ──────────────────────────────────────────────────────────────────

export interface InfoTabProps {
  user: UserDetailResponse;
  hasPermission: (perm: string) => boolean;
  formatDate: (date: string | null) => string;
  locale: string;

  // Subscription / panel info (also used by Subscription tab in parent)
  panelInfo: UserPanelInfo | null;
  panelInfoLoading: boolean;
  userSubscriptions: UserSubscriptionInfo[];
  activeSubscriptionId: number | null;
  onActiveSubscriptionChange: (id: number) => void;

  // Promo-group editor
  promoGroups: PromoGroup[];
  editingPromoGroup: boolean;
  onToggleEditingPromoGroup: () => void;
  onChangePromoGroup: (groupId: number | null) => void;

  // Referral commission editor
  editingReferralCommission: boolean;
  referralCommissionValue: number | '';
  onSetReferralCommissionValue: (value: number | '') => void;
  onToggleEditingReferralCommission: () => void;
  onUpdateReferralCommission: () => void;

  // Referrals mini-list
  referrals: UserListItem[];
  referralsLoading: boolean;

  // Status block/unblock
  actionLoading: boolean;
  onBlockUser: () => void;
  onUnblockUser: () => void;

  // Destructive actions + inline-confirm armer
  confirmingAction: string | null;
  onInlineConfirm: (actionKey: string, executeFn: () => Promise<void>) => void;
  onResetTrial: () => Promise<void>;
  onResetSubscription: () => Promise<void>;
  onDisableUser: () => Promise<void>;
  onFullDeleteUser: () => Promise<void>;
}

export function InfoTab(props: InfoTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const navigate = useNavigate();
  const {
    user,
    hasPermission,
    formatDate,
    locale,
    panelInfo,
    panelInfoLoading,
    userSubscriptions,
    activeSubscriptionId,
    onActiveSubscriptionChange,
    promoGroups,
    editingPromoGroup,
    onToggleEditingPromoGroup,
    onChangePromoGroup,
    editingReferralCommission,
    referralCommissionValue,
    onSetReferralCommissionValue,
    onToggleEditingReferralCommission,
    onUpdateReferralCommission,
    referrals,
    referralsLoading,
    actionLoading,
    onBlockUser,
    onUnblockUser,
    confirmingAction,
    onInlineConfirm,
    onResetTrial,
    onResetSubscription,
    onDisableUser,
    onFullDeleteUser,
  } = props;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between rounded-xl bg-dark-800/50 p-3">
        <span className="text-dark-400">{t('admin.users.detail.status')}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={user.status} />
          {user.status === 'active' ? (
            <button
              onClick={onBlockUser}
              disabled={actionLoading}
              className="rounded-lg bg-error-500/20 px-3 py-1 text-xs text-error-400 transition-colors hover:bg-error-500/30"
            >
              {t('admin.users.actions.block')}
            </button>
          ) : user.status === 'blocked' ? (
            <button
              onClick={onUnblockUser}
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
          <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.registration')}</div>
          <div className="text-dark-100">{formatDate(user.created_at)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/50 p-3">
          <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.botActivity')}</div>
          <div className="text-dark-100">{formatDate(user.last_activity)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/50 p-3">
          <div className="mb-1 text-xs text-dark-500">
            {t('admin.users.detail.cabinetLastLogin')}
          </div>
          <div className="text-dark-100">{formatDate(user.cabinet_last_login)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/50 p-3">
          <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.totalSpent')}</div>
          <div className="text-dark-100">{formatWithCurrency(user.total_spent_kopeks / 100)}</div>
        </div>
        <div className="rounded-xl bg-dark-800/50 p-3">
          <div className="mb-1 text-xs text-dark-500">{t('admin.users.detail.purchases')}</div>
          <div className="text-dark-100">{user.purchase_count}</div>
        </div>
      </div>

      {/* VPN Connection Info */}
      {(panelInfo || userSubscriptions.length > 0) && (
        <div className="rounded-xl border border-dark-700/30 bg-dark-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-dark-200">
              {t('admin.users.detail.vpnConnection')}
            </span>
            {userSubscriptions.length > 1 && (
              <select
                value={activeSubscriptionId ?? ''}
                onChange={(e) => onActiveSubscriptionChange(Number(e.target.value))}
                className="rounded-lg border border-dark-600 bg-dark-700 px-3 py-1.5 text-xs text-dark-200"
              >
                {userSubscriptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.tariff_name || `#${s.id}`} — {s.status}
                  </option>
                ))}
              </select>
            )}
          </div>
          {panelInfoLoading && !panelInfo?.found && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          )}
          {panelInfo?.found && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-dark-700/30 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.lastConnection')}
                </div>
                <div className="flex items-center gap-2">
                  {panelInfo.online_at &&
                    (() => {
                      const onlineDate = new Date(panelInfo.online_at);
                      const isRecent = Date.now() - onlineDate.getTime() < 5 * 60 * 1000;
                      return (
                        <>
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${isRecent ? 'bg-success-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-dark-500'}`}
                            title={isRecent ? t('admin.users.detail.online') : ''}
                          />
                          <span
                            className={`text-sm ${isRecent ? 'font-medium text-success-400' : 'text-dark-100'}`}
                          >
                            {isRecent
                              ? t('admin.users.detail.online')
                              : formatDate(panelInfo.online_at)}
                          </span>
                        </>
                      );
                    })()}
                  {!panelInfo.online_at && <span className="text-sm text-dark-100">-</span>}
                </div>
              </div>
              <div className="rounded-lg bg-dark-700/30 p-3">
                <div className="mb-1 text-xs text-dark-500">
                  {t('admin.users.detail.firstConnection')}
                </div>
                <div className="text-sm text-dark-100">
                  {panelInfo.first_connected_at
                    ? new Date(panelInfo.first_connected_at).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : '-'}
                </div>
              </div>
              {panelInfo.last_connected_node_name && (
                <div className="col-span-2 rounded-lg bg-dark-700/30 p-3">
                  <div className="mb-1 text-xs text-dark-500">
                    {t('admin.users.detail.lastNode')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-dark-100">
                    <ServerIcon className="h-4 w-4 shrink-0 text-dark-400" />
                    {panelInfo.last_connected_node_name}
                  </div>
                </div>
              )}
            </div>
          )}
          {!panelInfoLoading && !panelInfo?.found && userSubscriptions.length > 0 && (
            <div className="py-2 text-center text-xs text-dark-500">
              {t('admin.users.detail.noVpnData')}
            </div>
          )}
        </div>
      )}

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
          {hasPermission('users:promo_group') && (
            <button
              onClick={onToggleEditingPromoGroup}
              className="text-xs text-accent-400 transition-colors hover:text-accent-300"
            >
              {editingPromoGroup ? t('common.cancel') : t('admin.users.detail.changePromoGroup')}
            </button>
          )}
        </div>
        {editingPromoGroup ? (
          <div className="mt-2 space-y-2">
            <select
              value={user.promo_group?.id ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                onChangePromoGroup(val ? parseInt(val, 10) : null);
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
                onClick={() => onChangePromoGroup(null)}
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
          {hasPermission('users:referral') && (
            <button
              onClick={onToggleEditingReferralCommission}
              className="text-xs text-accent-400 transition-colors hover:text-accent-300"
            >
              {editingReferralCommission ? t('common.cancel') : t('common.edit')}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-dark-100">{user.referral.referrals_count}</div>
            <div className="text-xs text-dark-500">
              {t('admin.users.detail.referral.referrals')}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-dark-100">
              {formatWithCurrency(user.referral.total_earnings_kopeks / 100)}
            </div>
            <div className="text-xs text-dark-500">{t('admin.users.detail.referral.earned')}</div>
          </div>
          <div>
            {editingReferralCommission ? (
              <div className="space-y-1">
                <input
                  type="number"
                  value={referralCommissionValue}
                  onChange={createNumberInputHandler(onSetReferralCommissionValue, 0)}
                  placeholder="0-100"
                  className="input w-full text-center text-sm"
                  min={0}
                  max={100}
                  disabled={actionLoading}
                />
                <button
                  onClick={onUpdateReferralCommission}
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
                      <div className="text-xs text-dark-500">{formatDate(ref.created_at)}</div>
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
            onClick={() => onInlineConfirm('resetTrial', onResetTrial)}
            disabled={actionLoading}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              confirmingAction === 'resetTrial'
                ? 'bg-accent-500 text-white'
                : 'bg-accent-500/15 text-accent-400 hover:bg-accent-500/25'
            }`}
          >
            {confirmingAction === 'resetTrial'
              ? t('admin.users.detail.actions.areYouSure')
              : t('admin.users.userActions.resetTrial')}
          </button>
          <button
            onClick={() => onInlineConfirm('resetSubscription', onResetSubscription)}
            disabled={actionLoading}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 ${
              confirmingAction === 'resetSubscription'
                ? 'bg-warning-500 text-white'
                : 'bg-warning-500/15 text-warning-400 hover:bg-warning-500/25'
            }`}
          >
            {confirmingAction === 'resetSubscription'
              ? t('admin.users.detail.actions.areYouSure')
              : t('admin.users.userActions.resetSubscription')}
          </button>
          <button
            onClick={() => onInlineConfirm('disable', onDisableUser)}
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
            onClick={() => onInlineConfirm('fullDelete', onFullDeleteUser)}
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
  );
}
