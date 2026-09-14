import { useTranslation } from 'react-i18next';
import type { UserListItem } from '@/api/adminUsers';
import { cn } from '@/lib/utils';

export type ChipTone = 'success' | 'warning' | 'error' | 'accent' | 'neutral';

const TONE: Record<ChipTone, string> = {
  success: 'bg-success-500/15 text-success-400',
  warning: 'bg-warning-500/15 text-warning-400',
  error: 'bg-error-500/15 text-error-400',
  accent: 'bg-accent-500/15 text-accent-400',
  neutral: 'bg-dark-800 text-dark-400',
};

/** Сколько дней осталось считать «скоро истекает» — окрашивает чип в предупреждение. */
export const SOON_DAYS = 7;
const DAY_MS = 86_400_000;

export type StatusSource = Pick<
  UserListItem,
  | 'status'
  | 'has_subscription'
  | 'subscription_status'
  | 'subscription_is_trial'
  | 'days_remaining'
  | 'subscription_end_date'
>;

export interface StatusDescription {
  /** Ключ внутри `admin.users.*`. */
  key: string;
  tone: ChipTone;
  count?: number;
}

/**
 * Один чип на строку: сначала состояние аккаунта (заблокирован, удалён),
 * потом подписки. Сырые значения базы («blocked», «limited») на экран не попадают —
 * только словарь локалей в единственном числе.
 */
export function describeUserStatus(
  user: StatusSource,
  now: number = Date.now(),
): StatusDescription {
  if (user.status === 'blocked') return { key: 'statuses.blocked', tone: 'error' };
  if (user.status === 'deleted') return { key: 'statuses.deleted', tone: 'neutral' };
  if (!user.has_subscription || !user.subscription_status) {
    return { key: 'statuses.noSubscription', tone: 'neutral' };
  }
  const days = Math.max(0, user.days_remaining ?? 0);
  switch (user.subscription_status) {
    case 'trial':
      return { key: 'subscriptionChips.trial', tone: 'accent', count: days };
    case 'limited':
      return { key: 'subscriptionChips.limited', tone: 'warning' };
    case 'expired': {
      if (!user.subscription_end_date)
        return { key: 'subscriptionChips.expiredToday', tone: 'error' };
      const ago = Math.floor((now - new Date(user.subscription_end_date).getTime()) / DAY_MS);
      return ago <= 0
        ? { key: 'subscriptionChips.expiredToday', tone: 'error' }
        : { key: 'subscriptionChips.expiredAgo', tone: 'error', count: ago };
    }
    case 'active':
      if (days === 0) return { key: 'subscriptionChips.today', tone: 'warning' };
      return {
        key: 'subscriptionChips.daysLeft',
        tone: days <= SOON_DAYS ? 'warning' : 'success',
        count: days,
      };
    case 'disabled':
      return { key: 'statuses.disabled', tone: 'neutral' };
    case 'pending':
      return { key: 'statuses.pending', tone: 'neutral' };
    default:
      return { key: 'statuses.other', tone: 'neutral' };
  }
}

export function UserStatusChip({ user, className }: { user: StatusSource; className?: string }) {
  const { t } = useTranslation();
  const { key, tone, count } = describeUserStatus(user);
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONE[tone],
        className,
      )}
    >
      {t(`admin.users.${key}`, { count })}
    </span>
  );
}

/** Чип аккаунта в шапке карточки — статус пользователя без подписочной части. */
export function AccountStatusChip({ status, className }: { status: string; className?: string }) {
  const { t } = useTranslation();
  const tone: ChipTone =
    status === 'active' ? 'success' : status === 'blocked' ? 'error' : 'neutral';
  const key =
    status === 'active' || status === 'blocked' || status === 'deleted' ? status : 'other';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONE[tone],
        className,
      )}
    >
      {t(`admin.users.statuses.${key}`)}
    </span>
  );
}

export const SUBSCRIPTION_STATE_TONE: Record<string, ChipTone> = {
  active: 'success',
  trial: 'accent',
  limited: 'warning',
  expired: 'error',
  disabled: 'neutral',
  pending: 'neutral',
};

/** Состояние подписки словом: «Активна», «Триал», «Трафик исчерпан», «Истекла». */
export function SubscriptionStateChip({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const known = status in SUBSCRIPTION_STATE_TONE;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        TONE[SUBSCRIPTION_STATE_TONE[status] ?? 'neutral'],
        className,
      )}
    >
      {t(`admin.users.subscriptionState.${known ? status : 'other'}`)}
    </span>
  );
}
