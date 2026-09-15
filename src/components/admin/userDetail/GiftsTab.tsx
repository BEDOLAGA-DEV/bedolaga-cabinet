import { useTranslation } from 'react-i18next';
import type { AdminUserGiftItem, AdminUserGiftsResponse } from '@/api/adminUsers';
import { dayTimeLabel, useMoney } from '@/components/admin/users';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePaymentMethodLabel } from './ActivityRows';

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-warning-500/15 text-warning-400',
  paid: 'bg-accent-500/15 text-accent-400',
  pending_activation: 'bg-accent-500/15 text-accent-400',
  delivered: 'bg-success-500/15 text-success-400',
  failed: 'bg-error-500/15 text-error-400',
  expired: 'bg-dark-800 text-dark-400',
};

function GiftRow({
  gift,
  direction,
  onNavigateToUser,
}: {
  gift: AdminUserGiftItem;
  direction: 'sent' | 'received';
  onNavigateToUser: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const money = useMoney();
  const methodLabel = usePaymentMethodLabel();
  const ns = 'admin.users.detail.gifts';
  const sent = direction === 'sent';
  const partyName = sent
    ? gift.receiver_username
      ? `@${gift.receiver_username}`
      : gift.gift_recipient_value || t(`${ns}.codeOnly`)
    : gift.buyer_username
      ? `@${gift.buyer_username}`
      : gift.buyer_full_name || t(`${ns}.unknownUser`);
  const partyId = sent ? gift.receiver_user_id : gift.buyer_user_id;
  const statusLabel = t(`${ns}.status.${gift.status}`, { defaultValue: '' });
  const method = gift.payment_method ? methodLabel(gift.payment_method) : null;

  return (
    <li className="flex flex-col gap-1 py-2.5" title={`GIFT-${gift.token}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-100">
          {[gift.tariff_name, t(`${ns}.periodValue`, { count: gift.period_days })]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {statusLabel && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              STATUS_TONE[gift.status] ?? STATUS_TONE.expired,
            )}
          >
            {statusLabel}
          </span>
        )}
        {gift.amount_kopeks > 0 && (
          <span className="shrink-0 text-sm font-medium tabular-nums text-dark-200">
            {money(gift.amount_kopeks / 100)}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-dark-500">
        <span>{sent ? t(`${ns}.to`) : t(`${ns}.from`)}</span>
        {partyId ? (
          <button
            type="button"
            onClick={() => onNavigateToUser(partyId)}
            className="text-accent-400 hover:text-accent-300"
          >
            {partyName}
          </button>
        ) : (
          <span className="text-dark-300">{partyName}</span>
        )}
        {gift.created_at && <span>· {dayTimeLabel(gift.created_at, t)}</span>}
        {method && <span>· {method}</span>}
      </div>
      {gift.gift_message && (
        <p className="m-0 truncate text-xs italic text-dark-400">«{gift.gift_message}»</p>
      )}
    </li>
  );
}

export interface GiftsTabProps {
  giftsLoading: boolean;
  giftsData: AdminUserGiftsResponse | null;
  onNavigateToUser: (userId: number) => void;
}

/** Подарки человека: отправленные и полученные, по строке на подарок. */
export function GiftsTab({ giftsLoading, giftsData, onNavigateToUser }: GiftsTabProps) {
  const { t } = useTranslation();
  const ns = 'admin.users.detail.gifts';

  if (giftsLoading) {
    return (
      <SkeletonGroup className="space-y-2">
        <Skeleton variant="line" count={3} className="h-12" />
      </SkeletonGroup>
    );
  }
  if (!giftsData || (giftsData.sent.length === 0 && giftsData.received.length === 0)) {
    return <p className="text-sm text-dark-500">{t(`${ns}.noGifts`)}</p>;
  }

  const groups = [
    {
      key: 'sent' as const,
      title: t(`${ns}.sentTitle`),
      total: giftsData.sent_total,
      items: giftsData.sent,
    },
    {
      key: 'received' as const,
      title: t(`${ns}.receivedTitle`),
      total: giftsData.received_total,
      items: giftsData.received,
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key}>
          <h3 className="mb-1 text-sm font-semibold text-dark-200">
            {group.title}{' '}
            <span className="font-normal tabular-nums text-dark-500">{group.total}</span>
          </h3>
          <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
            {group.items.map((gift) => (
              <GiftRow
                key={gift.id}
                gift={gift}
                direction={group.key}
                onNavigateToUser={onNavigateToUser}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
