import { useTranslation } from 'react-i18next';
import type { NetworkGraphData } from '@/types/referralNetwork';
import { formatKopeksToRubles } from '../utils';

interface NetworkStatsProps {
  data: NetworkGraphData;
  className?: string;
}

export function NetworkStats({ data, className }: NetworkStatsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-xl border border-dark-700/50 bg-dark-900/80 p-2 backdrop-blur-md sm:p-3 ${className ?? ''}`}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:gap-x-6 sm:gap-y-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
            {t('admin.referralNetwork.stats.totalUsers')}
          </p>
          <p className="font-mono text-sm font-semibold text-dark-100">
            {data.total_users.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
            {t('admin.referralNetwork.stats.totalReferrers')}
          </p>
          <p className="font-mono text-sm font-semibold text-dark-100">
            {data.total_referrers.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
            {t('admin.referralNetwork.stats.totalCampaigns')}
          </p>
          <p className="font-mono text-sm font-semibold text-dark-100">
            {data.total_campaigns.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
            {t('admin.referralNetwork.stats.subscriptionRevenue')}
          </p>
          <p className="font-mono text-sm font-semibold text-accent-400">
            {formatKopeksToRubles(data.total_subscription_revenue_kopeks)} ₽
          </p>
        </div>
        <div className="col-span-2 border-t border-dark-700/30 pt-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
            {t('admin.referralNetwork.stats.totalEarnings')}
          </p>
          <p className="font-mono text-sm font-semibold text-dark-100">
            {formatKopeksToRubles(data.total_earnings_kopeks)} ₽
          </p>
        </div>
      </div>
    </div>
  );
}
