import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotify } from '../../../platform/hooks/useNotify';
import { useCurrency } from '../../../hooks/useCurrency';
import { adminUsersApi, type UserDetailResponse } from '../../../api/adminUsers';
import { promocodesApi } from '../../../api/promocodes';
import { promoOffersApi } from '../../../api/promoOffers';
import { createNumberInputHandler, toNumber } from '../../../utils/inputHelpers';
import { Card } from '@/components/data-display';
import { WalletIcon, GiftIcon, HistoryIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm } from '../../../platform/hooks/useNativeDialog';

// ──────────────────────────────────────────────────────────────────
// Balance tab — баланс с одной формой «начислить / списать», персональная
// скидка отдельной карточкой и операции. Списание и отключение скидки
// подтверждаются системным диалогом; родитель только обновляет пользователя.
// ──────────────────────────────────────────────────────────────────

export interface BalanceTabProps {
  user: UserDetailResponse;
  userId: number;
  hasPermission: (perm: string) => boolean;
  onUserRefresh: () => Promise<void> | void;
  formatDate: (date: string | null) => string;
}

export function BalanceTab({
  user,
  userId,
  hasPermission,
  onUserRefresh,
  formatDate,
}: BalanceTabProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const { formatWithCurrency } = useCurrency();

  const [balanceAmount, setBalanceAmount] = useState<number | ''>('');
  const [balanceDescription, setBalanceDescription] = useState('');
  const [offerDiscountPercent, setOfferDiscountPercent] = useState<number | ''>('');
  const [offerValidHours, setOfferValidHours] = useState<number | ''>(24);

  const [actionLoading, setActionLoading] = useState(false);
  const [offerSending, setOfferSending] = useState(false);

  const [mode, setMode] = useState<'add' | 'subtract'>('add');
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const confirmDestructive = useDestructiveConfirm();

  // ─── Mutations ──────────────────────────────────────────────────

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (balanceAmount === '') return;
    if (
      !isAdd &&
      !(await confirmDestructive(
        t('admin.users.detail.balance.confirmSubtract', {
          amount: formatWithCurrency(Math.abs(toNumber(balanceAmount))),
        }),
        t('admin.users.detail.balance.subtract'),
      ))
    )
      return;
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
      await onUserRefresh();
      setBalanceAmount('');
      setBalanceDescription('');
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivateOffer = async () => {
    if (
      !(await confirmDestructive(
        t('admin.users.detail.balance.confirmDeactivate', {
          percent: user.promo_offer_discount_percent,
        }),
        t('admin.users.detail.deactivateOffer'),
      ))
    )
      return;
    setActionLoading(true);
    try {
      await promocodesApi.deactivateDiscount(userId);
      notify.success(t('admin.users.detail.offerDeactivated'), t('common.success'));
      await onUserRefresh();
    } catch {
      notify.error(t('admin.users.userActions.error'), t('common.error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendOffer = async () => {
    if (offerDiscountPercent === '' || offerValidHours === '') return;
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
      setOfferFormOpen(false);
      await onUserRefresh();
    } catch {
      notify.error(t('admin.users.detail.offerSendError'), t('common.error'));
    } finally {
      setOfferSending(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const amountValid = balanceAmount !== '' && toNumber(balanceAmount) > 0;
  const segment = (value: 'add' | 'subtract') =>
    cn(
      'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
      mode === value ? 'bg-dark-700 text-dark-100' : 'text-dark-400 hover:text-dark-200',
    );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card size="md" className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5">
          <WalletIcon className="h-5 w-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-dark-100">
            {t('admin.users.detail.balance.title')}
          </h2>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold tabular-nums text-dark-100">
            {formatWithCurrency(user.balance_rubles)}
          </span>
          <span className="text-sm text-dark-400">
            {t('admin.users.detail.balance.spentSummary', {
              amount: formatWithCurrency(user.total_spent_kopeks / 100),
            })}
          </span>
        </div>

        {hasPermission('users:balance') && (
          <div className="flex flex-col gap-3">
            <div className="inline-flex self-start rounded-xl bg-dark-800 p-1" role="radiogroup">
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'add'}
                onClick={() => setMode('add')}
                className={segment('add')}
              >
                {t('admin.users.detail.balance.add')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={mode === 'subtract'}
                onClick={() => setMode('subtract')}
                className={segment('subtract')}
              >
                {t('admin.users.detail.balance.subtract')}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
              <label className="flex flex-col gap-1 text-xs text-dark-500">
                {t('admin.users.detail.balance.amountLabel')}
                <input
                  type="number"
                  min={0}
                  value={balanceAmount}
                  onChange={createNumberInputHandler(setBalanceAmount)}
                  placeholder={t('admin.users.detail.balance.amountPlaceholder')}
                  className="input py-2.5"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-dark-500">
                {t('admin.users.detail.balance.commentLabel')}
                <input
                  type="text"
                  value={balanceDescription}
                  onChange={(e) => setBalanceDescription(e.target.value)}
                  placeholder={t('admin.users.detail.balance.descriptionPlaceholder')}
                  className="input py-2.5"
                  maxLength={500}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => handleUpdateBalance(mode === 'add')}
              disabled={actionLoading || !amountValid}
              className={cn('self-start', mode === 'add' ? 'btn-primary' : 'btn-danger')}
            >
              {mode === 'add'
                ? t('admin.users.detail.balance.add')
                : t('admin.users.detail.balance.subtract')}
            </button>
          </div>
        )}
      </Card>

      <Card size="md" className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <GiftIcon className="h-5 w-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-dark-100">
            {t('admin.users.detail.balance.discountTitle')}
          </h2>
        </div>
        {user.promo_offer_discount_percent > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl bg-accent-500/10 p-3">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-dark-500">{t('admin.users.detail.discount')}</dt>
              <dd className="m-0 font-semibold text-accent-400">
                −{user.promo_offer_discount_percent}%
              </dd>
              <dt className="text-dark-500">{t('admin.users.detail.source')}</dt>
              <dd className="m-0 text-dark-100">{user.promo_offer_discount_source || '—'}</dd>
              <dt className="text-dark-500">{t('admin.users.detail.expiresAt')}</dt>
              <dd className="m-0 text-dark-100">
                {user.promo_offer_discount_expires_at
                  ? formatDate(user.promo_offer_discount_expires_at)
                  : '—'}
              </dd>
            </dl>
            <button
              type="button"
              onClick={handleDeactivateOffer}
              disabled={actionLoading}
              className="btn-ghost self-start px-2.5 py-1.5 text-sm text-error-400 hover:bg-error-500/10 hover:text-error-400"
            >
              {t('admin.users.detail.deactivateOffer')}
            </button>
          </div>
        ) : (
          <p className="text-sm text-dark-400">{t('admin.users.detail.balance.noOffer')}</p>
        )}

        {hasPermission('users:send_offer') &&
          (offerFormOpen ? (
            <div className="flex flex-col gap-3 rounded-xl border border-dark-700 bg-dark-800/60 p-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs text-dark-500">
                  {t('admin.users.detail.discountPercent')}
                  <input
                    type="number"
                    value={offerDiscountPercent}
                    onChange={createNumberInputHandler(setOfferDiscountPercent, 1)}
                    className="input py-2"
                    min={1}
                    max={100}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-dark-500">
                  {t('admin.users.detail.validHours')}
                  <input
                    type="number"
                    value={offerValidHours}
                    onChange={createNumberInputHandler(setOfferValidHours, 1)}
                    className="input py-2"
                    min={1}
                    max={8760}
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSendOffer}
                  disabled={offerSending || offerDiscountPercent === '' || offerValidHours === ''}
                  className="btn-primary"
                >
                  {offerSending ? t('common.loading') : t('admin.users.detail.sendOffer')}
                </button>
                <button type="button" onClick={() => setOfferFormOpen(false)} className="btn-ghost">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOfferFormOpen(true)}
              className="btn-secondary self-start"
            >
              {t('admin.users.detail.balance.offerFormOpen')}
            </button>
          ))}
      </Card>

      <Card size="md" className="flex flex-col gap-3 lg:col-span-2">
        <div className="flex items-center gap-2.5">
          <HistoryIcon className="h-5 w-5 text-accent-400" />
          <h2 className="text-lg font-semibold text-dark-100">
            {t('admin.users.detail.balance.recentTransactions')}
          </h2>
        </div>
        {user.recent_transactions.length > 0 ? (
          <ul className="m-0 list-none divide-y divide-dark-800 p-0">
            {user.recent_transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm text-dark-200">{tx.description || tx.type}</div>
                  <div className="text-xs text-dark-500">
                    {formatDate(tx.created_at)} · #{tx.id}
                  </div>
                </div>
                <div
                  className={cn(
                    'shrink-0 font-mono text-sm tabular-nums',
                    tx.amount_kopeks >= 0 ? 'text-success-400' : 'text-error-400',
                  )}
                >
                  {tx.amount_kopeks >= 0 ? '+' : '−'}
                  {formatWithCurrency(Math.abs(tx.amount_rubles))}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-dark-500">{t('admin.users.detail.balance.noOperations')}</p>
        )}
      </Card>
    </div>
  );
}
