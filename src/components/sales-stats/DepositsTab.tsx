import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { METHOD_LABELS } from '../../constants/paymentMethods';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { StatCard } from '../stats';

import { MultiSeriesAreaChart } from './MultiSeriesAreaChart';
import { SimpleAreaChart } from './SimpleAreaChart';
import { SimpleBarChart } from './SimpleBarChart';

interface DepositsTabProps {
  params: SalesStatsParams;
}

export function DepositsTab({ params }: DepositsTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'deposits', params],
    queryFn: () => salesStatsApi.getDeposits(params),
    staleTime: SALES_STATS.STALE_TIME,
  });

  const formatValue = useCallback((v: number) => formatWithCurrency(v), [formatWithCurrency]);

  const methodBarData = useMemo(
    () =>
      data?.by_method.map((item) => ({
        name: METHOD_LABELS[item.method] || item.method,
        value: item.amount_kopeks / SALES_STATS.KOPEKS_DIVISOR,
      })) ?? [],
    [data?.by_method],
  );

  const dailyData = useMemo(
    () =>
      data?.daily.map((item) => ({
        date: item.date,
        value: item.amount_kopeks / SALES_STATS.KOPEKS_DIVISOR,
      })) ?? [],
    [data?.daily],
  );

  const dailyByMethodData = useMemo(
    () =>
      data?.daily_by_method.map((i) => ({
        date: i.date,
        key: METHOD_LABELS[i.method] || i.method,
        value: i.amount_kopeks / SALES_STATS.KOPEKS_DIVISOR,
      })) ?? [],
    [data?.daily_by_method],
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
    return <div className="py-8 text-center text-red-400">{t('admin.salesStats.loadError')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('admin.salesStats.deposits.totalDeposits')}
          value={data.total_deposits}
        />
        <StatCard
          label={t('admin.salesStats.deposits.totalAmount')}
          value={formatWithCurrency(data.total_amount_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('admin.salesStats.deposits.avgDeposit')}
          value={formatWithCurrency(data.avg_deposit_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
        />
      </div>

      <SimpleBarChart
        data={methodBarData}
        title={t('admin.salesStats.deposits.byMethod')}
        valueFormatter={formatValue}
      />

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.deposits.dailyChart')}
        chartId="deposits-daily"
        valueLabel={t('admin.salesStats.deposits.revenue')}
      />

      <MultiSeriesAreaChart
        data={dailyByMethodData}
        title={t('admin.salesStats.deposits.dailyByMethod')}
        chartId="deposits-daily-by-method"
        valueLabel={t('admin.salesStats.deposits.revenue')}
        valueFormatter={formatValue}
      />
    </div>
  );
}
