import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { referralNetworkApi } from '@/api/referralNetwork';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import { formatKopeksToRubles } from '../utils';

interface CampaignDetailPanelProps {
  campaignId: number;
  className?: string;
}

export function CampaignDetailPanel({ campaignId, className }: CampaignDetailPanelProps) {
  const { t } = useTranslation();
  const setSelectedNode = useReferralNetworkStore((s) => s.setSelectedNode);

  const {
    data: campaign,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['referral-network-campaign', campaignId],
    queryFn: () => referralNetworkApi.getCampaignDetail(campaignId),
    staleTime: 60_000,
  });

  function handleClose() {
    setSelectedNode(null);
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-700/50 p-4">
        <h3 className="text-sm font-semibold text-dark-100">{campaign?.name ?? '...'}</h3>
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-dark-500 transition-colors hover:bg-dark-800 hover:text-dark-300"
          aria-label={t('common.close')}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto p-4 pb-[calc(1rem+var(--safe-bottom,0px))]">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-dark-600 border-t-accent-400" />
          </div>
        )}

        {isError && (
          <div className="py-8 text-center text-sm text-error-400">
            {t('admin.referralNetwork.error')}
          </div>
        )}

        {campaign && (
          <div className="space-y-5">
            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-500">
                  {t('admin.referralNetwork.campaign.startParam')}
                </span>
                <span className="font-mono text-dark-200">{campaign.start_parameter}</span>
              </div>
              <div className="flex justify-end">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    campaign.is_active
                      ? 'bg-success-500/20 text-success-400'
                      : 'bg-dark-700/50 text-dark-400'
                  }`}
                >
                  {campaign.is_active
                    ? t('admin.referralNetwork.campaign.active')
                    : t('admin.referralNetwork.campaign.inactive')}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.campaign.directUsers')}
                  </span>
                  <span className="font-mono text-dark-100">{campaign.direct_users}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.campaign.totalNetwork')}
                  </span>
                  <span className="font-mono text-dark-100">{campaign.total_network_users}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.campaign.totalRevenue')}
                  </span>
                  <span className="font-mono text-accent-400">
                    {formatKopeksToRubles(campaign.total_revenue_kopeks)} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.campaign.conversionRate')}
                  </span>
                  <span className="font-mono text-dark-100">
                    {campaign.conversion_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.campaign.avgCheck')}
                  </span>
                  <span className="font-mono text-dark-100">
                    {formatKopeksToRubles(campaign.avg_check_kopeks)} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Top referrers */}
            {campaign.top_referrers.length > 0 && (
              <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                  {t('admin.referralNetwork.campaign.topReferrers')}
                </h4>
                <div className="space-y-1.5">
                  {campaign.top_referrers.map((referrer, index) => (
                    <div
                      key={referrer.user_id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dark-700 text-[10px] font-medium text-dark-300">
                          {index + 1}
                        </span>
                        <span className="text-dark-200">
                          {referrer.username ? `@${referrer.username}` : `#${referrer.user_id}`}
                        </span>
                      </div>
                      <span className="font-mono text-dark-300">{referrer.referral_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
