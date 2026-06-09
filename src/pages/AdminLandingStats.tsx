import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Cell, Funnel, FunnelChart, LabelList, ResponsiveContainer } from 'recharts';
import {
  adminLandingsApi,
  resolveLocaleDisplay,
  type PurchaseItemStatus,
  type LandingPurchaseItem,
} from '../api/landings';
import { useCurrency } from '../hooks/useCurrency';
import { CHART_COMMON } from '../constants/charts';
import { AdminBackButton } from '../components/admin';
import { StatCard } from '../components/stats';
import { BreakdownList } from '../components/sales-stats/BreakdownList';
import { DonutChart } from '../components/sales-stats/DonutChart';
import { SimpleAreaChart } from '../components/sales-stats/SimpleAreaChart';
import { MultiSeriesAreaChart } from '../components/sales-stats/MultiSeriesAreaChart';
import {
  ChartIcon,
  EmailIcon,
  TelegramSmallIcon,
  ArrowRightIcon,
  GiftIcon,
  EyeIcon,
  CheckCircleIcon,
  BanknotesIcon,
  PercentIcon,
  TicketIcon,
  CardIcon,
  WalletIcon,
  ChevronLeftIcon as ChevronLeftSmall,
  ChevronRightIcon as ChevronRightSmall,
} from '@/components/icons';

const FUNNEL_COLORS = ['#f59e0b', '#34d399'];
const GIFT_DONUT = { regular: '#818cf8', gift: '#a855f7' };

const PURCHASE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning-500/20 text-warning-400',
  paid: 'bg-accent-500/20 text-accent-400',
  delivered: 'bg-success-500/20 text-success-400',
  pending_activation: 'bg-accent-500/20 text-accent-400',
  failed: 'bg-error-500/20 text-error-400',
  expired: 'bg-dark-500/20 text-dark-400',
};

const PURCHASE_STATUS_OPTIONS: Array<PurchaseItemStatus | 'all'> = [
  'all',
  'pending',
  'paid',
  'delivered',
  'pending_activation',
  'failed',
  'expired',
];

const PURCHASES_PAGE_SIZE = 20;

// Contact display helper
function ContactDisplay({ type, value }: { type: 'email' | 'telegram'; value: string }) {
  return (
    <span className="flex items-center gap-1 text-dark-300">
      {type === 'email' ? (
        <EmailIcon className="h-3.5 w-3.5" />
      ) : (
        <TelegramSmallIcon className="h-3.5 w-3.5" />
      )}
      <span className="min-w-0 truncate text-xs">{value}</span>
    </span>
  );
}

