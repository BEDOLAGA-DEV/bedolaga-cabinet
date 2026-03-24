import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { referralNetworkApi } from '@/api/referralNetwork';
import { useReferralNetworkStore } from '@/store/referralNetwork';
import { formatKopeksToRubles, getSubscriptionStatusColor } from '../utils';

interface UserDetailPanelProps {
  userId: number;
  className?: string;
}

export function UserDetailPanel({ userId, className }: UserDetailPanelProps) {
  const { t } = useTranslation();
  const setSelectedNode = useReferralNetworkStore((s) => s.setSelectedNode);

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['referral-network-user', userId],
    queryFn: () => referralNetworkApi.getUserDetail(userId),
    staleTime: 60_000,
  });

  function handleClose() {
    setSelectedNode(null);
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-700/50 p-4">
        <h3 className="text-sm font-semibold text-dark-100">{user?.display_name ?? '...'}</h3>
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

        {user && (
          <div className="space-y-5">
            {/* Identity */}
            <div className="space-y-2">
              {user.username && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">@</span>
                  <span className="font-mono text-dark-200">{user.username}</span>
                </div>
              )}
              {user.tg_id && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">{t('admin.referralNetwork.user.tgId')}</span>
                  <span className="font-mono text-dark-200">{user.tg_id}</span>
                </div>
              )}
              {user.email && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-500">{t('admin.referralNetwork.user.email')}</span>
                  <span className="truncate pl-4 font-mono text-dark-200">{user.email}</span>
                </div>
              )}
              {user.is_partner && (
                <div className="flex justify-end">
                  <span className="rounded bg-warning-500/20 px-2 py-0.5 text-xs font-medium text-warning-400">
                    {t('admin.referralNetwork.user.partner')}
                  </span>
                </div>
              )}
            </div>

            {/* Subscription */}
            <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.referralNetwork.user.subscription')}
              </h4>
              {user.subscription_name ? (
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-dark-100">{user.subscription_name}</p>
                    {user.subscription_status && (
                      <span className="flex items-center gap-1.5 rounded-full bg-dark-700/50 px-2 py-0.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: getSubscriptionStatusColor(user.subscription_status),
                          }}
                        />
                        <span className="text-[10px] font-medium text-dark-300">
                          {t(
                            `admin.referralNetwork.user.subscriptionStatus.${user.subscription_status}`,
                          )}
                        </span>
                      </span>
                    )}
                  </div>
                  {user.subscription_end && (
                    <p className="mt-0.5 text-xs text-dark-400">
                      {t('admin.referralNetwork.user.validUntil', {
                        date: new Date(user.subscription_end).toLocaleDateString(),
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-dark-500">
                  {t('admin.referralNetwork.user.noSubscription')}
                </p>
              )}
            </div>

            {/* Personal stats */}
            <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.referralNetwork.user.personalStats')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.totalSpent')}
                  </span>
                  <span className="font-mono text-dark-100">
                    {formatKopeksToRubles(user.personal_spent_kopeks)} ₽
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.referralEarnings')}
                  </span>
                  <span className="font-mono text-accent-400">
                    {formatKopeksToRubles(user.personal_revenue_kopeks)} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Referral branch */}
            <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.referralNetwork.user.referralBranch')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.directReferrals')}
                  </span>
                  <span className="font-mono text-dark-100">{user.direct_referrals}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.branchSize')}
                  </span>
                  <span className="font-mono text-dark-100">{user.total_branch_users}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.branchRevenue')}
                  </span>
                  <span className="font-mono text-dark-100">
                    {formatKopeksToRubles(user.branch_revenue_kopeks)} ₽
                  </span>
                </div>
              </div>
            </div>

            {/* Source */}
            <div className="rounded-lg border border-dark-700/50 bg-dark-800/40 p-3">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-dark-500">
                {t('admin.referralNetwork.user.source')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">
                    {t('admin.referralNetwork.user.referredBy')}
                  </span>
                  <span className="text-dark-200">
                    {user.referrer_display_name ?? t('admin.referralNetwork.user.organic')}
                  </span>
                </div>
                {user.campaign_name && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">
                      {t('admin.referralNetwork.user.fromCampaign')}
                    </span>
                    <span className="text-dark-200">{user.campaign_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
