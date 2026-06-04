import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import {
  BanknotesIcon,
  CardIcon,
  DevicesIcon,
  PlusIcon,
  TrafficIcon,
} from '../../components/icons';
import { StatCard } from '../stats';

import { BreakdownList } from './BreakdownList';
import { DualAreaChart } from './DualAreaChart';

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
    placeholderData: keepPreviousData,
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

  const packageBreakdown = data.by_package.map((item) => ({
    key: String(item.traffic_gb),
    label: `${item.traffic_gb} GB`,
    value: item.count,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
        <StatCard
          label={t('admin.salesStats.addons.totalPurchases')}
          value={data.total_purchases}
          icon={<PlusIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.addons.totalGb')}
          value={`${data.total_gb_purchased} GB`}
          icon={<TrafficIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.salesStats.addons.revenue')}
          value={formatWithCurrency(data.addon_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR, 0)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.salesStats.addons.devicePurchases')}
          value={data.device_purchases}
          icon={<DevicesIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.addons.deviceRevenue')}
          value={formatWithCurrency(data.device_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR, 0)}
          icon={<CardIcon className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownList title={t('admin.salesStats.addons.byPackage')} items={packageBreakdown} />
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
