import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { referralApi } from '../api/referral';
import { brandingApi } from '../api/branding';
import { useCurrency } from '../hooks/useCurrency';

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

export default function Referral() {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol, formatPositive } = useCurrency();
  const [copied, setCopied] = useState(false);

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
    </div>
  );
}
