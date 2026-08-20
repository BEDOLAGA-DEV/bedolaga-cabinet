import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { partnerApi } from '../../api/partners';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';
import { DailyChart } from '../stats/DailyChart';
import { PeriodComparison } from '../stats/PeriodComparison';
import { StatCard } from '../stats/StatCard';
import { TopReferrals } from './TopReferrals';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

interface CampaignDetailStatsProps {
  campaignId: number;
}

export function CampaignDetailStats({ campaignId }: CampaignDetailStatsProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['partner-campaign-stats', campaignId],
    queryFn: () => partnerApi.getCampaignStats(campaignId),
    staleTime: PARTNER_STATS.STATS_STALE_TIME,
  });

  if (isLoading) {
    return (
      <SkeletonGroup className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Skeleton
            variant="card"
            count={PARTNER_STATS.SKELETON_COUNT}
            className="h-16 rounded-xl"
          />
        </div>
        <Skeleton variant="card" className="h-52 rounded-xl" />
      </SkeletonGroup>
    );
  }

  if (isError || !data) {
    return (
      <div className="pt-2 text-center">
        <div className="text-sm text-error-400">{t('referral.partner.stats.noData')}</div>
        <button onClick={() => refetch()} className="btn-secondary mt-2 px-4 py-1 text-xs">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Period earnings */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard
          label={t('referral.partner.stats.today')}
          value={formatWithCurrency(data.earnings_today / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('referral.partner.stats.week')}
          value={formatWithCurrency(data.earnings_week / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
        <StatCard
          label={t('referral.partner.stats.month')}
          value={formatWithCurrency(data.earnings_month / PARTNER_STATS.KOPEKS_DIVISOR)}
          valueClassName="text-success-400"
        />
      </div>

      {/* Conversion rate */}
      <div className="rounded-xl bg-dark-800/30 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark-500">
            {t('referral.partner.stats.conversionRate')}
          </span>
          <span className="text-lg font-semibold text-accent-400">{data.conversion_rate}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-dark-700">
          <div
            className="h-full rounded-full bg-accent-500 transition-all"
            style={{
              width: `${Math.min(data.conversion_rate, PARTNER_STATS.MAX_CONVERSION_RATE)}%`,
            }}
          />
        </div>
      </div>

      {/* Daily chart */}
      <DailyChart data={data.daily_stats} chartId={campaignId} />

      {/* Period comparison */}
      <PeriodComparison data={data.period_comparison} />

      {/* Top referrals */}
      <TopReferrals referrals={data.top_referrals} />
    </div>
  );
}
