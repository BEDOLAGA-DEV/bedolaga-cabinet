import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { useCurrency } from '../hooks/useCurrency';

// Status badge config — keys must match backend PartnerStatus enum values
const statusConfig: Record<string, { labelKey: string; color: string; bgColor: string }> = {
  approved: {
    labelKey: 'admin.partnerDetail.status.approved',
    color: 'text-success-400',
    bgColor: 'bg-success-500/20',
  },
  pending: {
    labelKey: 'admin.partnerDetail.status.pending',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  rejected: {
    labelKey: 'admin.partnerDetail.status.rejected',
    color: 'text-error-400',
    bgColor: 'bg-error-500/20',
  },
  none: {
    labelKey: 'admin.partnerDetail.status.none',
    color: 'text-dark-400',
    bgColor: 'bg-dark-600',
  },
};

const unknownStatus = {
  labelKey: 'admin.partnerDetail.status.none',
  color: 'text-dark-400',
  bgColor: 'bg-dark-600',
};

export default function AdminPartnerDetail() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatWithCurrency } = useCurrency();

  const unassignMutation = useMutation({
    mutationFn: (campaignId: number) => partnerApi.unassignCampaign(Number(userId), campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', userId] });
    },
  });

  // Fetch partner detail
  const {
    data: partner,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-partner-detail', userId],
    queryFn: () => partnerApi.getPartnerDetail(Number(userId)),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/partners" />
          <h1 className="text-xl font-semibold text-dark-100">{t('admin.partnerDetail.title')}</h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.partnerDetail.loadError')}</p>
          <button
            onClick={() => navigate('/admin/partners')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const badge = statusConfig[partner.partner_status] || unknownStatus;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <AdminBackButton to="/admin/partners" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-dark-100">
              {partner.first_name || partner.username || `#${partner.user_id}`}
            </h1>
            <span className={`rounded px-2 py-0.5 text-xs ${badge.bgColor} ${badge.color}`}>
              {t(badge.labelKey)}
            </span>
          </div>
          {partner.username && <p className="text-sm text-dark-400">@{partner.username}</p>}
        </div>
      </div>

      <div className="space-y-6">
        {/* Referral Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-dark-100">{partner.total_referrals}</div>
            <div className="text-xs text-dark-500">
              {t('admin.partnerDetail.stats.totalReferrals')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-success-400">{partner.paid_referrals}</div>
            <div className="text-xs text-dark-500">
              {t('admin.partnerDetail.stats.paidReferrals')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-accent-400">{partner.active_referrals}</div>
            <div className="text-xs text-dark-500">
              {t('admin.partnerDetail.stats.activeReferrals')}
            </div>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4 text-center">
            <div className="text-2xl font-bold text-accent-400">{partner.conversion_to_paid}%</div>
            <div className="text-xs text-dark-500">
              {t('admin.partnerDetail.stats.conversionRate')}
            </div>
          </div>
        </div>

        {/* Earnings */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.partnerDetail.earnings.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.partnerDetail.earnings.allTime')}
              </div>
              <div className="text-lg font-medium text-success-400">
                {formatWithCurrency(partner.earnings_all_time / 100)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.partnerDetail.earnings.today')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatWithCurrency(partner.earnings_today / 100)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.partnerDetail.earnings.week')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatWithCurrency(partner.earnings_week / 100)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.partnerDetail.earnings.month')}
              </div>
              <div className="text-lg font-medium text-dark-200">
                {formatWithCurrency(partner.earnings_month / 100)}
              </div>
            </div>
          </div>
        </div>

        {/* Commission */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-dark-200">
                {t('admin.partnerDetail.commission.title')}
              </h3>
              <div className="mt-1 text-2xl font-bold text-accent-400">
                {partner.commission_percent ?? 0}%
              </div>
            </div>
            <button
              onClick={() =>
                navigate(`/admin/partners/${userId}/commission`, {
                  state: { currentCommission: partner.commission_percent ?? 0 },
                })
              }
              className="rounded-lg bg-dark-700 px-4 py-2 text-sm text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
            >
              {t('admin.partnerDetail.commission.update')}
            </button>
          </div>
        </div>

        {/* Campaigns */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium text-dark-200">
              {t('admin.partnerDetail.campaigns.title')}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/admin/partners/${userId}/campaigns/assign`)}
                className="rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
              >
                {t('admin.partnerDetail.campaigns.assign')}
              </button>
              <button
                onClick={() => navigate(`/admin/campaigns/create?partnerId=${userId}`)}
                className="rounded-lg bg-accent-500/20 px-3 py-1.5 text-xs font-medium text-accent-400 transition-colors hover:bg-accent-500/30"
              >
                {t('admin.partnerDetail.campaigns.createNew')}
              </button>
            </div>
          </div>
          {partner.campaigns.length === 0 ? (
            <div className="py-4 text-center text-sm text-dark-500">
              {t('admin.partnerDetail.campaigns.noCampaigns')}
            </div>
          ) : (
            <div className="space-y-2">
              {partner.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`flex items-center justify-between rounded-lg bg-dark-700/50 p-3 ${
                    !campaign.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-dark-100">{campaign.name}</div>
                    <div className="font-mono text-xs text-dark-500">
                      ?start={campaign.start_parameter}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {campaign.is_active ? (
                      <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                        {t('admin.partnerDetail.campaigns.active')}
                      </span>
                    ) : (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.partnerDetail.campaigns.inactive')}
                      </span>
                    )}
                    <button
                      onClick={() => unassignMutation.mutate(campaign.id)}
                      disabled={unassignMutation.isPending}
                      className="rounded p-1 text-dark-500 transition-colors hover:bg-error-500/10 hover:text-error-400"
                      title={t('admin.partnerDetail.campaigns.unassign')}
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.partnerDetail.dangerZone.title')}
          </h3>
          <button
            onClick={() => navigate(`/admin/partners/${userId}/revoke`)}
            className="w-full rounded-lg bg-error-500/20 px-4 py-3 text-sm font-medium text-error-400 transition-colors hover:bg-error-500/30"
          >
            {t('admin.partnerDetail.dangerZone.revokeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
