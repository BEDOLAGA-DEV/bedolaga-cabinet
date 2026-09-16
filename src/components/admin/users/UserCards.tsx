import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { UserListItem } from '@/api/adminUsers';
import { backTo } from '@/components/admin/AdminBackButton';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/utils';
import { ONLINE_TICK_MS, isUserOnline } from './online';
import { RelativeTime } from './RelativeTime';
import { TrafficBar } from './TrafficBar';
import { UserAvatar } from './UserAvatar';
import { UserStatusChip } from './UserStatusChip';
import { extraTariffsCount, isMutedUser, subscriptionCaption } from './UsersTable';
import { useMoney } from './useMoney';

interface UserCardsProps {
  users: UserListItem[];
  className?: string;
}

/** Карточки для телефона: то же, что колонки таблицы. Чип статуса — единственное цветное пятно. */
export function UserCards({ users, className }: UserCardsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const money = useMoney();
  const now = useNow(ONLINE_TICK_MS);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {users.map((user) => {
        const caption = subscriptionCaption(user, t);
        return (
          <Link
            key={user.id}
            to={`/admin/users/${user.id}`}
            state={backTo(location).state}
            className="flex flex-col gap-2.5 rounded-2xl border border-dark-700/60 bg-dark-900/40 p-3.5 transition-colors active:bg-dark-800/60"
          >
            <div className="flex items-center gap-3">
              <UserAvatar
                firstName={user.first_name}
                username={user.username}
                muted={isMutedUser(user)}
                online={isUserOnline(user, now)}
              />
              <div className="min-w-0 flex-1">
                <div className="relative truncate font-medium text-dark-100">
                  {user.full_name}
                  {isUserOnline(user, now) && (
                    <span className="sr-only">, {t('admin.users.connectedNow')}</span>
                  )}
                </div>
                <div className="truncate text-xs tabular-nums text-dark-500">
                  {user.username ? `@${user.username} · ` : ''}
                  <span className="text-dark-400">{user.telegram_id}</span>
                </div>
              </div>
              <UserStatusChip user={user} />
            </div>

            {user.has_subscription && (
              <>
                <div className="flex min-w-0 items-baseline gap-1.5 text-sm">
                  {user.tariff_name && (
                    <span className="truncate font-medium text-dark-100">{user.tariff_name}</span>
                  )}
                  {extraTariffsCount(user) > 0 && (
                    <span className="shrink-0 rounded-full bg-dark-800 px-2 py-0.5 text-[11px] font-semibold text-dark-400">
                      {t('admin.users.moreTariffs', { count: extraTariffsCount(user) })}
                    </span>
                  )}
                  {caption && <span className="shrink-0 text-xs text-dark-500">· {caption}</span>}
                </div>
                <TrafficBar usedGb={user.traffic_used_gb} limitGb={user.traffic_limit_gb} />
              </>
            )}

            <div className="flex items-center justify-between gap-3">
              <RelativeTime value={user.last_activity} className="text-xs" />
              <span
                className={cn(
                  'text-sm font-medium tabular-nums',
                  user.balance_rubles > 0 ? 'text-dark-100' : 'text-dark-500',
                )}
              >
                {money(user.balance_rubles)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
