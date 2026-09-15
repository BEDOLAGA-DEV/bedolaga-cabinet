import { useTranslation } from 'react-i18next';

import type { CampaignReferralItem } from '../../api/partners';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';

interface TopReferralsProps {
  referrals: CampaignReferralItem[];
}

interface StatusBadgeProps {
  hasPaid: boolean;
  isActive: boolean;
}

function StatusBadge({ hasPaid, isActive }: StatusBadgeProps) {
  const { t } = useTranslation();

  if (isActive) {
    return <span className="badge-success">{t('referral.partner.stats.active')}</span>;
  }
  if (hasPaid) {
    return <span className="badge-info">{t('referral.partner.stats.paid')}</span>;
  }
  return <span className="badge-neutral">{t('referral.partner.stats.pending')}</span>;
}

export function TopReferrals({ referrals }: TopReferralsProps) {
  const { t, i18n } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  if (referrals.length === 0) {
    return (
      <div className="bento-card py-6 text-center">
        <div className="text-sm text-dark-400">{t('referral.partner.stats.noReferrals')}</div>
      </div>
    );
  }

  return (
    <div className="bento-card">
      <h4 className="mb-3 text-sm font-semibold text-dark-200">
        {t('referral.partner.stats.topReferrals')}
      </h4>
      <div className="space-y-2">
        {referrals.map((ref) => (
          <div
            key={ref.id}
            // Имя не режется до «Ма…»: переносится, бейдж при нехватке места
            // уходит строкой ниже; сумма отделена зазором и не сжимается.
            className="flex items-center justify-between gap-3 rounded-xl border border-dark-700/30 bg-dark-800/30 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="min-w-0 text-sm font-medium text-dark-100 [overflow-wrap:anywhere]">
                  {ref.full_name}
                </span>
                <StatusBadge hasPaid={ref.has_paid} isActive={ref.is_active} />
              </div>
              <div className="mt-0.5 text-xs text-dark-500">
                {new Date(ref.created_at).toLocaleDateString(i18n.language)}
              </div>
            </div>
            <div className="shrink-0 whitespace-nowrap text-sm font-semibold text-success-400">
              {formatWithCurrency(ref.total_earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
