import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { brandingApi } from '../api/branding';
import { partnerApi } from '../api/partners';
import { withdrawalApi } from '../api/withdrawals';
import { useCurrency } from '../hooks/useCurrency';

const LinkIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
    />
  </svg>
);

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 8l5-5m0 0l5 5m-5-5v12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
  </svg>
);

const PartnerIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WalletIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

function getWithdrawalStatusBadge(status: string): string {
  switch (status) {
    case 'completed':
      return 'badge-success';
    case 'approved':
      return 'badge-info';
    case 'pending':
      return 'badge-warning';
    case 'rejected':
    case 'cancelled':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

export default function Referral() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount, currencySymbol, formatPositive, formatWithCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data: info, isLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  // Build referral link for cabinet registration
  const referralLink = info?.referral_code
    ? `${window.location.origin}/login?ref=${info.referral_code}`
    : '';

  const { data: terms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
  });

  const { data: referralList } = useQuery({
    queryKey: ['referral-list'],
    queryFn: () => referralApi.getReferralList({ per_page: 10 }),
  });

  const { data: earnings } = useQuery({
    queryKey: ['referral-earnings'],
    queryFn: () => referralApi.getReferralEarnings({ per_page: 10 }),
  });

  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: brandingApi.getBranding,
    staleTime: 60000,
  });

  // Partner status query
  const { data: partnerStatus } = useQuery({
    queryKey: ['partner-status'],
    queryFn: partnerApi.getStatus,
  });

  const isPartner = partnerStatus?.partner_status === 'approved';

  // Withdrawal queries (only when partner is approved)
  const { data: withdrawalBalance } = useQuery({
    queryKey: ['withdrawal-balance'],
    queryFn: withdrawalApi.getBalance,
    enabled: isPartner,
  });

  const { data: withdrawalHistory } = useQuery({
    queryKey: ['withdrawal-history'],
    queryFn: withdrawalApi.getHistory,
    enabled: isPartner,
  });

  // Withdrawal cancel mutation
  const cancelWithdrawalMutation = useMutation({
    mutationFn: withdrawalApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-balance'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
    },
  });

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = () => {
    if (!referralLink) return;
    const shareText = t('referral.shareMessage', {
      percent: info?.commission_percent || 0,
      botName: branding?.name || import.meta.env.VITE_APP_NAME || 'Cabinet',
    });

    if (navigator.share) {
      navigator
        .share({
          title: t('referral.title'),
          text: shareText,
          url: referralLink,
        })
        .catch(() => {
          // ignore cancellation errors
        });
      return;
    }

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink,
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Show disabled state if referral program is disabled
  if (terms && !terms.is_enabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-dark-800">
          <svg
            className="h-12 w-12 text-dark-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
            />
          </svg>
        </div>
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold text-dark-100">{t('referral.title')}</h1>
          <p className="text-dark-400">{t('referral.disabled')}</p>
        </div>
      </div>
    );
  }

  const partnerStatusValue = partnerStatus?.partner_status ?? 'none';
  const showApplySection = partnerStatusValue === 'none';
  const showPendingSection = partnerStatusValue === 'pending';
  const showApprovedSection = partnerStatusValue === 'approved';
  const showRejectedSection = partnerStatusValue === 'rejected';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('referral.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="bento-card-hover col-span-2 md:col-span-1">
          <div className="text-sm text-dark-400">{t('referral.stats.totalReferrals')}</div>
          <div className="stat-value mt-1">{info?.total_referrals || 0}</div>
          <div className="mt-1 text-sm text-dark-500">
            {info?.active_referrals || 0} {t('referral.stats.activeReferrals').toLowerCase()}
          </div>
        </div>
        <div className="bento-card-hover">
          <div className="text-sm text-dark-400">{t('referral.stats.totalEarnings')}</div>
          <div className="stat-value mt-1 text-success-400">
            {formatPositive(info?.total_earnings_rubles || 0)}
          </div>
        </div>
        <div className="bento-card-hover">
          <div className="text-sm text-dark-400">{t('referral.stats.commissionRate')}</div>
          <div className="stat-value mt-1 text-accent-400">{info?.commission_percent || 0}%</div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.yourLink')}</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input type="text" readOnly value={referralLink} className="input flex-1" />
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              disabled={!referralLink}
              className={`btn-primary px-5 ${
                copied ? 'bg-success-500 hover:bg-success-500' : ''
              } ${!referralLink ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              <span className="ml-2">{copied ? t('referral.copied') : t('referral.copyLink')}</span>
            </button>
            <button
              onClick={shareLink}
              disabled={!referralLink}
              className={`btn-secondary flex items-center px-5 ${
                !referralLink ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <ShareIcon />
              <span className="ml-2">{t('referral.shareButton')}</span>
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-dark-500">
          {t('referral.shareHint', { percent: info?.commission_percent || 0 })}
        </p>
      </div>

      {/* Program Terms */}
      {terms && (
        <div className="bento-card">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.terms.title')}</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.commission')}</div>
              <div className="mt-1 text-lg font-semibold text-dark-100">
                {terms.commission_percent}%
              </div>
            </div>
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.minTopup')}</div>
              <div className="mt-1 text-lg font-semibold text-dark-100">
                {formatAmount(terms.minimum_topup_rubles)} {currencySymbol}
              </div>
            </div>
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.newUserBonus')}</div>
              <div className="mt-1 text-lg font-semibold text-success-400">
                {formatPositive(terms.first_topup_bonus_rubles)}
              </div>
            </div>
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.inviterBonus')}</div>
              <div className="mt-1 text-lg font-semibold text-success-400">
                {formatPositive(terms.inviter_bonus_rubles)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referrals List */}
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.yourReferrals')}</h2>
        {referralList?.items && referralList.items.length > 0 ? (
          <div className="space-y-3">
            {referralList.items.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
              >
                <div>
                  <div className="font-medium text-dark-100">
                    {ref.first_name || ref.username || `User #${ref.id}`}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {new Date(ref.created_at).toLocaleDateString()}
                  </div>
                </div>
                {ref.has_paid ? (
                  <span className="badge-success">{t('referral.status.paid')}</span>
                ) : (
                  <span className="badge-neutral">{t('referral.status.pending')}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
              <svg
                className="h-8 w-8 text-dark-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <div className="text-dark-400">{t('referral.noReferrals')}</div>
          </div>
        )}
      </div>

      {/* Earnings History */}
      {earnings?.items && earnings.items.length > 0 && (
        <div className="bento-card">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">
            {t('referral.earningsHistory')}
          </h2>
          <div className="space-y-3">
            {earnings.items.map((earning) => (
              <div
                key={earning.id}
                className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
              >
                <div>
                  <div className="text-dark-100">
                    {earning.referral_first_name || earning.referral_username || 'Referral'}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {t(`referral.reasons.${earning.reason}`, earning.reason)} •{' '}
                    {new Date(earning.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-semibold text-success-400">
                  {formatPositive(earning.amount_rubles)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== Partner Application Section ==================== */}

      {/* Status: none — Become a Partner CTA */}
      {terms?.partner_section_visible !== false && showApplySection && (
        <div className="bento-card">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-400">
              <PartnerIcon />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.becomePartner')}
              </h2>
              <p className="mt-1 text-sm text-dark-400">
                {t('referral.partner.becomePartnerDesc')}
              </p>
              <button
                onClick={() => navigate('/referral/partner/apply')}
                className="btn-primary mt-4 px-6"
              >
                {t('referral.partner.applyButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status: pending — Application Under Review */}
      {terms?.partner_section_visible !== false && showPendingSection && (
        <div className="bento-card border-warning-500/20">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warning-500/10 text-warning-400">
              <ClockIcon />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.underReview')}
              </h2>
              <p className="mt-1 text-sm text-dark-400">{t('referral.partner.underReviewDesc')}</p>
              {partnerStatus?.latest_application?.created_at && (
                <p className="mt-2 text-xs text-dark-500">
                  {t('referral.partner.submittedAt', {
                    date: new Date(
                      partnerStatus.latest_application.created_at,
                    ).toLocaleDateString(),
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status: approved — Partner Badge */}
      {terms?.partner_section_visible !== false && showApprovedSection && (
        <div className="bento-card border-success-500/20">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-success-500/10 text-success-400">
              <PartnerIcon />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-dark-100">
                  {t('referral.partner.partnerStatus')}
                </h2>
                <span className="badge-success">{t('referral.partner.active')}</span>
              </div>
              <p className="mt-1 text-sm text-dark-400">
                {t('referral.partner.commissionInfo', {
                  percent: partnerStatus?.commission_percent ?? 0,
                })}
              </p>
            </div>
            <a href="#withdrawal-section" className="btn-secondary hidden px-4 sm:flex">
              {t('referral.withdrawal.goToWithdrawal')}
            </a>
          </div>
        </div>
      )}

      {/* Status: rejected — Rejection Notice */}
      {terms?.partner_section_visible !== false && showRejectedSection && (
        <div className="bento-card border-error-500/20">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-error-500/10 text-error-400">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.rejected')}
              </h2>
              {partnerStatus?.latest_application?.admin_comment && (
                <p className="mt-1 text-sm text-dark-300">
                  {partnerStatus.latest_application.admin_comment}
                </p>
              )}
              <button
                onClick={() => navigate('/referral/partner/apply')}
                className="btn-primary mt-4 px-6"
              >
                {t('referral.partner.reapplyButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Partner Campaigns Section ==================== */}

      {terms?.partner_section_visible !== false &&
        isPartner &&
        partnerStatus?.campaigns &&
        partnerStatus.campaigns.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
                <LinkIcon />
              </div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('referral.partner.yourCampaigns')}
              </h2>
            </div>

            {partnerStatus.campaigns.map((campaign) => {
              const copyLink = (url: string, key: string) => {
                navigator.clipboard.writeText(url);
                setCopiedLink(key);
                setTimeout(() => setCopiedLink(null), 2000);
              };

              const botKey = `${campaign.id}-bot`;
              const webKey = `${campaign.id}-web`;

              return (
                <div key={campaign.id} className="bento-card space-y-4">
                  {/* Campaign header */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-dark-100">{campaign.name}</h3>
                  </div>

                  {/* Bonus info */}
                  {campaign.bonus_type !== 'none' && (
                    <div className="rounded-lg bg-success-500/10 p-3">
                      <div className="mb-1 text-xs font-medium text-success-500">
                        {t('referral.partner.campaignBonus.title')}
                      </div>
                      <div className="text-sm font-semibold text-success-400">
                        {campaign.bonus_type === 'balance' &&
                          t('referral.partner.campaignBonus.balanceDesc', {
                            amount: formatWithCurrency(campaign.balance_bonus_kopeks / 100, 0),
                          })}
                        {campaign.bonus_type === 'subscription' &&
                          t('referral.partner.campaignBonus.subscriptionDesc', {
                            days: campaign.subscription_duration_days ?? 0,
                            ...(campaign.subscription_traffic_gb
                              ? { traffic: campaign.subscription_traffic_gb }
                              : {}),
                          })}
                        {campaign.bonus_type === 'tariff' &&
                          t('referral.partner.campaignBonus.tariffDesc')}
                      </div>
                    </div>
                  )}

                  {/* Bot link */}
                  {campaign.deep_link && (
                    <div>
                      <div className="mb-1 text-xs font-medium text-dark-500">
                        {t('referral.partner.campaignLinks.bot')}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={campaign.deep_link}
                          className="input flex-1 text-xs"
                        />
                        <button
                          onClick={() => copyLink(campaign.deep_link!, botKey)}
                          className={`btn-primary shrink-0 px-3 py-2 ${
                            copiedLink === botKey ? 'bg-success-500 hover:bg-success-500' : ''
                          }`}
                        >
                          {copiedLink === botKey ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Web link */}
                  {campaign.web_link && (
                    <div>
                      <div className="mb-1 text-xs font-medium text-dark-500">
                        {t('referral.partner.campaignLinks.web')}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={campaign.web_link}
                          className="input flex-1 text-xs"
                        />
                        <button
                          onClick={() => copyLink(campaign.web_link!, webKey)}
                          className={`btn-primary shrink-0 px-3 py-2 ${
                            copiedLink === webKey ? 'bg-success-500 hover:bg-success-500' : ''
                          }`}
                        >
                          {copiedLink === webKey ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      {/* ==================== Withdrawal Section (approved partners only) ==================== */}

      {terms?.partner_section_visible !== false && isPartner && (
        <div id="withdrawal-section" className="space-y-6">
          {/* Withdrawal Balance Card */}
          {withdrawalBalance && (
            <div className="bento-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
                  <WalletIcon />
                </div>
                <h2 className="text-lg font-semibold text-dark-100">
                  {t('referral.withdrawal.title')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="col-span-2 rounded-xl bg-dark-800/30 p-4 md:col-span-1">
                  <div className="text-sm text-dark-500">{t('referral.withdrawal.available')}</div>
                  <div className="mt-1 text-2xl font-bold text-success-400">
                    {formatWithCurrency(withdrawalBalance.available_total / 100)}
                  </div>
                </div>
                <div className="rounded-xl bg-dark-800/30 p-3">
                  <div className="text-sm text-dark-500">
                    {t('referral.withdrawal.totalEarned')}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-dark-100">
                    {formatWithCurrency(withdrawalBalance.total_earned / 100)}
                  </div>
                </div>
                <div className="rounded-xl bg-dark-800/30 p-3">
                  <div className="text-sm text-dark-500">{t('referral.withdrawal.withdrawn')}</div>
                  <div className="mt-1 text-lg font-semibold text-dark-100">
                    {formatWithCurrency(withdrawalBalance.withdrawn / 100)}
                  </div>
                </div>
                <div className="rounded-xl bg-dark-800/30 p-3">
                  <div className="text-sm text-dark-500">{t('referral.withdrawal.spent')}</div>
                  <div className="mt-1 text-lg font-semibold text-dark-100">
                    {formatWithCurrency(withdrawalBalance.referral_spent / 100)}
                  </div>
                </div>
                <div className="rounded-xl bg-dark-800/30 p-3">
                  <div className="text-sm text-dark-500">{t('referral.withdrawal.pending')}</div>
                  <div className="mt-1 text-lg font-semibold text-warning-400">
                    {formatWithCurrency(withdrawalBalance.pending / 100)}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => navigate('/referral/withdrawal/request')}
                  disabled={!withdrawalBalance.can_request}
                  className={`btn-primary w-full px-6 sm:w-auto ${
                    !withdrawalBalance.can_request ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  {t('referral.withdrawal.requestButton')}
                </button>
                {!withdrawalBalance.can_request && withdrawalBalance.cannot_request_reason ? (
                  <p className="mt-2 text-xs text-dark-500">
                    {withdrawalBalance.cannot_request_reason}
                  </p>
                ) : (
                  withdrawalBalance.min_amount_kopeks > 0 && (
                    <p className="mt-2 text-xs text-dark-500">
                      {t('referral.withdrawal.minAmount', {
                        amount: formatWithCurrency(withdrawalBalance.min_amount_kopeks / 100),
                      })}
                    </p>
                  )
                )}
              </div>
            </div>
          )}

          {/* Withdrawal History */}
          <div className="bento-card">
            <h2 className="mb-4 text-lg font-semibold text-dark-100">
              {t('referral.withdrawal.history')}
            </h2>
            {withdrawalHistory?.items && withdrawalHistory.items.length > 0 ? (
              <div className="space-y-3">
                {withdrawalHistory.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-100">
                          {formatWithCurrency(item.amount_rubles)}
                        </span>
                        <span className={getWithdrawalStatusBadge(item.status)}>
                          {t(`referral.withdrawal.status.${item.status}`, item.status)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-dark-500">
                        {new Date(item.created_at).toLocaleDateString()}
                        {item.payment_details && (
                          <span className="ml-1">
                            &bull;{' '}
                            {item.payment_details.length > 40
                              ? `${item.payment_details.slice(0, 40)}...`
                              : item.payment_details}
                          </span>
                        )}
                      </div>
                      {item.admin_comment && (
                        <div className="mt-1 text-xs text-dark-400">{item.admin_comment}</div>
                      )}
                    </div>
                    {item.status === 'pending' && (
                      <button
                        onClick={() => cancelWithdrawalMutation.mutate(item.id)}
                        disabled={cancelWithdrawalMutation.isPending}
                        className="ml-3 shrink-0 text-sm text-error-400 transition-colors hover:text-error-300"
                      >
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="text-dark-400">{t('referral.withdrawal.noHistory')}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
