import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { adminUsersApi, type UserDetailResponse } from '@/api/adminUsers';
import { promocodesApi } from '@/api/promocodes';
import { promoOffersApi } from '@/api/promoOffers';
import { useMoney } from '@/components/admin/users';
import { GiftIcon, WalletIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import { formatShortDate } from '@/utils/format';
import { createNumberInputHandler, toNumber } from '@/utils/inputHelpers';
import { OperationsFeed, operationsQueryKey } from './OperationsFeed';
import { Segmented } from '@/components/admin/Segmented';
import { KeyValues, LinkAction, Section } from './sectionParts';
import { useAdminAction } from './useAdminAction';

export interface BalanceTabProps {
  user: UserDetailResponse;
  userId: number;
  can: { balance: boolean; offer: boolean; deactivateOffer: boolean };
  onUserRefresh: () => Promise<unknown>;
}

type Mode = 'add' | 'subtract';
const DEFAULT_OFFER_HOURS = 24;

/**
 * «Баланс»: одна форма «начислить / списать», персональная скидка отдельной
 * карточкой и операции лентой. Списание и отключение скидки подтверждаются.
 */
export function BalanceTab({ user, userId, can, onUserRefresh }: BalanceTabProps) {
  const { t } = useTranslation();
  const money = useMoney();
  const queryClient = useQueryClient();
  const { busy, run } = useAdminAction();
  const confirmDestructive = useDestructiveConfirm();
  const amountId = useId();
  const commentId = useId();
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState<number | ''>('');
  const [comment, setComment] = useState('');
  const ns = 'admin.users.detail.balance';

  const refreshAll = () =>
    Promise.all([
      onUserRefresh(),
      queryClient.invalidateQueries({ queryKey: operationsQueryKey(userId) }),
    ]);

  const amountValid = amount !== '' && toNumber(amount) > 0;
  const submit = async () => {
    if (!amountValid) return;
    const rubles = Math.abs(toNumber(amount));
    if (
      mode === 'subtract' &&
      !(await confirmDestructive(
        t(`${ns}.confirmSubtract`, { amount: money(rubles) }),
        t(`${ns}.subtract`),
      ))
    )
      return;
    const kopeks = Math.round(rubles * 100);
    const done = await run(
      () =>
        adminUsersApi.updateBalance(userId, {
          amount_kopeks: mode === 'add' ? kopeks : -kopeks,
          description:
            comment.trim() || t(mode === 'add' ? `${ns}.addByAdmin` : `${ns}.subtractByAdmin`),
        }),
      {
        success: t(mode === 'add' ? `${ns}.added` : `${ns}.subtracted`, { amount: money(rubles) }),
        after: refreshAll,
      },
    );
    if (done) {
      setAmount('');
      setComment('');
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Сколько на балансе и сколько потрачено — в плитках над вкладками; здесь только
          начисление и списание, без повтора тех же сумм крупным шрифтом. */}
      {can.balance && (
        <Section icon={<WalletIcon className="h-5 w-5" />} title={t(`${ns}.changeTitle`)}>
          <div className="flex flex-col gap-3">
            <Segmented
              label={t(`${ns}.title`)}
              value={mode}
              onChange={setMode}
              options={[
                { value: 'add', label: t(`${ns}.add`) },
                { value: 'subtract', label: t(`${ns}.subtract`) },
              ]}
              className="self-start"
            />
            <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <label htmlFor={amountId} className="flex flex-col gap-1 text-xs text-dark-500">
                {t(`${ns}.amountLabel`)}
                <input
                  id={amountId}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={amount}
                  onChange={createNumberInputHandler(setAmount)}
                  placeholder={t(`${ns}.amountPlaceholder`)}
                  className="input py-2.5"
                />
              </label>
              <label htmlFor={commentId} className="flex flex-col gap-1 text-xs text-dark-500">
                {t(`${ns}.commentLabel`)}
                <input
                  id={commentId}
                  type="text"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t(`${ns}.descriptionPlaceholder`)}
                  className="input py-2.5"
                  maxLength={500}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy || !amountValid}
              className={cn('self-start', mode === 'add' ? 'btn-primary' : 'btn-danger')}
            >
              {mode === 'add' ? t(`${ns}.add`) : t(`${ns}.subtract`)}
            </button>
          </div>
        </Section>
      )}

      <DiscountCard
        user={user}
        userId={userId}
        canSend={can.offer}
        canDeactivate={can.deactivateOffer}
        onRefresh={onUserRefresh}
      />

      <OperationsFeed userId={userId} />
    </div>
  );
}

