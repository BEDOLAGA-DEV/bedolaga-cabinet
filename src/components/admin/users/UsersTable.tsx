import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { UserListItem } from '@/api/adminUsers';
import { backTo } from '@/components/admin/AdminBackButton';
import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';
import { RelativeTime } from './RelativeTime';
import { TrafficBar } from './TrafficBar';
import { UserAvatar } from './UserAvatar';
import { UserStatusChip } from './UserStatusChip';
import { useMoney } from './useMoney';

interface UsersTableProps {
  users: UserListItem[];
  className?: string;
}

const GRID =
  'grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.45fr)_140px_120px_20px] items-center gap-4 px-4';

export function isMutedUser(user: Pick<UserListItem, 'status'>): boolean {
  return user.status === 'blocked' || user.status === 'deleted';
}

/** «до 20.09.2026» под тарифом; без подписки подписи нет — всё скажет чип. */
export function subscriptionCaption(
  user: Pick<UserListItem, 'has_subscription' | 'subscription_end_date'>,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (user.has_subscription && user.subscription_end_date) {
    return t('admin.users.until', { date: formatShortDate(user.subscription_end_date) });
  }
  return null;
}

/** Таблица для широких экранов; на телефоне вместо неё `UserCards`. */
export function UsersTable({ users, className }: UsersTableProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const money = useMoney();

  return (
    <div className={cn('rounded-2xl border border-dark-700/60 bg-dark-900/40', className)}>
      {/* Шапка прилипает под шапкой кабинета; скругления свои — у контейнера нет overflow. */}
      <div
        className={cn(
          GRID,
          'sticky top-[var(--sticky-top,0px)] z-10 h-10 rounded-t-2xl border-b border-dark-700/60 bg-dark-900 text-[11px] font-semibold uppercase tracking-wider text-dark-500',
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
              'group min-h-[68px] border-b border-dark-800/80 py-2.5 transition-colors last:rounded-b-2xl last:border-b-0 hover:bg-dark-800/40 focus-visible:bg-dark-800/40 focus-visible:outline-none',
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                firstName={user.first_name}
                username={user.username}
                muted={isMutedUser(user)}
                online={user.is_online === true}
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-dark-100">
                  {user.full_name}
                  {user.is_online && (
                    <span className="sr-only">, {t('admin.users.connectedNow')}</span>
                  )}
                </div>
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
                {caption && (
                  <span className="hidden shrink-0 text-xs text-dark-500 xl:inline">{caption}</span>
                )}
              </div>
              {user.has_subscription && (
                <TrafficBar
                  usedGb={user.traffic_used_gb}
                  limitGb={user.traffic_limit_gb}
                  barClassName="w-32 flex-none"
                />
              )}
            </div>

            <RelativeTime value={user.last_activity} />

            <span
              className={cn(
                'text-right text-sm font-medium tabular-nums',
                user.balance_rubles > 0 ? 'text-dark-100' : 'text-dark-500',
              )}
            >
              {money(user.balance_rubles)}
            </span>

            <ChevronRightIcon className="h-4 w-4 justify-self-end text-dark-600 transition-colors group-hover:text-dark-300" />
          </Link>
        );
      })}
    </div>
  );
}