// Purchase card component
interface PurchaseCardProps {
  item: LandingPurchaseItem;
  formatPrice: (kopeks: number) => string;
  lang: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function PurchaseCard({ item, formatPrice, lang, t }: PurchaseCardProps) {
  const statusStyle = PURCHASE_STATUS_STYLES[item.status] || 'bg-dark-600 text-dark-300';
  const dateStr = new Date(item.created_at).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeStr = new Date(item.created_at).toLocaleTimeString(lang, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const referrerHost = item.referrer
    ? (() => {
        try {
          return new URL(item.referrer).hostname;
        } catch {
          return item.referrer;
        }
      })()
    : null;

  return (
    <div className="rounded-xl border border-dark-700/50 bg-dark-800/40 p-3 transition-colors hover:border-dark-600 sm:p-4">
      {/* Mobile: stacked | Desktop: horizontal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        {/* Status badge */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusStyle}`}
          >
            {t(`admin.landings.purchases.status_${item.status}`)}
          </span>
        </div>

        {/* Contact info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <ContactDisplay type={item.contact_type} value={item.contact_value} />
            {item.is_gift && item.gift_recipient_type && item.gift_recipient_value && (
              <span className="flex items-center gap-1">
                <ArrowRightIcon className="h-3 w-3" />
                <ContactDisplay type={item.gift_recipient_type} value={item.gift_recipient_value} />
              </span>
            )}
          </div>
        </div>

        {/* Tariff + period */}
        <div className="shrink-0 text-sm text-dark-200">
          <span className="font-medium">{item.tariff_name}</span>
          <span className="text-dark-500">
            {' '}
            &middot; {item.period_days} {t('admin.landings.purchases.days')}
          </span>
        </div>

        {/* Price */}
        <div className="shrink-0 text-sm font-medium text-dark-100">
          {formatPrice(item.amount_kopeks)}
        </div>

        {/* Payment method */}
        <div className="shrink-0 text-xs text-dark-500">{item.payment_method}</div>

        {/* Gift badge */}
        {item.is_gift && (
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
              <GiftIcon className="h-3.5 w-3.5" />
              {t('admin.landings.purchases.gift')}
            </span>
          </div>
        )}

        {/* Referrer */}
        {referrerHost && (
          <div
            className="max-w-[140px] shrink-0 truncate rounded bg-accent-500/20 px-1.5 py-0.5 text-xs font-medium text-accent-400"
            title={item.referrer || ''}
          >
            {referrerHost}
          </div>
        )}
        {/* Date + Time */}
        <div className="shrink-0 text-xs text-dark-500">
          {dateStr} <span className="text-dark-600">{timeStr}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLandingStats() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const numericId = id ? Number(id) : NaN;
  const isValidId = !isNaN(numericId);
  const navigate = useNavigate();
  const { formatWithCurrency } = useCurrency();
  const divisor = CHART_COMMON.KOPEKS_DIVISOR;
  const money = (kopeks: number) => formatWithCurrency(kopeks / divisor);

  // Purchases list state
  const [purchaseOffset, setPurchaseOffset] = useState(0);
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<PurchaseItemStatus | 'all'>(
    'all',
  );

  // Fetch stats
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['landing-stats', numericId],
    queryFn: () => adminLandingsApi.getStats(numericId),
    enabled: isValidId,
    staleTime: CHART_COMMON.STALE_TIME,
  });

  // Fetch landing detail for header
  const { data: landing } = useQuery({
    queryKey: ['admin-landing', numericId],
    queryFn: () => adminLandingsApi.get(numericId),
    enabled: isValidId,
    staleTime: CHART_COMMON.STALE_TIME,
  });

  // Fetch purchases list
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: [
      'landing-purchases',
      numericId,
      purchaseOffset,
      PURCHASES_PAGE_SIZE,
      purchaseStatusFilter,
    ],
    queryFn: () =>
      adminLandingsApi.getPurchases(
        numericId,
        purchaseOffset,
        PURCHASES_PAGE_SIZE,
        purchaseStatusFilter === 'all' ? undefined : purchaseStatusFilter,
      ),
    enabled: isValidId,
    staleTime: CHART_COMMON.STALE_TIME,
  });

  const purchaseItems = purchasesData?.items ?? [];
  const purchaseTotal = purchasesData?.total ?? 0;
  const purchaseTotalPages = Math.ceil(purchaseTotal / PURCHASES_PAGE_SIZE);
  const purchaseCurrentPage = Math.floor(purchaseOffset / PURCHASES_PAGE_SIZE) + 1;

  // Daily counts (created / paid) — flat data for MultiSeriesAreaChart
  const dailyCounts = useMemo(() => {
    if (!stats) return [];
    const createdLabel = t('admin.landings.stats.created', 'Created');
    const paidLabel = t('admin.landings.stats.paid', 'Paid');
    return stats.daily_stats.flatMap((d) => [
      { date: d.date, key: createdLabel, value: d.created },
      { date: d.date, key: paidLabel, value: d.purchases },
    ]);
  }, [stats, t]);

  // Daily revenue — for SimpleAreaChart
  const dailyRevenue = useMemo(() => {
    if (!stats) return [];
    return stats.daily_stats.map((d) => ({ date: d.date, value: d.revenue_kopeks / divisor }));
  }, [stats, divisor]);

  // Tariff breakdown (by revenue)
  const tariffItems = useMemo(
    () =>
      (stats?.tariff_stats ?? []).map((t2) => ({
        key: String(t2.tariff_id ?? t2.tariff_name),
        label: t2.tariff_name,
        value: t2.revenue_kopeks / divisor,
      })),
    [stats, divisor],
  );

  // Payment method breakdown (by purchases)
  const paymentDonut = useMemo(
    () => (stats?.payment_method_stats ?? []).map((p) => ({ name: p.method, value: p.purchases })),
    [stats],
  );

  // Traffic source breakdown (by purchases)
  const sourceItems = useMemo(
    () =>
      (stats?.source_stats ?? []).map((s) => ({
        key: s.source,
        label: s.source,
        value: s.purchases,
      })),
    [stats],
  );

  // Funnel: created -> paid
  const funnelData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t('admin.landings.stats.created', 'Created'), value: stats.total_created },
      { name: t('admin.landings.stats.paid', 'Paid'), value: stats.total_successful },
    ];
  }, [stats, t]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error || !stats) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/landings" />
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.landings.stats.title')}</h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.landings.stats.loadError')}</p>
          <button
            onClick={() => navigate('/admin/landings')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const landingTitle = landing ? resolveLocaleDisplay(landing.title) : `#${numericId}`;
  const giftsClaimed = stats.total_gifts_claimed ?? 0;
  const giftClaimRate =
    stats.total_gifts > 0 ? Math.round((giftsClaimed / stats.total_gifts) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/landings" />
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <ChartIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-dark-100">{landingTitle}</h1>
            <div className="mt-1 flex items-center gap-2">
              {landing?.is_active ? (
                <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                  {t('admin.landings.active')}
                </span>
              ) : (
                <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                  {t('admin.landings.inactive')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.landings.stats.created', 'Created')}
            value={stats.total_created}
            icon={<EyeIcon className="h-5 w-5" />}
            tone="warning"
          />
          <StatCard
            label={t('admin.landings.stats.paid', 'Paid')}
            value={stats.total_successful}
            icon={<CheckCircleIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.landings.stats.revenue')}
            value={money(stats.total_revenue_kopeks)}
            icon={<BanknotesIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.landings.stats.conversionRate')}
            value={`${stats.conversion_rate}%`}
            icon={<PercentIcon className="h-5 w-5" />}
            tone="accent"
          />
        </div>

        {/* Breakdown Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('admin.landings.stats.purchases')}
            value={stats.total_purchases}
            icon={<TicketIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.landings.stats.regularPurchases')}
            value={stats.total_regular}
            icon={<CardIcon className="h-5 w-5" />}
          />
          <StatCard
            label={t('admin.landings.stats.giftPurchases')}
            value={stats.total_gifts}
            icon={<GiftIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.landings.stats.avgPurchase')}
            value={money(stats.avg_purchase_kopeks)}
            icon={<WalletIcon className="h-5 w-5" />}
          />
        </div>

        {/* Funnel + gift activation */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="bento-card">
            <h4 className="mb-3 text-sm font-semibold text-dark-200">
              {t('admin.landings.stats.funnelTitle', 'Conversion funnel')}
            </h4>
            {stats.total_created === 0 ? (
              <div className="flex h-[180px] items-center justify-center text-sm text-dark-500">
                {t('admin.landings.stats.noPurchases')}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <FunnelChart>
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                      {/* Center value labels (dark text reads on the light segments)
                          — left/right labels can clip in the half-width column. */}
                      <LabelList
                        position="center"
                        dataKey="value"
                        fill="#0a0f1a"
                        stroke="none"
                        fontSize={14}
                      />
                      {funnelData.map((_, i) => (
                        <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                      ))}
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-dark-400">
                  {funnelData.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                      />
                      {s.name}: <span className="text-dark-200">{s.value}</span>
                    </span>
                  ))}
                  <span className="text-accent-400">{stats.conversion_rate}%</span>
                </div>
              </>
            )}
          </div>

          <div className="bento-card">
            <h4 className="mb-3 text-sm font-semibold text-dark-200">
              {t('admin.landings.stats.giftClaimTitle', 'Gift activation')}
            </h4>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-semibold text-dark-100">
                  {giftsClaimed}
                  <span className="text-base text-dark-500"> / {stats.total_gifts}</span>
                </div>
                <div className="mt-0.5 text-xs text-dark-500">
                  {t('admin.landings.stats.giftClaimLabel', 'claimed / sent')}
                </div>
              </div>
              <div className="text-2xl font-semibold text-accent-400">{giftClaimRate}%</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-dark-800/60">
              <div
                className="h-full rounded-full bg-accent-500 transition-all"
                style={{ width: `${giftClaimRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Daily charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MultiSeriesAreaChart
            data={dailyCounts}
            title={t('admin.landings.stats.dailyPurchases', 'Daily purchases')}
            chartId={`landing-counts-${numericId}`}
          />
          <SimpleAreaChart
            data={dailyRevenue}
            title={t('admin.landings.stats.dailyRevenue', 'Daily revenue')}
            chartId={`landing-revenue-${numericId}`}
            valueLabel={t('admin.landings.stats.revenueLabel', 'Revenue')}
          />
        </div>

        {/* Tariff + payment method */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownList
            title={t('admin.landings.stats.tariffChart')}
            items={tariffItems}
            valueFormatter={(v) => formatWithCurrency(v)}
          />
          <DonutChart
            data={paymentDonut}
            title={t('admin.landings.stats.byPaymentMethod', 'By payment method')}
          />
        </div>

        {/* Source + gift composition */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownList
            title={t('admin.landings.stats.bySource', 'Traffic sources')}
            items={sourceItems}
          />
          <DonutChart
            data={[
              {
                name: t('admin.landings.stats.regular'),
                value: stats.total_regular,
                color: GIFT_DONUT.regular,
              },
              {
                name: t('admin.landings.stats.gifts'),
                value: stats.total_gifts,
                color: GIFT_DONUT.gift,
              },
            ]}
            title={t('admin.landings.stats.giftBreakdown')}
          />
        </div>

        {/* Purchases List */}
        <div className="bento-card">
          {/* Header row: title + status filter */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-medium text-dark-200">{t('admin.landings.purchases.title')}</h3>
            <select
              value={purchaseStatusFilter}
              onChange={(e) => {
                setPurchaseStatusFilter(e.target.value as PurchaseItemStatus | 'all');
                setPurchaseOffset(0);
              }}
              className="rounded-lg border border-dark-600 bg-dark-900 px-3 py-1.5 text-sm text-dark-200 outline-none transition-colors focus:border-accent-500"
              aria-label={t('admin.landings.purchases.allStatuses')}
            >
              {PURCHASE_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all'
                    ? t('admin.landings.purchases.allStatuses')
                    : t(`admin.landings.purchases.status_${opt}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          {purchasesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : purchaseItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-dark-500">
              {t('admin.landings.purchases.noPurchases')}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {purchaseItems.map((item) => (
                  <PurchaseCard
                    key={item.id}
                    item={item}
                    formatPrice={(kopeks) => money(kopeks)}
                    lang={i18n.language}
                    t={t}
                  />
                ))}
              </div>

              {/* Pagination */}
              {purchaseTotalPages > 1 && (
                <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                  <span className="text-xs text-dark-500">
                    {t('admin.landings.purchases.showing', {
                      from: purchaseOffset + 1,
                      to: Math.min(purchaseOffset + PURCHASES_PAGE_SIZE, purchaseTotal),
                      total: purchaseTotal,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPurchaseOffset((prev) => Math.max(0, prev - PURCHASES_PAGE_SIZE))
                      }
                      disabled={purchaseOffset === 0}
                      className="flex items-center gap-1 rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t('admin.landings.purchases.prev')}
                    >
                      <ChevronLeftSmall />
                      <span className="hidden sm:inline">{t('admin.landings.purchases.prev')}</span>
                    </button>

                    <span className="px-2 text-xs text-dark-400">
                      {t('admin.landings.purchases.page', {
                        current: purchaseCurrentPage,
                        total: purchaseTotalPages,
                      })}
                    </span>

                    <button
                      onClick={() => setPurchaseOffset((prev) => prev + PURCHASES_PAGE_SIZE)}
                      disabled={purchaseOffset + PURCHASES_PAGE_SIZE >= purchaseTotal}
                      className="flex items-center gap-1 rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={t('admin.landings.purchases.next')}
                    >
                      <span className="hidden sm:inline">{t('admin.landings.purchases.next')}</span>
                      <ChevronRightSmall />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
