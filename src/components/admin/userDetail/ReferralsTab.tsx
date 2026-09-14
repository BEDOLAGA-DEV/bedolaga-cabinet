import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminUsersApi, type UserDetailResponse } from '@/api/adminUsers';
import { backTo } from '@/components/admin/AdminBackButton';
import { SubscriptionStateChip, UserAvatar, useMoney } from '@/components/admin/users';
import { CopyIcon, LinkIcon, UsersIcon, WalletIcon, XIcon } from '@/components/icons';
import { StatCard } from '@/components/stats';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useNotify } from '@/platform/hooks/useNotify';
import { useDestructiveConfirm } from '@/platform/hooks/useNativeDialog';
import { copyToClipboard } from '@/utils/clipboard';
import { formatShortDate } from '@/utils/format';
import { UserPicker } from './UserPicker';
import { KeyValues, LinkAction, Section } from './sectionParts';
import { useAdminAction } from './useAdminAction';

export interface ReferralsTabProps {
  user: UserDetailResponse;
  userId: number;
  canEdit: boolean;
  onUserRefresh: () => Promise<unknown>;
}

const LIST_LIMIT = 100;

/**
 * «Рефералы»: цифры программы, кто пригласил этого человека, его рефералы
 * и комиссия. Снятие связей подтверждается — вернуть их можно только вручную.
 */
