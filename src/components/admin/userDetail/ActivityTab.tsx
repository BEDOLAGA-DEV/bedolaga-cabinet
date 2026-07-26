import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminUsersApi, type UserActivityItem } from '../../../api/adminUsers';
import {
  BanknotesIcon,
  BoltIcon,
  BotIcon,
  CabinetIcon,
  ChartBarIcon,
  ChatIcon,
  GiftIcon,
  HistoryIcon,
  PulseIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
  WalletIcon,
  WheelIcon,
} from '@/components/icons';
import { StatCard } from '@/components/stats';

// ──────────────────────────────────────────────────────────────────
// Activity tab — unified timeline of the user's actions in the bot
// and the cabinet (GET /cabinet/admin/users/{id}/activity).
// Self-contained: owns filter/paging state, parent only passes
// userId + formatDate (the house convention, see TicketsTab).
// ──────────────────────────────────────────────────────────────────

export interface ActivityTabProps {
  userId: number;
  formatDate: (date: string | null) => string;
}

const PAGE_SIZE = 25;

/** Filter chips → backend `types` CSV (null = no filter). */
const FILTERS: Array<{ key: string; types: string | null }> = [
  { key: 'all', types: null },
  { key: 'payments', types: 'transaction,withdrawal' },
  { key: 'events', types: 'event' },
  { key: 'promo', types: 'promocode,coupon,wheel_spin,poll' },
  { key: 'tickets', types: 'ticket' },
  { key: 'gifts', types: 'gift_sent,gift_received' },
  { key: 'referrals', types: 'referral_earning' },
  { key: 'clicks', types: 'button_click,cabinet_action' },
  { key: 'logins', types: 'cabinet_login' },
];

const TYPE_VISUALS: Record<string, { icon: typeof WalletIcon; tint: string }> = {
  transaction: { icon: WalletIcon, tint: 'bg-accent-500/15 text-accent-400' },
  event: { icon: PulseIcon, tint: 'bg-success-500/15 text-success-400' },
  promocode: { icon: TagIcon, tint: 'bg-warning-500/15 text-warning-400' },
  coupon: { icon: TicketIcon, tint: 'bg-warning-500/15 text-warning-400' },
  ticket: { icon: ChatIcon, tint: 'bg-error-500/15 text-error-400' },
  wheel_spin: { icon: WheelIcon, tint: 'bg-accent-500/15 text-accent-400' },
  poll: { icon: ChartBarIcon, tint: 'bg-success-500/15 text-success-400' },
  gift_sent: { icon: GiftIcon, tint: 'bg-warning-500/15 text-warning-400' },
  gift_received: { icon: GiftIcon, tint: 'bg-success-500/15 text-success-400' },
  referral_earning: { icon: UsersIcon, tint: 'bg-success-500/15 text-success-400' },
  cabinet_login: { icon: CabinetIcon, tint: 'bg-dark-700/60 text-dark-300' },
  withdrawal: { icon: BanknotesIcon, tint: 'bg-error-500/15 text-error-400' },
  button_click: { icon: BotIcon, tint: 'bg-dark-700/60 text-dark-300' },
  cabinet_action: { icon: BoltIcon, tint: 'bg-dark-700/60 text-dark-300' },
};

const FALLBACK_VISUAL = { icon: HistoryIcon, tint: 'bg-dark-700/60 text-dark-300' };

/** Transaction subtypes displayed as an expense (red, minus sign). */
const EXPENSE_SUBTYPES = new Set(['withdrawal', 'subscription_payment', 'gift_payment']);

