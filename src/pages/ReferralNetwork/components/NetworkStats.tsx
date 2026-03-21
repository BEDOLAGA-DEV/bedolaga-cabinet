import { useTranslation } from 'react-i18next';
import type { NetworkGraphData } from '@/types/referralNetwork';
import { formatKopeksToRubles } from '../utils';

interface NetworkStatsProps {
  data: NetworkGraphData;
  className?: string;
}

export function NetworkStats({ data, className }: NetworkStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('admin.referralNetwork.stats.totalUsers'),
      value: data.total_users.toLocaleString(),
    },
    {
      label: t('admin.referralNetwork.stats.totalReferrers'),
      value: data.total_referrers.toLocaleString(),
    },
    {
      label: t('admin.referralNetwork.stats.totalCampaigns'),
      value: data.total_campaigns.toLocaleString(),
    },
    {
      label: t('admin.referralNetwork.stats.totalEarnings'),
      value: `${formatKopeksToRubles(data.total_earnings_kopeks)} ₽`,
    },
  ];

  return (
    <div
      className={`rounded-xl border border-dark-700/50 bg-dark-900/80 p-2 backdrop-blur-md sm:p-3 ${className ?? ''}`}
    >
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-dark-500">
              {stat.label}
            </p>
            <p className="font-mono text-sm font-semibold text-dark-100">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
