import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { useCurrency } from '../../hooks/useCurrency';
import { BanknotesIcon, PercentIcon, RepeatIcon } from '../../components/icons';
import { StatCard } from '../stats';
import { TREND_STYLES } from '../stats/constants';

import { SimpleAreaChart } from './SimpleAreaChart';

interface RenewalsTabProps {
  params: SalesStatsParams;
}

export function RenewalsTab({ params }: RenewalsTabProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'renewals', params],
    queryFn: () => salesStatsApi.getRenewals(params),
    staleTime: SALES_STATS.STALE_TIME,
    placeholderData: keepPreviousData,
  });

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

  const dailyData = data.daily.map((item) => ({
    date: item.date,
    value: item.count,
  }));

  const trendStyle = TREND_STYLES[data.change.trend] ?? TREND_STYLES.stable;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('admin.salesStats.renewals.total')}
          value={data.total_renewals}
          icon={<RepeatIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.salesStats.renewals.rate')}
          value={`${data.renewal_rate}%`}
          icon={<PercentIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.renewals.revenue')}
          value={formatWithCurrency(data.total_revenue_kopeks / SALES_STATS.KOPEKS_DIVISOR, 0)}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="bento-card">
        <h4 className="mb-3 text-sm font-semibold text-dark-200">
          {t('admin.salesStats.renewals.comparison')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-dark-800/30 p-3">
            <div className="text-xs text-dark-500">
              {t('admin.salesStats.renewals.currentPeriod')}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-base font-semibold text-dark-100 sm:text-lg">
                {data.current_period.count}
              </span>
              <span className={`text-sm font-medium ${trendStyle.className}`}>
                {trendStyle.arrow} {Math.abs(data.change.percent)}%
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-dark-800/30 p-3">
            <div className="text-xs text-dark-500">
              {t('admin.salesStats.renewals.previousPeriod')}
            </div>
            <div className="mt-1 text-base font-semibold text-dark-400 sm:text-lg">
              {data.previous_period.count}
            </div>
          </div>
        </div>
      </div>

      <SimpleAreaChart
        data={dailyData}
        title={t('admin.salesStats.renewals.dailyChart')}
        chartId="renewals-daily"
        valueLabel={t('admin.salesStats.renewals.renewals')}
        color={SALES_STATS.BAR_COLORS[2]}
      />
    </div>
  );
}
