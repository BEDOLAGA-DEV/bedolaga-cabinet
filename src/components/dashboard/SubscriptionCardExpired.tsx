import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Subscription } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { getGlassColors } from '../../utils/glassTheme';

interface SubscriptionCardExpiredProps {
  subscription: Subscription;
}

export default function SubscriptionCardExpired({ subscription }: SubscriptionCardExpiredProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  return (
    <div
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: g.cardBg,
        border: '1px solid rgba(255,70,70,0.12)',
        boxShadow: g.shadow,
        padding: '28px 28px 24px',
      }}
    >
      {/* Red glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,59,92,0.08) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        {/* Clock icon */}
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
          style={{
            background: 'rgba(255,59,92,0.1)',
            border: '1px solid rgba(255,59,92,0.15)',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF3B5C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight text-dark-50">
          {subscription.is_trial ? t('dashboard.expired.trialTitle') : t('dashboard.expired.title')}
        </h2>
      </div>

      {/* Expired date */}
      <div
        className="mb-5 flex items-center justify-center rounded-[14px]"
        style={{
          background: 'rgba(255,59,92,0.04)',
          border: '1px solid rgba(255,59,92,0.08)',
          padding: '14px 18px',
        }}
      >
        <div className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-dark-50/30">
          {t('dashboard.expired.expiredDate')}
        </div>
        <div className="ml-3 text-base font-bold tracking-tight text-dark-50/50">
          {formattedDate}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2.5">
        <Link
          to="/subscription/purchase"
          className="flex flex-1 items-center justify-center rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #FF3B5C, #FF6B35)',
            boxShadow: '0 4px 20px rgba(255,59,92,0.2)',
          }}
        >
          {t('dashboard.expired.renew')}
        </Link>
        <Link
          to="/subscription/purchase"
          className="flex items-center justify-center rounded-[14px] px-5 py-3.5 text-[15px] font-semibold tracking-tight text-dark-50/50 transition-colors duration-200"
          style={{
            background: g.innerBg,
            border: `1px solid ${g.innerBorder}`,
          }}
        >
          {t('dashboard.expired.tariffs')}
        </Link>
      </div>
    </div>
  );
}
