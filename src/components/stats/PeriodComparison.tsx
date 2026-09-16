import { useTranslation } from 'react-i18next';

import type { PeriodComparison as PeriodComparisonType } from './types';
import { TREND_STYLES } from './constants';
import { PARTNER_STATS } from '../../constants/partner';
import { useCurrency } from '../../hooks/useCurrency';

interface PeriodComparisonProps {
  data: PeriodComparisonType;
  title?: string;
  countLabel?: string;
  earningsLabel?: string;
  comparisonLabel?: string;
}

interface TrendBadgeProps {
  trend: 'up' | 'down' | 'stable';
  percent: number;
}

function TrendBadge({ trend, percent }: TrendBadgeProps) {
  const style = TREND_STYLES[trend];
  return (
    <span className={`text-sm font-medium ${style.className}`}>
      {style.arrow} {Math.abs(percent)}%
    </span>
  );
}

export function PeriodComparison({
  data,
  title,
  countLabel,
  earningsLabel,
  comparisonLabel,
}: PeriodComparisonProps) {
  const { t } = useTranslation();
  const { formatWithCurrency } = useCurrency();

  const resolvedTitle = title ?? t('referral.partner.stats.periodComparison');
  const resolvedCountLabel = countLabel ?? t('referral.partner.stats.referralsCount');
  const resolvedEarningsLabel = earningsLabel ?? t('referral.partner.stats.earningsAmount');
  const resolvedComparisonLabel = comparisonLabel ?? t('referral.partner.stats.vsLastWeek');

  return (
    <div className="bento-card">
      <h4 className="mb-3 text-sm font-semibold text-dark-200">{resolvedTitle}</h4>
      <div className="grid grid-cols-2 gap-3">
        {/* Count comparison */}
        <div className="rounded-xl bg-dark-800/30 p-3">
          <div className="text-xs text-dark-500">{resolvedCountLabel}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-dark-100 sm:text-lg">
              {data.current.referrals_count}
            </span>
            <TrendBadge
              trend={data.referrals_change.trend}
              percent={data.referrals_change.percent}
            />
          </div>
          <div className="mt-0.5 text-xs text-dark-500">{resolvedComparisonLabel}</div>
        </div>

        {/* Earnings comparison */}
        <div className="rounded-xl bg-dark-800/30 p-3">
          <div className="text-xs text-dark-500">{resolvedEarningsLabel}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            {/* Сумма не рвётся, а тренд при нехватке места уходит строкой ниже —
                раньше «↑ 25%» выталкивало за плитку. */}
            <span className="whitespace-nowrap text-base font-semibold text-success-400 sm:text-lg">
              {formatWithCurrency(data.current.earnings_kopeks / PARTNER_STATS.KOPEKS_DIVISOR)}
            </span>
            <TrendBadge trend={data.earnings_change.trend} percent={data.earnings_change.percent} />
          </div>
          <div className="mt-0.5 text-xs text-dark-500">{resolvedComparisonLabel}</div>
        </div>
      </div>
    </div>
  );
}
