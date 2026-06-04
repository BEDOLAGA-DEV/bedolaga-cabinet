import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { BanknotesIcon, CardIcon, TicketIcon, TrophyIcon } from '../../components/icons';
import { StatCard } from '../stats';

import { BreakdownList } from './BreakdownList';
import { DonutChart } from './DonutChart';
import { SimpleAreaChart } from './SimpleAreaChart';
import { StackedBarChart } from './StackedBarChart';

interface SalesTabProps {
  params: SalesStatsParams;
}

export function SalesTab({ params }: SalesTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'sales', params],
    queryFn: () => salesStatsApi.getSales(params),
    staleTime: SALES_STATS.STALE_TIME,
    placeholderData: keepPreviousData,
  });

  const dailyByTariffData = useMemo(
    () =>
      data?.daily_by_tariff.map((i) => ({ date: i.date, key: i.tariff_name, value: i.count })) ??
      [],
    [data?.daily_by_tariff],
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 rounded-xl bg-dark-800/30" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <div className="py-8 text-center text-error-400">{t('admin.salesStats.loadError')}</div>;
  }

  const tariffBreakdown = data.by_tariff.map((item) => ({
    key: String(item.tariff_id),
    label: item.tariff_name,
    value: item.count,
  }));

  const periodPieData = data.by_period.map((item) => ({
    name: `${item.period_days} ${t('admin.trafficUsage.days')}`,
    value: item.count,
  }));

  const dailyData = data.daily.map((item) => ({
    date: item.date,
    value: item.revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('admin.salesStats.sales.totalSales')}
          value={data.total_sales}
          icon={<TicketIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.sales.totalRevenue')}
          value={formatWithCurrency(data.total_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR, 0)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.salesStats.sales.avgOrder')}
          value={formatWithCurrency(data.avg_order_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          icon={<CardIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.salesStats.sales.topTariff')}
          value={data.top_tariff_name}
          icon={<TrophyIcon className="h-5 w-5" />}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title={t('admin.salesStats.sales.byTariff')} items={tariffBreakdown} />
        <DonutChart data={periodPieData} title={t('admin.salesStats.sales.byPeriod')} />
      </div>

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.sales.dailyChart')}
        chartId="sales-daily"
        valueLabel={t('admin.salesStats.summary.revenue')}
      />

      <StackedBarChart
        data={dailyByTariffData}
        title={t('admin.salesStats.sales.dailyByTariff')}
        valueFormatter={(v) => String(v)}
      />
    </div>
  );
}
