import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Subscription } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';

interface StatsGridProps {
  balanceRubles: number;
  subscription: Subscription | null;
  subLoading: boolean;
  referralCount: number;
  earningsRubles: number;
  refLoading: boolean;
}

const ArrowRightIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const WalletIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h5.25A2.25 2.25 0 0121 6v6zm0 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const UsersIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const CoinIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function StatsGrid({
  balanceRubles,
  subscription,
  subLoading,
  referralCount,
  earningsRubles,
  refLoading,
}: StatsGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol, formatPositive } = useCurrency();

  return (
    <div className="bento-grid">
      {/* Balance */}
      <Link to="/balance" className="bento-card-hover group" data-onboarding="balance">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <WalletIcon />
          </div>
          <span className="text-dark-600 transition-colors group-hover:text-accent-400">
            <ArrowRightIcon />
          </span>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider text-dark-500">
          {t('dashboard.stats.balance')}
        </div>
        <div className="mt-1 font-display text-2xl font-bold text-accent-400">
          {formatAmount(balanceRubles)}
          <span className="ml-1 text-base text-dark-500">{currencySymbol}</span>
        </div>
      </Link>

      {/* Subscription Days */}
      <Link
        to="/subscription"
        className="bento-card-hover group"
        data-onboarding="subscription-status"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <CalendarIcon />
          </div>
          <span className="text-dark-600 transition-colors group-hover:text-accent-400">
            <ArrowRightIcon />
          </span>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider text-dark-500">
          {t('dashboard.stats.subscription')}
        </div>
        {subLoading ? (
          <div className="skeleton mt-1 h-8 w-16" />
        ) : subscription ? (
          <div className="mt-1 font-display text-2xl font-bold text-dark-50">
            {subscription.days_left > 0 ? (
              <>
                {subscription.days_left}
                <span className="ml-1 text-base text-dark-500">{t('subscription.days')}</span>
              </>
            ) : subscription.hours_left > 0 ? (
              <>
                {subscription.hours_left}
                <span className="ml-1 text-base text-dark-500">{t('subscription.hours')}</span>
              </>
            ) : (
              <span className="text-error-400">{t('subscription.expired')}</span>
            )}
          </div>
        ) : (
          <div className="mt-1 font-display text-lg font-bold text-error-400">
            {t('subscription.inactive')}
          </div>
        )}
      </Link>

      {/* Referrals */}
      <Link to="/referral" className="bento-card-hover group">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <UsersIcon />
          </div>
          <span className="text-dark-600 transition-colors group-hover:text-accent-400">
            <ArrowRightIcon />
          </span>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider text-dark-500">
          {t('dashboard.stats.referrals')}
        </div>
        {refLoading ? (
          <div className="skeleton mt-1 h-8 w-12" />
        ) : (
          <div className="mt-1 font-display text-2xl font-bold text-dark-50">{referralCount}</div>
        )}
      </Link>

      {/* Earnings */}
      <Link to="/referral" className="bento-card-hover group">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/15 text-success-400">
            <CoinIcon />
          </div>
          <span className="text-dark-600 transition-colors group-hover:text-accent-400">
            <ArrowRightIcon />
          </span>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider text-dark-500">
          {t('dashboard.stats.earnings')}
        </div>
        {refLoading ? (
          <div className="skeleton mt-1 h-8 w-16" />
        ) : (
          <div className="mt-1 font-display text-2xl font-bold text-success-400">
            {formatPositive(earningsRubles)}
          </div>
        )}
      </Link>
    </div>
  );
}
