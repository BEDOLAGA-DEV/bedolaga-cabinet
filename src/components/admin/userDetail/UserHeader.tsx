import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { UserDetailResponse, UserPanelInfo, UserSubscriptionInfo } from '@/api/adminUsers';
import { AdminBackButton } from '@/components/admin/AdminBackButton';
import { AccountStatusChip, UserAvatar } from '@/components/admin/users';
import { CopyIcon, RefreshIcon, TelegramSmallIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useNotify } from '@/platform/hooks/useNotify';
import { copyToClipboard } from '@/utils/clipboard';
import { formatShortDate } from '@/utils/format';
import { relativeTimeParts } from '@/utils/relativeTime';

interface UserHeaderProps {
  user: UserDetailResponse;
  subscription: UserSubscriptionInfo | null;
  panelInfo: UserPanelInfo | null;
  refreshing: boolean;
  onRefresh: () => void;
  /** Кнопки действий: «Написать», «Продлить», «Начислить», меню «⋯». */
  actions?: ReactNode;
}

/**
 * Шапка карточки отвечает на первые вопросы поддержки, не заставляя листать:
 * кто это, в каком состоянии аккаунт и подписка, онлайн ли сейчас.
 */
export function UserHeader({
  user,
  subscription,
  panelInfo,
  refreshing,
  onRefresh,
  actions,
}: UserHeaderProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const online = relativeTimeParts(panelInfo?.online_at ?? null);
  const muted = user.status === 'blocked' || user.status === 'deleted';

  const copy = async (value: string) => {
    try {
      await copyToClipboard(value);
      notify.success(t('admin.users.detail.copied'));
    } catch {
      notify.error(t('common.error'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AdminBackButton to="/admin/users" />
        <UserAvatar
          firstName={user.first_name}
          username={user.username}
          muted={muted}
          size="lg"
          className="hidden sm:flex"
        />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-dark-100">{user.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dark-400">
            {user.telegram_id > 0 && (
              <CopyValue
                icon={<TelegramSmallIcon className="h-3.5 w-3.5" />}
                value={String(user.telegram_id)}
                onCopy={copy}
                label={t('admin.users.detail.header.copy')}
              />
            )}
            {user.username && (
              <CopyValue
                value={`@${user.username}`}
                onCopy={copy}
                label={t('admin.users.detail.header.copy')}
              />
            )}
            {user.email && (
              <span className="inline-flex items-center gap-1">
                <span className="truncate">{user.email}</span>
                <span
                  className={cn(
                    'text-xs',
                    user.email_verified ? 'text-dark-500' : 'text-warning-400',
                  )}
                >
                  ·{' '}
                  {user.email_verified
                    ? t('admin.users.detail.header.emailVerified')
                    : t('admin.users.detail.header.emailUnverified')}
                </span>
              </span>
            )}
            <span>{t(`languages.${user.language}`)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AccountStatusChip status={user.status} />
            {subscription && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-400">
                {t('admin.users.detail.header.tariffUntil', {
                  tariff:
                    subscription.tariff_name ?? t('admin.users.detail.subscription.notSpecified'),
                  date: formatShortDate(subscription.end_date),
                })}
              </span>
            )}
            {user.promo_group && (
              <span className="inline-flex items-center whitespace-nowrap rounded-full bg-dark-800 px-2 py-0.5 text-[11px] font-semibold text-dark-400">
                {user.promo_group.name}
              </span>
            )}
            {online.isOnline && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-success-500/15 px-2 py-0.5 text-[11px] font-semibold text-success-400">
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-success-400 shadow-[0_0_6px_rgba(var(--color-success-400),0.6)]"
                />
                {panelInfo?.last_connected_node_name
                  ? t('admin.users.detail.header.onlineAt', {
                      node: panelInfo.last_connected_node_name,
                    })
                  : t('common.relative.online')}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label={t('common.refresh')}
          className="btn-ghost shrink-0 p-2"
        >
          <RefreshIcon className={cn('h-5 w-5', refreshing && 'animate-spin')} />
        </button>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface CopyValueProps {
  value: string;
  onCopy: (value: string) => void;
  label: string;
  icon?: ReactNode;
}

function CopyValue({ value, onCopy, label, icon }: CopyValueProps) {
  return (
    <button
      type="button"
      onClick={() => onCopy(value.replace(/^@/, ''))}
      title={label}
      className="group inline-flex items-center gap-1 rounded-md text-dark-300 transition-colors hover:text-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
    >
      {icon}
      <span className="tabular-nums">{value}</span>
      <CopyIcon className="h-3.5 w-3.5 text-dark-600 transition-colors group-hover:text-dark-300" />
    </button>
  );
}
