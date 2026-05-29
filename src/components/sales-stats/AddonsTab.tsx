import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { StatCard } from '../stats';

import { DualAreaChart } from './DualAreaChart';
import { SimpleBarChart } from './SimpleBarChart';

interface AddonsTabProps {
  params: SalesStatsParams;
}

export function AddonsTab({ params }: AddonsTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'addons', params],
    queryFn: () => salesStatsApi.getAddons(params),
    staleTime: SALES_STATS.STALE_TIME,
  });

  const dailyChartData = useMemo(() => {
    if (!data) return [];
    const trafficByDate = new Map(data.daily.map((d) => [d.date, d.count]));
    const deviceByDate = new Map(data.daily_devices.map((d) => [d.date, d.count]));
    const allDates = Array.from(new Set([...trafficByDate.keys(), ...deviceByDate.keys()])).sort();
    return allDates.map((date) => ({
      date,
      series1: trafficByDate.get(date) ?? 0,
      series2: deviceByDate.get(date) ?? 0,
    }));
  }, [data]);

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

  const packageBarData = data.by_package.map((item) => ({
    name: `${item.traffic_gb} GB`,
    value: item.count,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t('admin.salesStats.addons.totalPurchases')}
          value={data.total_purchases}
        />
        <StatCard
          label={t('admin.salesStats.addons.totalGb')}
          value={`${data.total_gb_purchased} GB`}
        />
        <StatCard
          label={t('admin.salesStats.addons.revenue')}
          value={formatWithCurrency(data.addon_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('admin.salesStats.addons.devicePurchases')}
          value={data.device_purchases}
        />
        <StatCard
          label={t('admin.salesStats.addons.deviceRevenue')}
          value={formatWithCurrency(data.device_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SimpleBarChart data={packageBarData} title={t('admin.salesStats.addons.byPackage')} />
        <DualAreaChart
          data={dailyChartData}
          title={t('admin.salesStats.addons.dailyChart')}
          chartId="addons-daily"
          series1Label={t('admin.salesStats.addons.trafficPurchases')}
          series2Label={t('admin.salesStats.addons.devicePurchasesDaily')}
          series1Color={SALES_STATS.BAR_COLORS[5]}
          series2Color={SALES_STATS.BAR_COLORS[3]}
        />
      </div>
    </div>
  );
}
