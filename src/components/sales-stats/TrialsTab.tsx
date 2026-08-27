import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SalesStatsParams } from '../../api/adminSalesStats';
import { salesStatsApi } from '../../api/adminSalesStats';
import { SALES_STATS } from '../../constants/salesStats';
import { GiftIcon, PercentIcon, UserPlusIcon } from '../../components/icons';
import { StatCard } from '../stats';

import { DonutChart } from './DonutChart';
import { DualAreaChart } from './DualAreaChart';

interface TrialsTabProps {
  params: SalesStatsParams;
}

const PROVIDER_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  vk: 'VK',
  yandex: 'Yandex',
  google: 'Google',
  discord: 'Discord',
};

export function TrialsTab({ params }: TrialsTabProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['sales-stats', 'trials', params],
    queryFn: () => salesStatsApi.getTrials(params),
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

  const pieData = data.by_provider.map((item) => ({
    name: PROVIDER_LABELS[item.provider] || item.provider,
    value: item.count,
    color: SALES_STATS.PROVIDER_COLORS[item.provider as keyof typeof SALES_STATS.PROVIDER_COLORS],
  }));

  const dualData = data.daily.map((item) => ({
    date: item.date,
    series1: item.registrations,
    series2: item.trials,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t('admin.salesStats.trials.totalRegistrations')}
          value={data.total_registrations}
          icon={<UserPlusIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.salesStats.trials.total')}
          value={data.total_trials}
          icon={<GiftIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.salesStats.trials.conversion')}
          value={`${data.conversion_rate}%`}
          icon={<PercentIcon className="h-5 w-5" />}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart data={pieData} title={t('admin.salesStats.trials.byProvider')} />
        <DualAreaChart
          data={dualData}
          title={t('admin.salesStats.trials.dailyChart')}
          chartId="trials-daily"
          series1Label={t('admin.salesStats.trials.totalRegistrations')}
          series2Label={t('admin.salesStats.trials.trialsIssued')}
        />
      </div>
    </div>
  );
}
