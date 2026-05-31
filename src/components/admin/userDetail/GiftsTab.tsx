import { useTranslation } from 'react-i18next';
import { SendIcon } from '@/components/icons';
import { useCurrency } from '../../../hooks/useCurrency';
import type { AdminUserGiftItem, AdminUserGiftsResponse } from '../../../api/adminUsers';

// ──────────────────────────────────────────────────────────────────
// Status badge
// ──────────────────────────────────────────────────────────────────

function GiftStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    pending: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    paid: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    delivered: 'bg-success-500/20 text-success-400 border-success-500/30',
    pending_activation: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    failed: 'bg-error-500/20 text-error-400 border-error-500/30',
    expired: 'bg-dark-600 text-dark-400 border-dark-500',
  };
  const fallback = 'bg-dark-600 text-dark-400 border-dark-500';

  const label = t(`admin.users.detail.gifts.status.${status}`, { defaultValue: '' }) || status;

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[status] || fallback}`}
    >
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Single gift card
// ──────────────────────────────────────────────────────────────────

function GiftCard({
  gift,
  direction,
  locale,
  onNavigateToUser,
}: {
  gift: AdminUserGiftItem;
  direction: 'sent' | 'received';
  locale: string;
  onNavigateToUser: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();
  const isSent = direction === 'sent';

  const otherPartyLabel = isSent
    ? t('admin.users.detail.gifts.recipient')
    : t('admin.users.detail.gifts.sender');
  const otherPartyName = isSent
    ? gift.receiver_username
      ? `@${gift.receiver_username}`
      : gift.gift_recipient_value || t('admin.users.detail.gifts.codeOnly')
    : gift.buyer_username
      ? `@${gift.buyer_username}`
      : gift.buyer_full_name || t('admin.users.detail.gifts.unknownUser');
  const otherPartyId = isSent ? gift.receiver_user_id : gift.buyer_user_id;

  const dateOpts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  return (
    <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-4 transition-colors hover:bg-dark-800/70">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSent ? 'bg-accent-500/15' : 'bg-success-500/15'}`}
          >
            <svg
              className={`h-4 w-4 ${isSent ? 'text-accent-400' : 'text-success-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-dark-100">{gift.tariff_name || '—'}</div>
            <div className="text-xs text-dark-500">
              {gift.period_days} {t('admin.users.detail.gifts.days')} · {gift.device_limit}{' '}
              {t('admin.users.detail.gifts.devices')}
            </div>
          </div>
        </div>
        <GiftStatusBadge status={gift.status} />
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-dark-500">{otherPartyLabel}:</span>{' '}
          <span className="text-dark-300">{otherPartyName}</span>
          {otherPartyId && (
            <button
              onClick={() => onNavigateToUser(otherPartyId)}
              className="ml-1 text-accent-400 hover:text-accent-300"
            >
              #{otherPartyId}
            </button>
          )}
        </div>
        <div>
          <span className="text-dark-500">{t('admin.users.detail.gifts.amount')}:</span>{' '}
          <span className="text-dark-300">{formatWithCurrency(gift.amount_kopeks / 100)}</span>
        </div>
        <div>
          <span className="text-dark-500">{t('admin.users.detail.gifts.paymentMethod')}:</span>{' '}
          <span className="text-dark-300">{gift.payment_method || '—'}</span>
        </div>
        <div>
          <span className="text-dark-500">{t('admin.users.detail.gifts.createdAt')}:</span>{' '}
          <span className="text-dark-300">
            {gift.created_at ? new Date(gift.created_at).toLocaleString(locale, dateOpts) : '—'}
          </span>
        </div>
        {gift.paid_at && (
          <div>
            <span className="text-dark-500">{t('admin.users.detail.gifts.paidAt')}:</span>{' '}
            <span className="text-dark-300">
              {new Date(gift.paid_at).toLocaleString(locale, dateOpts)}
            </span>
          </div>
        )}
        {gift.delivered_at && (
          <div>
            <span className="text-dark-500">{t('admin.users.detail.gifts.deliveredAt')}:</span>{' '}
            <span className="text-success-400">
              {new Date(gift.delivered_at).toLocaleString(locale, dateOpts)}
            </span>
          </div>
        )}
      </div>

      {/* Gift message */}
      {gift.gift_message && (
        <div className="mt-3 rounded-lg bg-dark-900/50 p-2.5 text-xs italic text-dark-400">
          &ldquo;{gift.gift_message}&rdquo;
        </div>
      )}

      {/* Token */}
      <div className="mt-2 font-mono text-[10px] text-dark-600">GIFT-{gift.token}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Tab — gifts list with sent + received sections
// ──────────────────────────────────────────────────────────────────

export interface GiftsTabProps {
  giftsLoading: boolean;
  giftsData: AdminUserGiftsResponse | null;
  locale: string;
  onNavigateToUser: (userId: number) => void;
}

export function GiftsTab({ giftsLoading, giftsData, locale, onNavigateToUser }: GiftsTabProps) {
  const { t } = useTranslation();

  if (giftsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!giftsData || (giftsData.sent.length === 0 && giftsData.received.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-dark-800/50 py-16">
        <svg
          className="mb-3 h-12 w-12 text-dark-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
        <p className="text-sm text-dark-500">{t('admin.users.detail.gifts.noGifts')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary counters */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-dark-800/50 p-4">
          <div className="mb-1 text-xs text-dark-500">
            {t('admin.users.detail.gifts.totalSent')}
          </div>
          <div className="text-2xl font-bold text-accent-400">{giftsData.sent_total}</div>
        </div>
        <div className="rounded-xl bg-dark-800/50 p-4">
          <div className="mb-1 text-xs text-dark-500">
            {t('admin.users.detail.gifts.totalReceived')}
          </div>
          <div className="text-2xl font-bold text-success-400">{giftsData.received_total}</div>
        </div>
      </div>

      {/* Sent Gifts */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dark-200">
          <SendIcon className="h-4 w-4 text-accent-400" />
          {t('admin.users.detail.gifts.sentTitle')}
          <span className="text-dark-500">({giftsData.sent_total})</span>
        </h3>
        {giftsData.sent.length === 0 ? (
          <div className="rounded-xl bg-dark-800/30 py-6 text-center text-sm text-dark-500">
            {t('admin.users.detail.gifts.noSent')}
          </div>
        ) : (
          <div className="space-y-2">
            {giftsData.sent.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                direction="sent"
                locale={locale}
                onNavigateToUser={onNavigateToUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Received Gifts */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-dark-200">
          <svg
            className="h-4 w-4 text-success-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859"
            />
          </svg>
          {t('admin.users.detail.gifts.receivedTitle')}
          <span className="text-dark-500">({giftsData.received_total})</span>
        </h3>
        {giftsData.received.length === 0 ? (
          <div className="rounded-xl bg-dark-800/30 py-6 text-center text-sm text-dark-500">
            {t('admin.users.detail.gifts.noReceived')}
          </div>
        ) : (
          <div className="space-y-2">
            {giftsData.received.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                direction="received"
                locale={locale}
                onNavigateToUser={onNavigateToUser}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
