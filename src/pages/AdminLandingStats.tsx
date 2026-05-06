import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  adminLandingsApi,
  resolveLocaleDisplay,
  type PurchaseItemStatus,
  type LandingPurchaseItem,
} from '../api/landings';
import { useCurrency } from '../hooks/useCurrency';
import { useChartColors } from '../hooks/useChartColors';
import { CHART_COMMON } from '../constants/charts';
import { AdminBackButton } from '../components/admin';

// Icons
const ChartIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const TARIFF_PALETTE = ['#818cf8', '#34d399', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];
const GIFT_COLOR = '#a855f7';

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

// Small icons for the purchase cards

const EmailIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const TelegramSmallIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg
    className="h-3 w-3 shrink-0 text-dark-500"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const GiftIcon = () => (
  <svg
    className="h-3.5 w-3.5 shrink-0"
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
);

const ChevronLeftSmall = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightSmall = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// Contact display helper
function ContactDisplay({ type, value }: { type: 'email' | 'telegram'; value: string }) {
  return (
    <span className="flex items-center gap-1 text-dark-300">
      {type === 'email' ? <EmailIcon /> : <TelegramSmallIcon />}
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
                <ArrowRightIcon />
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
              <GiftIcon />
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
  const colors = useChartColors();

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

  // Prepare daily chart data
  const dailyData = useMemo(() => {
    if (!stats) return [];
    return stats.daily_stats.map((item) => ({
      label: (() => {
        const d = new Date(item.date + 'T00:00:00');
        return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      })(),
      created: item.created,
      purchases: item.purchases,
      revenue: item.revenue_kopeks / CHART_COMMON.KOPEKS_DIVISOR,
      gifts: item.gifts,
    }));
  }, [stats]);

  // Prepare tariff chart data
  const tariffData = useMemo(() => {
    if (!stats) return [];
    return stats.tariff_stats.map((item) => ({
      name: item.tariff_name,
      purchases: item.purchases,
      revenue: item.revenue_kopeks / CHART_COMMON.KOPEKS_DIVISOR,
    }));
  }, [stats]);

  // Donut data for gift vs regular
  const donutData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: t('admin.landings.stats.regular'),
        value: stats.total_regular,
        color: colors.referrals,
      },
      { name: t('admin.landings.stats.gifts'), value: stats.total_gifts, color: GIFT_COLOR },
    ];
  }, [stats, t, colors.referrals]);

  // Bar chart height based on tariff count
  const barChartHeight = useMemo(() => {
    const count = tariffData.length;
    return Math.max(220, count * 45 + 40);
  }, [tariffData.length]);

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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/landings" />
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <ChartIcon />
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

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold sm:text-2xl">
              <span className="text-warning-400">{stats.total_created}</span>
              <span className="mx-1 text-dark-600">/</span>
              <span className="text-success-400">{stats.total_successful}</span>
            </div>
            <div className="text-xs text-dark-500">
              {t('admin.landings.stats.created', 'Created')} /{' '}
              {t('admin.landings.stats.paid', 'paid')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="truncate text-xl font-bold text-accent-400 sm:text-2xl">
              {formatWithCurrency(stats.total_revenue_kopeks / CHART_COMMON.KOPEKS_DIVISOR)}
            </div>
            <div className="text-xs text-dark-500">{t('admin.landings.stats.revenue')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold text-purple-400 sm:text-2xl">{stats.total_gifts}</div>
            <div className="text-xs text-dark-500">{t('admin.landings.stats.giftPurchases')}</div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-xl font-bold text-dark-200 sm:text-2xl">
              {stats.conversion_rate}%
            </div>
            <div className="text-xs text-dark-500">{t('admin.landings.stats.conversionRate')}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Daily Purchases & Revenue */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <h3 className="mb-4 font-medium text-dark-200">
              {t('admin.landings.stats.dailyChart')}
            </h3>
            {dailyData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-dark-500">
                {t('admin.landings.stats.noPurchases')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyData} margin={CHART_COMMON.CHART.MARGIN}>
                  <defs>
                    <linearGradient
                      id={`landingPurchaseGrad-${numericId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset={CHART_COMMON.GRADIENT.START_OFFSET}
                        stopColor={colors.referrals}
                        stopOpacity={CHART_COMMON.GRADIENT.START_OPACITY}
                      />
                      <stop
                        offset={CHART_COMMON.GRADIENT.END_OFFSET}
                        stopColor={colors.referrals}
                        stopOpacity={CHART_COMMON.GRADIENT.END_OPACITY}
                      />
                    </linearGradient>
                    <linearGradient
                      id={`landingRevenueGrad-${numericId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset={CHART_COMMON.GRADIENT.START_OFFSET}
                        stopColor={colors.earnings}
                        stopOpacity={CHART_COMMON.GRADIENT.START_OPACITY}
                      />
                      <stop
                        offset={CHART_COMMON.GRADIENT.END_OFFSET}
                        stopColor={colors.earnings}
                        stopOpacity={CHART_COMMON.GRADIENT.END_OPACITY}
                      />
                    </linearGradient>
                    <linearGradient
                      id={`landingCreatedGrad-${numericId}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset={CHART_COMMON.GRADIENT.START_OFFSET}
                        stopColor="#f59e0b"
                        stopOpacity={CHART_COMMON.GRADIENT.START_OPACITY}
                      />
                      <stop
                        offset={CHART_COMMON.GRADIENT.END_OFFSET}
                        stopColor="#f59e0b"
                        stopOpacity={CHART_COMMON.GRADIENT.END_OPACITY}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray={CHART_COMMON.GRID_DASH} stroke={colors.grid} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: CHART_COMMON.AXIS.TICK_FONT_SIZE, fill: colors.tick }}
                    stroke={colors.grid}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: CHART_COMMON.AXIS.TICK_FONT_SIZE, fill: colors.tick }}
                    stroke={colors.grid}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: CHART_COMMON.AXIS.TICK_FONT_SIZE, fill: colors.tick }}
                    stroke={colors.grid}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: colors.tooltipBg,
                      border: `1px solid ${colors.tooltipBorder}`,
                      borderRadius: CHART_COMMON.TOOLTIP.BORDER_RADIUS,
                      fontSize: CHART_COMMON.TOOLTIP.FONT_SIZE,
                      color: colors.label,
                    }}
                    labelStyle={{ color: colors.label }}
                    itemStyle={{ color: colors.label }}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="created"
                    name={t('admin.landings.stats.created', 'Created')}
                    stroke="#f59e0b"
                    fill={`url(#landingCreatedGrad-${numericId})`}
                    strokeWidth={CHART_COMMON.STROKE_WIDTH}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="purchases"
                    name={t('admin.landings.stats.purchases')}
                    stroke={colors.referrals}
                    fill={`url(#landingPurchaseGrad-${numericId})`}
                    strokeWidth={CHART_COMMON.STROKE_WIDTH}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    name={t('admin.landings.stats.revenueLabel')}
                    stroke={colors.earnings}
                    fill={`url(#landingRevenueGrad-${numericId})`}
                    strokeWidth={CHART_COMMON.STROKE_WIDTH}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Daily Purchases Bar Chart */}
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <h3 className="mb-4 font-medium text-dark-200">
              {t('admin.landings.stats.dailyPurchases', 'Daily purchases')}
            </h3>
            {dailyData.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-sm text-dark-500">
                {t('admin.landings.stats.noPurchases')}
              </div>
            ) : (
              <div className="space-y-2">
                {[...dailyData]
                  .slice(-7)
                  .reverse()
                  .map((day, i) => {
                    const purchasedPct =
                      (day.created || 0) > 0
                        ? ((day.purchases || 0) / (day.created || 1)) * 100
                        : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-right text-xs text-dark-500">
                          {day.label}
                        </span>
                        <div
                          className="group relative h-5 flex-1 overflow-hidden rounded-full bg-amber-500/80"
                          title={`${t('admin.landings.stats.created', 'Created')}: ${day.created || 0}\n${t('admin.landings.stats.paid', 'paid')}: ${day.purchases || 0}\n${t('admin.landings.stats.revenueLabel', 'Revenue')}: ${day.revenue?.toFixed(0) || 0} ${t('common.currency', '\u20BD')}\nCR: ${Math.round(purchasedPct)}%`}
                        >
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-accent-500"
                            style={{ width: `${purchasedPct}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-xs text-dark-400">
                          <span className="text-amber-400">{day.created || 0}</span>
                          <span className="text-dark-600">/</span>
                          <span className="text-accent-400">{day.purchases || 0}</span>
                        </span>
                      </div>
                    );
                  })}
                <div className="mt-2 flex items-center gap-4 text-xs text-dark-500">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                    <span>{t('admin.landings.stats.created', 'Created')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-accent-500" />
                    <span>{t('admin.landings.stats.paid', 'paid')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tariff Distribution -- full width */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.landings.stats.tariffChart')}
          </h3>
          {tariffData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-dark-500">
              {t('admin.landings.stats.noPurchases')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={barChartHeight}>
              <BarChart
                data={tariffData}
                layout="vertical"
                margin={{ ...CHART_COMMON.CHART.MARGIN, left: 10 }}
              >
                <CartesianGrid strokeDasharray={CHART_COMMON.GRID_DASH} stroke={colors.grid} />
                <XAxis
                  type="number"
                  tick={{ fontSize: CHART_COMMON.AXIS.TICK_FONT_SIZE, fill: colors.tick }}
                  stroke={colors.grid}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: CHART_COMMON.AXIS.TICK_FONT_SIZE, fill: colors.tick }}
                  stroke={colors.grid}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.tooltipBg,
                    border: `1px solid ${colors.tooltipBorder}`,
                    borderRadius: CHART_COMMON.TOOLTIP.BORDER_RADIUS,
                    fontSize: CHART_COMMON.TOOLTIP.FONT_SIZE,
                    color: colors.label,
                  }}
                  labelStyle={{ color: colors.label }}
                  itemStyle={{ color: colors.label }}
                  formatter={(value: number | undefined) => {
                    return [value ?? 0, t('admin.landings.stats.purchases')];
                  }}
                />
                <Bar
                  dataKey="purchases"
                  name={t('admin.landings.stats.purchases')}
                  radius={[0, 4, 4, 0]}
                >
                  {tariffData.map((_, index) => (
                    <Cell key={index} fill={TARIFF_PALETTE[index % TARIFF_PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="mb-1 text-sm text-dark-400">
              {t('admin.landings.stats.avgPurchase')}
            </div>
            <div className="text-lg font-medium text-dark-200">
              {formatWithCurrency(stats.avg_purchase_kopeks / CHART_COMMON.KOPEKS_DIVISOR)}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="mb-1 text-sm text-dark-400">
              {t('admin.landings.stats.regularPurchases')}
            </div>
            <div className="text-lg font-medium text-dark-200">{stats.total_regular}</div>
          </div>
          <div className="col-span-2 rounded-xl border border-dark-700 bg-dark-800 p-4 sm:col-span-1">
            <div className="mb-1 text-sm text-dark-400">{t('admin.landings.stats.funnel')}</div>
            <div className="text-lg font-medium text-dark-200">
              {stats.total_created}{' '}
              <span className="text-sm text-dark-500">{t('admin.landings.stats.created')}</span>
              {' / '}
              {stats.total_successful}{' '}
              <span className="text-sm text-dark-500">
                {t('admin.landings.stats.paid', 'paid')}
              </span>
            </div>
          </div>
        </div>

        {/* Gift vs Regular Donut */}
        {stats.total_purchases > 0 && (
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <h3 className="mb-4 font-medium text-dark-200">
              {t('admin.landings.stats.giftBreakdown')}
            </h3>
            <div className="flex items-center justify-center gap-8">
              <div className="relative">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.tooltipBg,
                        border: `1px solid ${colors.tooltipBorder}`,
                        borderRadius: CHART_COMMON.TOOLTIP.BORDER_RADIUS,
                        fontSize: CHART_COMMON.TOOLTIP.FONT_SIZE,
                        color: colors.label,
                      }}
                      itemStyle={{ color: colors.label }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-dark-100">{stats.total_purchases}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors.referrals }}
                  />
                  <span className="text-sm text-dark-300">
                    {t('admin.landings.stats.regular')}: {stats.total_regular}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: GIFT_COLOR }} />
                  <span className="text-sm text-dark-300">
                    {t('admin.landings.stats.gifts')}: {stats.total_gifts}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchases List */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
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
                    formatPrice={(kopeks) =>
                      formatWithCurrency(kopeks / CHART_COMMON.KOPEKS_DIVISOR)
                    }
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
