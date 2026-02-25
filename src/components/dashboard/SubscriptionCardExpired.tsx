import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Subscription } from '../../types';

interface SubscriptionCardExpiredProps {
  subscription: Subscription;
}

const ClockIcon = () => (
  <svg
    className="h-6 w-6 text-error-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function SubscriptionCardExpired({ subscription }: SubscriptionCardExpiredProps) {
  const { t } = useTranslation();

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  return (
    <div className="bento-card border-error-500/30 bg-gradient-to-br from-error-500/5 to-transparent">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-error-500/15">
          <ClockIcon />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark-100">
            {subscription.is_trial
              ? t('dashboard.expired.trialTitle')
              : t('dashboard.expired.title')}
          </h3>
        </div>
        <span className="badge-error">{t('subscription.expired')}</span>
      </div>

      {/* 3-column info */}
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-xl bg-dark-800/40 p-4">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-dark-300">0</div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('dashboard.expired.traffic')}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-dark-300">0</div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('dashboard.expired.devices')}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-sm font-bold text-dark-300">{formattedDate}</div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('dashboard.expired.expiredDate')}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/subscription"
          state={{ scrollToExtend: true }}
          className="flex items-center justify-center rounded-xl bg-gradient-to-r from-error-600 to-error-500 py-2.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t('dashboard.expired.renew')}
        </Link>
        <Link
          to="/subscription"
          className="flex items-center justify-center rounded-xl border border-dark-600 py-2.5 text-center text-sm font-medium text-dark-200 transition-colors hover:border-dark-500 hover:bg-dark-800/50"
        >
          {t('dashboard.expired.tariffs')}
        </Link>
      </div>
    </div>
  );
}
