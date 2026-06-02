import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { usePlatform } from '../platform';
import { copyToClipboard } from '../utils/clipboard';
import { brandingApi } from '../api/branding';
import { partnerApi } from '../api/partners';
import { withdrawalApi } from '../api/withdrawals';
import { CampaignCard } from '../components/partner/CampaignCard';
import { useCurrency } from '../hooks/useCurrency';
import {
  CheckIcon,
  ClockIcon,
  CopyIcon,
  ExclamationIcon,
  LinkIcon,
  PartnerIcon,
  ShareIcon,
  TelegramIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/icons';

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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount, currencySymbol, formatPositive, formatWithCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState<'cabinet' | 'bot' | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const { data: info, isLoading } = useQuery({
    queryKey: ['referral-info'],
    queryFn: referralApi.getReferralInfo,
  });

  // Build referral link for cabinet registration
  const referralLink = info?.referral_code
    ? `${window.location.origin}/login?ref=${info.referral_code}`
    : '';
  const botReferralLink = info?.bot_referral_link || '';

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

  const programTerms = useMemo(() => {
    if (!terms) return null;
    const showNewUserBonus = terms.first_topup_bonus_kopeks > 0;
    const showInviterBonus = terms.inviter_bonus_kopeks > 0;
    const cardCount = 2 + (showNewUserBonus ? 1 : 0) + (showInviterBonus ? 1 : 0);
    const gridColsMap: Record<number, string> = {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    };
    const gridCols = gridColsMap[cardCount] ?? 'md:grid-cols-4';

    return (
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.terms.title')}</h2>
        <div className={`grid grid-cols-2 gap-4 ${gridCols}`}>
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
          {showNewUserBonus && (
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.newUserBonus')}</div>
              <div className="mt-1 text-lg font-semibold text-success-400">
                {formatPositive(terms.first_topup_bonus_rubles)}
              </div>
            </div>
          )}
          {showInviterBonus && (
            <div className="rounded-xl bg-dark-800/30 p-3">
              <div className="text-sm text-dark-500">{t('referral.terms.inviterBonus')}</div>
              <div className="mt-1 text-lg font-semibold text-success-400">
                {formatPositive(terms.inviter_bonus_rubles)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [terms, t, formatAmount, formatPositive, currencySymbol]);

  const copyLink = async (link: string, type: 'cabinet' | 'bot') => {
    if (!link) return;
    try {
      await copyToClipboard(link);
      setCopiedLink(type);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  const { openTelegramLink } = usePlatform();

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
        .catch(() => {});
      return;
    }

    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink,
    )}&text=${encodeURIComponent(shareText)}`;
    openTelegramLink(telegramUrl);
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
          <UsersIcon className="h-12 w-12 text-dark-500" />
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

      {/* Referral Links */}
      <div className="bento-card">
        <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('referral.yourLink')}</h2>
        <div className="space-y-3">
          {/* Bot link */}
          {botReferralLink && (
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-300">
                <TelegramIcon className="h-4 w-4 text-accent-400" />
                {t('referral.botLink')}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  readOnly
                  value={botReferralLink}
                  className="input flex-1 text-sm"
                />
                <button
                  onClick={() => copyLink(botReferralLink, 'bot')}
                  className={`btn-primary shrink-0 px-4 ${
                    copiedLink === 'bot' ? 'bg-success-500 hover:bg-success-500' : ''
                  }`}
                >
                  {copiedLink === 'bot' ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copiedLink === 'bot' ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </button>
              </div>
            </div>
          )}
          {/* Cabinet link */}
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-medium text-dark-300">
              <LinkIcon className="h-4 w-4 text-accent-400" />
              {t('referral.cabinetLink')}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="text" readOnly value={referralLink} className="input flex-1 text-sm" />
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(referralLink, 'cabinet')}
                  disabled={!referralLink}
                  className={`btn-primary shrink-0 px-4 ${
                    copiedLink === 'cabinet' ? 'bg-success-500 hover:bg-success-500' : ''
                  } ${!referralLink ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {copiedLink === 'cabinet' ? <CheckIcon /> : <CopyIcon />}
                  <span className="ml-2">
                    {copiedLink === 'cabinet' ? t('referral.copied') : t('referral.copyLink')}
                  </span>
                </button>
                <button
                  onClick={shareLink}
                  disabled={!referralLink}
                  className={`btn-secondary flex shrink-0 items-center px-4 ${
                    !referralLink ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <ShareIcon className="h-4 w-4" />
                  <span className="ml-2">{t('referral.shareButton')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-dark-500">
          {t('referral.shareHint', { percent: info?.commission_percent || 0 })}
        </p>
      </div>

      {/* Program Terms */}
      {programTerms}

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
                    {ref.first_name || ref.username || t('referral.anonymousUser', { id: ref.id })}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {new Date(ref.created_at).toLocaleDateString(i18n.language)}
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
              <UsersIcon className="h-8 w-8 text-dark-500" />
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
                    {earning.referral_first_name ||
                      earning.referral_username ||
                      t('referral.anonymousReferral')}
                  </div>
                  <div className="mt-0.5 text-xs text-dark-500">
                    {t(`referral.reasons.${earning.reason}`, earning.reason)} •{' '}
                    {new Date(earning.created_at).toLocaleDateString(i18n.language)}
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
              <PartnerIcon className="h-8 w-8" />
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
                    date: new Date(partnerStatus.latest_application.created_at).toLocaleDateString(
                      i18n.language,
                    ),
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
              <PartnerIcon className="h-8 w-8" />
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
              <ExclamationIcon className="h-8 w-8" />
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

            {partnerStatus.campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
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
                  <WalletIcon className="h-8 w-8" />
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
                        {new Date(item.created_at).toLocaleDateString(i18n.language)}
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
