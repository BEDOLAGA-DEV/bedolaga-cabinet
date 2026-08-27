import { uiLocale } from '@/utils/uiLocale';
import { useTranslation } from 'react-i18next';
import { StatCard } from '@/components/stats';
import {
  BanknotesIcon,
  CampaignIcon,
  PartnerIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';
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
        <StatCard
          label={t('admin.referralNetwork.stats.totalUsers')}
          value={data.total_users.toLocaleString(uiLocale())}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.referralNetwork.stats.totalReferrers')}
          value={data.total_referrers.toLocaleString(uiLocale())}
          icon={<PartnerIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.referralNetwork.stats.totalCampaigns')}
          value={data.total_campaigns.toLocaleString(uiLocale())}
          icon={<CampaignIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.referralNetwork.stats.subscriptionRevenue')}
          value={`${formatKopeksToRubles(data.total_subscription_revenue_kopeks)} ₽`}
          icon={<BanknotesIcon className="h-5 w-5" />}
          tone="accent"
        />
        <div className="col-span-2">
          <StatCard
            label={t('admin.referralNetwork.stats.totalEarnings')}
            value={`${formatKopeksToRubles(data.total_earnings_kopeks)} ₽`}
            icon={<WalletIcon className="h-5 w-5" />}
            tone="neutral"
          />
        </div>
      </div>
    </div>
  );
}