function formatRelativeTime(
  dateString: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('admin.auditLog.time.justNow');
  if (diffMin < 60) return t('admin.auditLog.time.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('admin.auditLog.time.hoursAgo', { count: diffHour });
  if (diffDay < 30) return t('admin.auditLog.time.daysAgo', { count: diffDay });
  return date.toLocaleDateString();
}

function SubtypeBadge({ subtype }: { subtype: string }) {
  const { t } = useTranslation();
  const label =
    t(`admin.users.detail.activity.subtypes.${subtype}`, { defaultValue: '' }) || subtype;
  return (
    <span className="rounded-full border border-dark-600/60 bg-dark-700/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-dark-300">
      {label}
    </span>
  );
}

function AmountChip({ item }: { item: UserActivityItem }) {
  if (item.amount_kopeks == null || item.amount_kopeks === 0) return null;

  const rubles = Math.abs(item.amount_kopeks) / 100;
  const isExpense =
    item.type === 'withdrawal' ||
    (item.type === 'transaction' && item.subtype != null && EXPENSE_SUBTYPES.has(item.subtype)) ||
    item.type === 'gift_sent';
  const sign = isExpense ? '−' : '+';
  const tone = isExpense ? 'text-error-400' : 'text-success-400';

  return (
    <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone}`}>
      {sign}
      {rubles.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₽
    </span>
  );
}

export function ActivityTab({ userId, formatDate }: ActivityTabProps) {
  const { t } = useTranslation();

  const [filter, setFilter] = useState<string>('all');
  const [items, setItems] = useState<UserActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const activeTypes = FILTERS.find((f) => f.key === filter)?.types ?? null;

  const load = useCallback(
    async (loadOffset = 0, append = false) => {
      if (!userId) return;
      try {
        setLoading(true);
        const data = await adminUsersApi.getUserActivity(
          userId,
          loadOffset,
          PAGE_SIZE,
          activeTypes ?? undefined,
        );
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setOffset(loadOffset + data.items.length);
      } catch {
        // background list load — silent, консистентно с остальной карточкой
      } finally {
        setLoading(false);
        setInitialLoaded(true);
      }
    },
    [userId, activeTypes],
  );

  useEffect(() => {
    setItems([]);
    setInitialLoaded(false);
    void load(0, false);
  }, [load]);

  return (
    <div className="space-y-4">
      <StatCard
        label={t('admin.users.detail.activity.total')}
        value={total}
        icon={<HistoryIcon className="h-5 w-5" />}
        tone="accent"
        loading={!initialLoaded && loading}
      />

      {/* Filter chips */}
      <div
        className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {FILTERS.map(({ key }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filter === key
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 active:bg-dark-700'
            }`}
          >
            {t(`admin.users.detail.activity.filters.${key}`)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {!initialLoaded && loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl bg-dark-800/50 py-12">
          <HistoryIcon className="mb-3 h-12 w-12 text-dark-600" />
          <p className="text-dark-400">{t('admin.users.detail.activity.empty')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/30 p-4">
          {items.map((item, index) => {
            const visual = TYPE_VISUALS[item.type] || FALLBACK_VISUAL;
            const Icon = visual.icon;
            const typeLabel =
              t(`admin.users.detail.activity.types.${item.type}`, { defaultValue: '' }) ||
              item.type;
            const isLast = index === items.length - 1;

            return (
              <div key={`${item.type}-${item.timestamp}-${index}`} className="flex gap-3">
                {/* Icon column + connecting line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.tint}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-dark-700/50" />}
                </div>

                {/* Content */}
                <div className={`min-w-0 flex-1 ${isLast ? '' : 'pb-4'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-dark-100">{typeLabel}</span>
                      {item.subtype && <SubtypeBadge subtype={item.subtype} />}
                      {item.source && (
                        <span className="rounded-full bg-dark-700/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-dark-500">
                          {t(`admin.users.detail.activity.sources.${item.source}`, {
                            defaultValue: item.source,
                          })}
                        </span>
                      )}
                    </div>
                    <AmountChip item={item} />
                  </div>
                  {item.title && (
                    <p className="mt-0.5 break-words text-sm text-dark-400" title={item.title}>
                      {item.title.length > 160 ? `${item.title.slice(0, 160)}…` : item.title}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-dark-500" title={formatDate(item.timestamp)}>
                    {formatRelativeTime(item.timestamp, t)}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Load more */}
          {items.length < total && (
            <button
              onClick={() => void load(offset, true)}
              disabled={loading}
              className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-dark-700/50 py-2.5 text-sm text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              ) : (
                t('admin.users.detail.loadMore')
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