export function ReferralsTab({ user, userId, canEdit, onUserRefresh }: ReferralsTabProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const notify = useNotify();
  const money = useMoney();
  const confirmDestructive = useDestructiveConfirm();
  const { busy, run } = useAdminAction();
  const [picker, setPicker] = useState<'referrer' | 'referral' | null>(null);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const ns = 'admin.users.detail.referrals';
  const referral = user.referral;

  const listQuery = useQuery({
    queryKey: ['admin-user-referrals-list', userId] as const,
    queryFn: () => adminUsersApi.getReferrals(userId, 0, LIST_LIMIT),
  });
  const referrals = listQuery.data?.users ?? [];
  const refreshAll = () => Promise.all([onUserRefresh(), listQuery.refetch()]);
  const excludeIds = new Set([userId, ...referrals.map((item) => item.id)]);

  const copyCode = async () => {
    try {
      await copyToClipboard(referral.referral_code);
      notify.success(t('admin.users.detail.copied'));
    } catch {
      notify.error(t('common.error'));
    }
  };

  const removeReferrer = async () => {
    const ok = await confirmDestructive(
      t(`${ns}.confirmRemoveReferrer`),
      t(`${ns}.removeReferrer`),
    );
    if (ok)
      await run(() => adminUsersApi.removeReferrer(userId), {
        success: t(`${ns}.referrerRemoved`),
        after: onUserRefresh,
      });
  };

  const removeReferral = async (id: number, name: string) => {
    const ok = await confirmDestructive(
      t(`${ns}.confirmRemoveReferral`, { name }),
      t(`${ns}.removeReferral`),
    );
    if (ok)
      await run(() => adminUsersApi.removeReferral(userId, id), {
        success: t(`${ns}.referralRemoved`),
        after: refreshAll,
      });
  };

  const commissionLabel =
    referral.commission_percent != null ? `${referral.commission_percent} %` : t(`${ns}.default`);

  return (
    <Section
      icon={<UsersIcon className="h-5 w-5" />}
      title={t('admin.users.detail.referral.title')}
    >
      {/* Те же плитки StatCard с иконками, что над вкладками карточки. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label={t(`${ns}.invited`)}
          value={referral.referrals_count}
          icon={<UsersIcon />}
          tone="accent"
          valueClassName="text-dark-100 tabular-nums"
        />
        <StatCard
          label={t(`${ns}.earned`)}
          value={money(referral.total_earnings_kopeks / 100)}
          icon={<WalletIcon />}
          tone={referral.total_earnings_kopeks > 0 ? 'success' : 'neutral'}
          valueClassName="text-dark-100 tabular-nums"
        />
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <StatCard
            label={t(`${ns}.code`)}
            value={referral.referral_code}
            icon={<LinkIcon />}
            tone="neutral"
            valueClassName="font-mono text-base text-dark-100 sm:text-lg"
            trailing={
              <button
                type="button"
                onClick={() => void copyCode()}
                aria-label={t('common.copy')}
                title={t('common.copy')}
                className="-m-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-dark-500 transition-colors hover:bg-dark-700/60 hover:text-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
              >
                <CopyIcon className="h-4 w-4" />
              </button>
            }
          />
        </div>
      </div>

      <KeyValues
        rows={[
          {
            key: 'referrer',
            label: t(`${ns}.referredBy`),
            value: referral.referred_by_id ? (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                <Link
                  to={`/admin/users/${referral.referred_by_id}`}
                  state={backTo(location).state}
                  className="text-accent-400 hover:text-accent-300"
                >
                  {referral.referred_by_username
                    ? `@${referral.referred_by_username}`
                    : `#${referral.referred_by_id}`}
                </Link>
                {canEdit && (
                  <LinkAction onClick={() => void removeReferrer()} disabled={busy}>
                    {t(`${ns}.removeReferrer`)}
                  </LinkAction>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-x-2">
                <span className="text-dark-500">—</span>
                {canEdit && picker !== 'referrer' && (
                  <LinkAction onClick={() => setPicker('referrer')}>{t(`${ns}.assign`)}</LinkAction>
                )}
              </span>
            ),
          },
          {
            // Комиссия — строкой, а не ссылкой в заголовке: на телефоне она выталкивала
            // название секции до «Реф…».
            key: 'commission',
            label: t(`${ns}.commission`),
            value: (
              <span className="inline-flex flex-wrap items-center gap-x-2">
                {commissionLabel}
                {canEdit && !commissionOpen && (
                  <LinkAction onClick={() => setCommissionOpen(true)}>
                    {t('admin.users.detail.overview.change')}
                  </LinkAction>
                )}
              </span>
            ),
          },
        ]}
      />
      {commissionOpen && (
        <CommissionEditor
          current={referral.commission_percent}
          busy={busy}
          onClose={() => setCommissionOpen(false)}
          onSave={(percent) =>
            run(() => adminUsersApi.updateReferralCommission(userId, percent), {
              success: t(`${ns}.commissionSaved`),
              after: onUserRefresh,
            })
          }
        />
      )}
      {picker === 'referrer' && (
        <UserPicker
          excludeIds={excludeIds}
          busy={busy}
          onClose={() => setPicker(null)}
          onPick={async (target) => {
            const done = await run(() => adminUsersApi.assignReferrer(userId, target.id), {
              success: t(`${ns}.referrerAssigned`),
              after: onUserRefresh,
            });
            if (done) setPicker(null);
          }}
        />
      )}

      {listQuery.isLoading ? (
        <SkeletonGroup className="space-y-2">
          <Skeleton variant="line" count={3} className="h-12" />
        </SkeletonGroup>
      ) : referrals.length === 0 ? (
        <p className="text-sm text-dark-500">{t(`${ns}.noReferrals`)}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
          {referrals.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <span className="w-11 shrink-0 font-mono text-xs tabular-nums text-dark-500">
                {formatShortDate(item.created_at).slice(0, 5)}
              </span>
              <UserAvatar
                firstName={item.first_name}
                username={item.username}
                size="sm"
                className="hidden sm:flex"
              />
              <Link
                to={`/admin/users/${item.id}`}
                state={backTo(location).state}
                className="min-w-0 flex-1"
              >
                <span className="block truncate text-sm text-dark-100 hover:text-accent-400">
                  {item.full_name}
                </span>
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-dark-500">
                  <span className="truncate">
                    {[item.username ? `@${item.username}` : null, item.tariff_name]
                      .filter(Boolean)
                      .join(' · ') || item.telegram_id}
                  </span>
                  {item.has_subscription && item.subscription_status && (
                    <SubscriptionStateChip status={item.subscription_status} />
                  )}
                </span>
              </Link>
              <span
                className="shrink-0 text-sm font-medium tabular-nums text-dark-200"
                title={t(`${ns}.spentHint`)}
              >
                {money(item.total_spent_kopeks / 100)}
              </span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => void removeReferral(item.id, item.full_name)}
                  disabled={busy}
                  aria-label={t(`${ns}.removeReferral`)}
                  className="btn-ghost shrink-0 p-2 hover:text-error-400"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (picker === 'referral' ? (
          <UserPicker
            excludeIds={excludeIds}
            busy={busy}
            onClose={() => setPicker(null)}
            onPick={async (target) => {
              const done = await run(() => adminUsersApi.assignReferrer(target.id, userId), {
                success: t(`${ns}.referralAdded`),
                after: refreshAll,
              });
              if (done) setPicker(null);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPicker('referral')}
            className="btn-secondary self-start"
          >
            {t(`${ns}.addReferral`)}…
          </button>
        ))}
    </Section>
  );
}

function CommissionEditor({
  current,
  busy,
  onSave,
  onClose,
}: {
  current: number | null;
  busy: boolean;
  onSave: (percent: number | null) => Promise<boolean>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const notify = useNotify();
  const id = useId();
  const [value, setValue] = useState(current != null ? String(current) : '');
  const ns = 'admin.users.detail';

  const save = async () => {
    const parsed = value.trim() === '' ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0 || parsed > 100)) {
      notify.error(t(`${ns}.referral.invalidPercent`), t('common.error'));
      return;
    }
    if (await onSave(parsed)) onClose();
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3">
      <label htmlFor={id} className="flex flex-col gap-1 text-xs text-dark-500">
        {t(`${ns}.referrals.commissionPercent`)}
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t(`${ns}.referrals.default`)}
          className="input w-28 py-2"
        />
      </label>
      <button type="button" onClick={() => void save()} disabled={busy} className="btn-primary">
        {t('common.save')}
      </button>
      <button type="button" onClick={onClose} className="btn-ghost">
        {t('common.cancel')}
      </button>
    </div>
  );
}
