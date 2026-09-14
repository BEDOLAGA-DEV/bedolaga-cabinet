import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { UserListItem } from '@/api/adminUsers';
import { backTo } from '@/components/admin/AdminBackButton';
import { ChevronRightIcon } from '@/components/icons';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';
import { RelativeTime } from './RelativeTime';
import { TrafficBar } from './TrafficBar';
import { UserAvatar } from './UserAvatar';
import { UserStatusChip } from './UserStatusChip';

interface UsersTableProps {
  users: UserListItem[];
  className?: string;
}

const GRID =
  'grid grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_150px_120px_32px] items-center gap-4 px-4';

export function isMutedUser(user: Pick<UserListItem, 'status'>): boolean {
  return user.status === 'blocked' || user.status === 'deleted';
}

/** Строка подписи под тарифом: «до 20.09.2026»; без подписки — что человек ни разу не покупал. */
export function subscriptionCaption(
  user: Pick<UserListItem, 'has_subscription' | 'subscription_end_date' | 'purchase_count'>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (user.has_subscription && user.subscription_end_date) {
    return t('admin.users.until', { date: formatShortDate(user.subscription_end_date) });
  }
  if (!user.has_subscription && user.purchase_count === 0) return t('admin.users.noPurchases');
  return null;
}

/** Таблица для широких экранов; на телефоне вместо неё `UserCards`. */
export function UsersTable({ users, className }: UsersTableProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { formatWithCurrency } = useCurrency();

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-dark-700/60 bg-dark-900/40',
        className,
      )}
    >
      <div
        className={cn(
          GRID,
          'h-10 border-b border-dark-700/60 bg-dark-900 text-[11px] font-semibold uppercase tracking-wider text-dark-500',
        )}
      >
        <span>{t('admin.users.columns.user')}</span>
        <span>{t('admin.users.columns.subscription')}</span>
        <span>{t('admin.users.columns.activity')}</span>
        <span className="text-right">{t('admin.users.columns.balance')}</span>
        <span />
      </div>
      {users.map((user) => {
        const caption = subscriptionCaption(user, t);
        return (
          <Link
            key={user.id}
            to={`/admin/users/${user.id}`}
            state={backTo(location).state}
            className={cn(
              GRID,
              'min-h-[68px] border-b border-dark-800/80 py-2.5 transition-colors last:border-b-0 hover:bg-dark-800/40 focus-visible:bg-dark-800/40 focus-visible:outline-none',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                firstName={user.first_name}
                username={user.username}
                muted={isMutedUser(user)}
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-dark-100">{user.full_name}</div>
                <div className="truncate text-xs tabular-nums text-dark-500">
                  {user.username ? `@${user.username} · ` : ''}
                  <span className="text-dark-400">{user.telegram_id}</span>
                  {user.promo_group_name ? ` · ${user.promo_group_name}` : ''}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                {user.has_subscription && user.tariff_name && (
                  <span className="truncate text-sm font-medium text-dark-100">
                    {user.tariff_name}
                  </span>
                )}
                <UserStatusChip user={user} />
              </div>
              {user.has_subscription ? (
                <div className="flex min-w-0 items-center gap-3">
                  <TrafficBar
                    usedGb={user.traffic_used_gb}
                    limitGb={user.traffic_limit_gb}
                    className="max-w-[240px]"
                  />
                  {caption && (
                    <span className="hidden shrink-0 text-xs text-dark-500 xl:inline">
                      {caption}
                    </span>
                  )}
                </div>
              ) : (
                caption && <span className="text-xs text-dark-500">{caption}</span>
              )}
            </div>

            <RelativeTime value={user.last_activity} />

            <span
              className={cn(
                'text-right text-sm font-medium tabular-nums',
                user.balance_rubles > 0 ? 'text-dark-100' : 'text-dark-500',
              )}
            >
              {formatWithCurrency(user.balance_rubles)}
            </span>

            <ChevronRightIcon className="h-4 w-4 justify-self-end text-dark-500" />
          </Link>
        );
      })}
    </div>
  );
}
