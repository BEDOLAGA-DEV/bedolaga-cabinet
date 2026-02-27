import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import type { Subscription } from '../../types';

interface PurchaseCTAButtonProps {
  subscription: Subscription | null;
}

export default function PurchaseCTAButton({ subscription }: PurchaseCTAButtonProps) {
  const { t } = useTranslation();

  const isExpired = !subscription || (!subscription.is_active && !subscription.is_trial);
  const isTrial = subscription?.is_trial;

  const accentColor = isExpired ? '#FF3B5C' : '#3EDBB0';

  const buttonText = isExpired
    ? t('subscription.getSubscription')
    : isTrial
      ? t('subscription.trialUpgrade.title')
      : t('subscription.extend');

  const hintText = isExpired
    ? t('subscription.cta.expiredHint')
    : isTrial
      ? t('subscription.cta.trialHint')
      : t('subscription.cta.activeHint');

  return (
    <Link to="/subscription/purchase" className="block">
      <HoverBorderGradient
        accentColor={accentColor}
        duration={4}
        className="group relative w-full cursor-pointer overflow-hidden rounded-2xl"
      >
        <div
          className="relative flex items-center justify-between rounded-[14px] px-5 py-4 transition-colors duration-300"
          style={{
            background: isExpired
              ? 'linear-gradient(135deg, rgba(255,59,92,0.08), rgba(255,107,53,0.06))'
              : 'linear-gradient(135deg, rgba(62,219,176,0.08), rgba(0,229,160,0.06))',
          }}
        >
          {/* Left: icon + text */}
          <div className="flex items-center gap-3">
            {/* Sparkle icon */}
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isExpired ? 'rgba(255,59,92,0.12)' : 'rgba(62,219,176,0.12)',
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={accentColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-dark-50">{buttonText}</div>
              <div className="text-[12px] text-dark-50/40">{hintText}</div>
            </div>
          </div>

          {/* Right: chevron */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="flex-shrink-0 text-dark-50/30 transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </HoverBorderGradient>
    </Link>
  );
}
