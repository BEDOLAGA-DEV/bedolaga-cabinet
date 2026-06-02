import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import type { SalesStatsParams } from '../api/adminSalesStats';
import { salesStatsApi } from '../api/adminSalesStats';
import { SALES_STATS } from '../constants/salesStats';
import { useCurrency } from '../hooks/useCurrency';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { StatCard } from '../components/stats';
import {
  AddonsTab,
  DepositsTab,
  PeriodSelector,
  RenewalsTab,
  SalesTab,
  TrialsTab,
} from '../components/sales-stats';

type TabId = 'trials' | 'sales' | 'renewals' | 'addons' | 'deposits';

type Delta = { percent: number; trend: 'up' | 'down' | 'stable' };

/** Same-length window immediately before the selected one, for period-over-period
 * deltas. Returns null for "all time" — nothing meaningful to compare against. */
function getPreviousPeriodParams(period: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): SalesStatsParams | null {
  if (period.startDate && period.endDate) {
    const start = new Date(period.startDate).getTime();
    const length = new Date(period.endDate).getTime() - start;
    return {
      start_date: new Date(start - length).toISOString(),
      end_date: new Date(start).toISOString(),
    };
  }
  if (period.days !== undefined && period.days > 0) {
    const dayMs = 86_400_000;
    const now = Date.now();
    return {
      start_date: new Date(now - 2 * period.days * dayMs).toISOString(),
      end_date: new Date(now - period.days * dayMs).toISOString(),
    };
  }
  return null;
}

function computeDelta(current: number, previous: number): Delta | null {
  if (previous === 0) return current === 0 ? null : { percent: 100, trend: 'up' };
  const percent = Math.round(((current - previous) / previous) * 1000) / 10;
  return { percent, trend: percent > 0 ? 'up' : percent < 0 ? 'down' : 'stable' };
}

export default function AdminSalesStats() {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const [activeTab, setActiveTab] = useState<TabId>('trials');
  const [period, setPeriod] = useState<{
    days?: number;
    startDate?: string;
    endDate?: string;
  }>({ days: SALES_STATS.DEFAULT_PERIOD });

  const params: SalesStatsParams = useMemo(
    () => ({
      days: period.days,
      start_date: period.startDate,
      end_date: period.endDate,
    }),
    [period.days, period.startDate, period.endDate],
  );

  const isValidPeriod = period.days !== undefined || (!!period.startDate && !!period.endDate);

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['sales-stats', 'summary', params],
    queryFn: () => salesStatsApi.getSummary(params),
    staleTime: SALES_STATS.STALE_TIME,
    enabled: isValidPeriod,
  });

  const prevParams = useMemo(() => getPreviousPeriodParams(period), [period]);
  const { data: prevSummary } = useQuery({
    queryKey: ['sales-stats', 'summary', prevParams],
    queryFn: () => salesStatsApi.getSummary(prevParams as SalesStatsParams),
    staleTime: SALES_STATS.STALE_TIME,
    enabled: isValidPeriod && prevParams !== null,
  });

  const deltas = useMemo(() => {
    if (!summary || !prevSummary) return null;
    return {
      revenue: computeDelta(summary.total_revenue_kopeks, prevSummary.total_revenue_kopeks),
      newTrials: computeDelta(summary.new_trials, prevSummary.new_trials),
      renewals: computeDelta(summary.renewals_count, prevSummary.renewals_count),
      addonRevenue: computeDelta(summary.addon_revenue_kopeks, prevSummary.addon_revenue_kopeks),
      manualTopup: computeDelta(summary.manual_topup_kopeks, prevSummary.manual_topup_kopeks),
    };
  }, [summary, prevSummary]);

  const tabs: { id: TabId; label: string }[] = [
    { id: 'trials', label: t('admin.salesStats.tabs.trials') },
    { id: 'sales', label: t('admin.salesStats.tabs.sales') },
    { id: 'renewals', label: t('admin.salesStats.tabs.renewals') },
    { id: 'addons', label: t('admin.salesStats.tabs.addons') },
    { id: 'deposits', label: t('admin.salesStats.tabs.deposits') },
  ];

  return (
    <div className="animate-fade-in space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div>
          <h1 className="text-xl font-bold text-dark-100 sm:text-2xl">
            {t('admin.salesStats.title')}
          </h1>
          <p className="text-sm text-dark-400">{t('admin.salesStats.subtitle')}</p>
        </div>
      </div>

      {/* Period selector */}
      <PeriodSelector value={period} onChange={setPeriod} />

      {/* Summary cards */}
      {summaryError && (
        <div className="rounded-xl bg-error-500/10 px-4 py-3 text-sm text-error-400">
          {t('admin.salesStats.loadError')}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label={t('admin.salesStats.summary.revenue')}
          value={
            summaryLoading
              ? '...'
              : formatWithCurrency(
                  (summary?.total_revenue_kopeks ?? 0) / SALES_STATS.KOPEKS_DIVISOR,
                )
          }
          valueClassName="text-success-400"
          delta={deltas?.revenue}
        />
        <StatCard
          label={t('admin.salesStats.summary.activeSubs')}
          value={summaryLoading ? '...' : (summary?.active_subscriptions ?? 0)}
          valueClassName="text-accent-400"
        />
        <StatCard
          label={t('admin.salesStats.summary.activeTrials')}
          value={summaryLoading ? '...' : (summary?.active_trials ?? 0)}
        />
        <StatCard
          label={t('admin.salesStats.summary.newTrials')}
          value={summaryLoading ? '...' : (summary?.new_trials ?? 0)}
          valueClassName="text-accent-400"
          delta={deltas?.newTrials}
        />
        <StatCard
          label={t('admin.salesStats.summary.conversion')}
          value={summaryLoading ? '...' : `${summary?.trial_to_paid_conversion ?? 0}%`}
          valueClassName="text-warning-400"
        />
        <StatCard
          label={t('admin.salesStats.summary.renewals')}
          value={summaryLoading ? '...' : (summary?.renewals_count ?? 0)}
          valueClassName="text-success-400"
          delta={deltas?.renewals}
        />
        <StatCard
          label={t('admin.salesStats.summary.addonRevenue')}
          value={
            summaryLoading
              ? '...'
              : formatWithCurrency(
                  (summary?.addon_revenue_kopeks ?? 0) / SALES_STATS.KOPEKS_DIVISOR,
                )
          }
          valueClassName="text-accent-400"
          delta={deltas?.addonRevenue}
        />
        <StatCard
          label={t('admin.salesStats.summary.manualTopup')}
          value={
            summaryLoading
              ? '...'
              : formatWithCurrency((summary?.manual_topup_kopeks ?? 0) / SALES_STATS.KOPEKS_DIVISOR)
          }
          valueClassName="text-warning-400"
          delta={deltas?.manualTopup}
        />
      </div>

      {/* Tabs */}
      <div
        className="scrollbar-hide flex gap-1 overflow-x-auto rounded-xl bg-dark-800/30 p-1"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
              activeTab === tab.id
                ? 'bg-dark-700/60 text-dark-100'
                : 'text-dark-400 hover:text-dark-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {isValidPeriod && (
        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'trials' && <TrialsTab params={params} />}
          {activeTab === 'sales' && <SalesTab params={params} />}
          {activeTab === 'renewals' && <RenewalsTab params={params} />}
          {activeTab === 'addons' && <AddonsTab params={params} />}
          {activeTab === 'deposits' && <DepositsTab params={params} />}
        </div>
      )}
    </div>
  );
}
