import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { METHOD_LABELS } from '../../constants/paymentMethods';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { BanknotesIcon, CardIcon, WalletIcon } from '../../components/icons';
import { StatCard } from '../stats';

import PaymentMethodIcon from '../PaymentMethodIcon';

import { BreakdownList } from './BreakdownList';
import { SimpleAreaChart } from './SimpleAreaChart';
import { StackedBarChart } from './StackedBarChart';

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
    placeholderData: keepPreviousData,
  });

  const formatValue = useCallback((v: number) => formatWithCurrency(v), [formatWithCurrency]);

  const methodBreakdown = useMemo(
    () =>
      data?.by_method.map((item) => ({
        key: item.method,
        label: METHOD_LABELS[item.method] || item.method,
        value: item.amount_kopeks / SALES_STATS.KOPEKS_DIVISOR,
        icon: <PaymentMethodIcon method={item.method} className="h-5 w-5 shrink-0" />,
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
    return <div className="py-8 text-center text-error-400">{t('admin.salesStats.loadError')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('admin.salesStats.deposits.totalDeposits')}
          value={data.total_deposits}
          icon={<WalletIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.deposits.totalAmount')}
          value={formatWithCurrency(data.total_amount_kopeks / SALES_STATS.KOPEKS_DIVISOR, 0)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.salesStats.deposits.avgDeposit')}
          value={formatWithCurrency(data.avg_deposit_kopeks / SALES_STATS.KOPEKS_DIVISOR)}
          icon={<CardIcon className="h-5 w-5" />}
          tone="neutral"
        />
      </div>

      <BreakdownList
        title={t('admin.salesStats.deposits.byMethod')}
        items={methodBreakdown}
        valueFormatter={formatValue}
      />

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.deposits.dailyChart')}
        chartId="deposits-daily"
        valueLabel={t('admin.salesStats.deposits.revenue')}
      />

      <StackedBarChart
        data={dailyByMethodData}
        title={t('admin.salesStats.deposits.dailyByMethod')}
        valueFormatter={formatValue}
      />
    </div>
  );
}
