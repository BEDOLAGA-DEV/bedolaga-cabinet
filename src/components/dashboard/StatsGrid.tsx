import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Subscription } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import { getTrafficZone } from '../../utils/trafficZone';
import { getGlassColors } from '../../utils/glassTheme';

interface StatsGridProps {
  balanceRubles: number;
  subscription: Subscription | null;
  referralCount: number;
  earningsRubles: number;
  refLoading: boolean;
}

const ChevronIcon = ({ color }: { color: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    <path
      d="M6 4l4 4-4 4"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function StatsGrid({
  balanceRubles,
  subscription,
  referralCount,
  earningsRubles,
  refLoading,
}: StatsGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const zone = useMemo(
    () => getTrafficZone(subscription?.traffic_used_percent ?? 0),
    [subscription?.traffic_used_percent],
  );

  const cards = [
    {
      label: t('dashboard.stats.balance'),
      value: `${formatAmount(balanceRubles)} ${currencySymbol}`,
      valueColor: zone.mainHex,
      to: '/balance',
      icon: (color: string) => (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 14h.01M10 14h.01" />
        </svg>
      ),
      iconBg: `${zone.mainHex}12`,
      iconColor: zone.mainHex,
      loading: false,
      onboarding: 'balance',
    },
    {
      label: t('dashboard.stats.referrals'),
      value: `${referralCount}`,
      valueColor: g.text,
      subtitle: `+${formatAmount(earningsRubles)} ${currencySymbol}`,
      subtitleColor: zone.mainHex,
      to: '/referral',
      icon: (color: string) => (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      iconBg: g.trackBg,
      iconColor: g.textSecondary,
      loading: refLoading,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((card, i) => (
        <Link
          key={i}
          to={card.to}
          className="group relative overflow-hidden rounded-[18px] transition-all duration-200"
          style={{
            background: g.cardBg,
            border: `1px solid ${g.cardBorder}`,
            boxShadow: g.shadow,
            padding: '18px 20px 20px',
          }}
          data-onboarding={card.onboarding}
        >
          {/* Top row: icon + label + arrow */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[9px] transition-colors duration-500"
                style={{ background: card.iconBg }}
              >
                {card.icon(card.iconColor)}
              </div>
              <span className="text-[13px] font-medium text-dark-50/45">{card.label}</span>
            </div>
            <ChevronIcon color={g.textFaint} />
          </div>

          {/* Value */}
          {card.loading ? (
            <div className="skeleton h-8 w-20" />
          ) : (
            <>
              <div
                className="text-[28px] font-bold leading-tight tracking-tight transition-colors duration-500"
                style={{ color: card.valueColor }}
              >
                {card.value}
              </div>
              {card.subtitle && (
                <div
                  className="mt-0.5 text-[13px] font-semibold"
                  style={{ color: card.subtitleColor }}
                >
                  {card.subtitle}
                </div>
              )}
            </>
          )}
        </Link>
      ))}
    </div>
  );
}
