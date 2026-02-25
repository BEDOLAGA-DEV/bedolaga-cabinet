import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import { HoverBorderGradient } from '../ui/hover-border-gradient';
import type { TrialInfo } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';

interface TrialOfferCardProps {
  trialInfo: TrialInfo;
  balanceKopeks: number;
  balanceRubles: number;
  activateTrialMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trialError: string | null;
}

const SparklesIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const BoltIcon = () => (
  <svg
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

export default function TrialOfferCard({
  trialInfo,
  balanceKopeks,
  balanceRubles,
  activateTrialMutation,
  trialError,
}: TrialOfferCardProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const isFree = !trialInfo.requires_payment;
  const canAfford = balanceKopeks >= trialInfo.price_kopeks;

  return (
    <div className="bento-card animate-trial-glow border-accent-500/30 bg-gradient-to-br from-accent-500/5 to-transparent">
      {/* Icon + Title */}
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-400">
          {isFree ? <SparklesIcon /> : <BoltIcon />}
        </div>
        <h3 className="text-lg font-semibold text-dark-100">
          {isFree ? t('dashboard.trialOffer.freeTitle') : t('dashboard.trialOffer.paidTitle')}
        </h3>
        <p className="mt-1 text-sm text-dark-400">
          {isFree ? t('dashboard.trialOffer.freeDesc') : t('dashboard.trialOffer.paidDesc')}
        </p>
      </div>

      {/* Price tag for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="font-display text-2xl font-bold text-accent-400">
            {trialInfo.price_rubles.toFixed(0)} {currencySymbol}
          </span>
        </div>
      )}

      {/* 3-column stats */}
      <div className="mb-5 grid grid-cols-3 gap-4 rounded-xl bg-dark-800/40 p-4">
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-accent-400">
            {trialInfo.duration_days}
          </div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('subscription.trial.days')}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-accent-400">
            {trialInfo.traffic_limit_gb || '∞'}
          </div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('common.units.gb')}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-2xl font-bold text-accent-400">
            {trialInfo.device_limit}
          </div>
          <div className="mt-0.5 font-mono text-xs uppercase tracking-wider text-dark-500">
            {t('subscription.trial.devices')}
          </div>
        </div>
      </div>

      {/* Balance info for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div className="mb-4 space-y-2 rounded-xl bg-dark-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-400">{t('balance.currentBalance')}</span>
            <span
              className={`font-display text-sm font-semibold ${canAfford ? 'text-success-400' : 'text-warning-400'}`}
            >
              {formatAmount(balanceRubles)} {currencySymbol}
            </span>
          </div>
          {!canAfford && (
            <div className="text-xs text-warning-400">
              {t('subscription.trial.insufficientBalance')}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {trialError && (
        <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-center text-sm text-error-400">
          {trialError}
        </div>
      )}

      {/* CTA Button */}
      {!isFree && trialInfo.price_kopeks > 0 ? (
        canAfford ? (
          <HoverBorderGradient
            onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
            containerClassName={`w-full ${activateTrialMutation.isPending ? 'opacity-50' : ''}`}
            className="flex w-full items-center justify-center"
            aria-disabled={activateTrialMutation.isPending}
          >
            {activateTrialMutation.isPending
              ? t('common.loading')
              : t('subscription.trial.payAndActivate')}
          </HoverBorderGradient>
        ) : (
          <Link to="/balance" className="btn-primary block w-full text-center">
            {t('subscription.trial.topUpToActivate')}
          </Link>
        )
      ) : (
        <HoverBorderGradient
          onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
          containerClassName={`w-full ${activateTrialMutation.isPending ? 'opacity-50' : ''}`}
          className="flex w-full items-center justify-center"
          aria-disabled={activateTrialMutation.isPending}
        >
          {activateTrialMutation.isPending ? t('common.loading') : t('subscription.trial.activate')}
        </HoverBorderGradient>
      )}
    </div>
  );
}