function DiscountCard({
  user,
  userId,
  canSend,
  canDeactivate,
  onRefresh,
}: {
  user: UserDetailResponse;
  userId: number;
  canSend: boolean;
  canDeactivate: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const { busy, run } = useAdminAction();
  const confirmDestructive = useDestructiveConfirm();
  const percentId = useId();
  const hoursId = useId();
  const [formOpen, setFormOpen] = useState(false);
  const [percent, setPercent] = useState<number | ''>('');
  const [hours, setHours] = useState<number | ''>(DEFAULT_OFFER_HOURS);
  const ns = 'admin.users.detail';
  const active = user.promo_offer_discount_percent > 0;

  const deactivate = async () => {
    const ok = await confirmDestructive(
      t(`${ns}.balance.confirmDeactivate`, { percent: user.promo_offer_discount_percent }),
      t(`${ns}.deactivateOffer`),
    );
    if (ok)
      await run(() => promocodesApi.deactivateDiscount(userId), {
        success: t(`${ns}.offerDeactivated`),
        after: onRefresh,
      });
  };

  const send = async () => {
    const sent = await run(
      () =>
        promoOffersApi.broadcastOffer({
          user_id: userId,
          notification_type: 'admin_personal',
          discount_percent: toNumber(percent),
          valid_hours: toNumber(hours, DEFAULT_OFFER_HOURS),
          effect_type: 'percent_discount',
          send_notification: true,
        }),
      { success: t(`${ns}.offerSent`), after: onRefresh },
    );
    if (sent) {
      setFormOpen(false);
      setPercent('');
      setHours(DEFAULT_OFFER_HOURS);
    }
  };

  return (
    <Section icon={<GiftIcon className="h-5 w-5" />} title={t(`${ns}.balance.discountTitle`)}>
      <KeyValues
        rows={[
          {
            key: 'now',
            label: t(`${ns}.balance.offerNow`),
            value: active ? (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <span className="font-semibold text-accent-400">
                  {t(`${ns}.balance.offerValue`, {
                    percent: user.promo_offer_discount_percent,
                    date: formatShortDate(user.promo_offer_discount_expires_at),
                  })}
                </span>
                {canDeactivate && (
                  <LinkAction onClick={() => void deactivate()} disabled={busy}>
                    {t(`${ns}.deactivateOffer`)}
                  </LinkAction>
                )}
              </span>
            ) : (
              t(`${ns}.balance.noOffer`)
            ),
          },
        ]}
      />

      {canSend &&
        (formOpen ? (
          <div className="flex flex-col gap-3 rounded-xl border border-dark-700 bg-dark-800/60 p-3">
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor={percentId} className="flex flex-col gap-1 text-xs text-dark-500">
                {t(`${ns}.discountPercent`)}
                <input
                  id={percentId}
                  type="number"
                  inputMode="numeric"
                  value={percent}
                  onChange={createNumberInputHandler(setPercent, 1, 100)}
                  className="input py-2"
                  min={1}
                  max={100}
                />
              </label>
              <label htmlFor={hoursId} className="flex flex-col gap-1 text-xs text-dark-500">
                {t(`${ns}.validHours`)}
                <input
                  id={hoursId}
                  type="number"
                  inputMode="numeric"
                  value={hours}
                  onChange={createNumberInputHandler(setHours, 1, 8760)}
                  className="input py-2"
                  min={1}
                  max={8760}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || percent === '' || hours === ''}
                className="btn-primary"
              >
                {t(`${ns}.sendOffer`)}
              </button>
              <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="btn-secondary self-start"
          >
            {t(`${ns}.balance.offerFormOpen`)}
          </button>
        ))}
    </Section>
  );
}
