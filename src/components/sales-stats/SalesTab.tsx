import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { StatCard } from '../stats';

import { DonutChart } from './DonutChart';
import { MultiSeriesAreaChart } from './MultiSeriesAreaChart';
import { SimpleAreaChart } from './SimpleAreaChart';
import { SimpleBarChart } from './SimpleBarChart';

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

  const tariffBarData = data.by_tariff.map((item) => ({
    name: item.tariff_name,
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('admin.salesStats.sales.totalSales')} value={data.total_sales} />
        <StatCard
          label={t('admin.salesStats.sales.avgOrder')}
          value={formatWithCurrency(data.avg_order_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard label={t('admin.salesStats.sales.topTariff')} value={data.top_tariff_name} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SimpleBarChart data={tariffBarData} title={t('admin.salesStats.sales.byTariff')} />
        <DonutChart data={periodPieData} title={t('admin.salesStats.sales.byPeriod')} />
      </div>

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.sales.dailyChart')}
        chartId="sales-daily"
        valueLabel={t('admin.salesStats.summary.revenue')}
      />

      <MultiSeriesAreaChart
        data={dailyByTariffData}
        title={t('admin.salesStats.sales.dailyByTariff')}
        chartId="sales-daily-by-tariff"
        valueLabel={t('admin.salesStats.sales.subscriptions')}
      />
    </div>
  );
}
