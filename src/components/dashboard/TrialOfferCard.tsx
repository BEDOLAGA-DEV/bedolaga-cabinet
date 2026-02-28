import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { UseMutationResult } from '@tanstack/react-query';
import type { TrialInfo } from '../../types';
import { useCurrency } from '../../hooks/useCurrency';
import { useTheme } from '../../hooks/useTheme';
import { getGlassColors } from '../../utils/glassTheme';

interface TrialOfferCardProps {
  trialInfo: TrialInfo;
  balanceKopeks: number;
  balanceRubles: number;
  activateTrialMutation: UseMutationResult<unknown, unknown, void, unknown>;
  trialError: string | null;
}

export default function TrialOfferCard({
  trialInfo,
  balanceKopeks,
  balanceRubles,
  activateTrialMutation,
  trialError,
}: TrialOfferCardProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const isFree = !trialInfo.requires_payment;
  const canAfford = balanceKopeks >= trialInfo.price_kopeks;

  return (
    <div
      className="relative overflow-hidden rounded-3xl text-center"
      style={{
        background: g.cardBg,
        border: isDark
          ? `1px solid ${g.cardBorder}`
          : isFree
            ? '1px solid rgba(62,219,176,0.2)'
            : '1px solid rgba(255,184,0,0.2)',
        boxShadow: isDark
          ? g.shadow
          : isFree
            ? '0 2px 16px rgba(62,219,176,0.12), 0 0 0 1px rgba(62,219,176,0.06)'
            : '0 2px 16px rgba(255,184,0,0.12), 0 0 0 1px rgba(255,184,0,0.06)',
        padding: '32px 28px 28px',
      }}
    >
      {/* Animated glow background */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: isFree
            ? 'radial-gradient(circle, rgba(62,219,176,0.08) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255,184,0,0.07) 0%, transparent 70%)',
          transition: 'background 0.5s ease',
        }}
        aria-hidden="true"
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.025 : 0.04,
          backgroundImage: isDark
            ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* Icon */}
      <div
        className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: isDark
            ? isFree
              ? 'linear-gradient(135deg, #1a3a30, #142824)'
              : 'linear-gradient(135deg, #3a3020, #282418)'
            : isFree
              ? 'linear-gradient(135deg, rgba(62,219,176,0.15), rgba(62,219,176,0.08))'
              : 'linear-gradient(135deg, rgba(255,184,0,0.15), rgba(255,184,0,0.08))',
          border: isFree ? '1px solid rgba(62,219,176,0.25)' : '1px solid rgba(255,184,0,0.25)',
          transition: 'all 0.5s ease',
        }}
      >
        {isFree ? (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3EDBB0"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFB800"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {/* Glow effect */}
        <div
          className="absolute inset-[-1px] animate-trial-glow rounded-2xl"
          style={{
            boxShadow: isFree ? '0 0 20px rgba(62,219,176,0.15)' : '0 0 20px rgba(255,184,0,0.12)',
          }}
          aria-hidden="true"
        />
      </div>

      {/* Title */}
      <h2 className="mb-1.5 text-[22px] font-bold tracking-tight text-dark-50">
        {isFree ? t('dashboard.trialOffer.freeTitle') : t('dashboard.trialOffer.paidTitle')}
      </h2>
      <p className="mb-5 text-sm text-dark-50/40">
        {isFree ? t('dashboard.trialOffer.freeDesc') : t('dashboard.trialOffer.paidDesc')}
      </p>

      {/* Price tag for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div
          className="mb-5 inline-flex items-baseline gap-1 rounded-xl px-5 py-2"
          style={{
            background: 'rgba(255,184,0,0.08)',
            border: '1px solid rgba(255,184,0,0.15)',
          }}
        >
          <span
            className="text-[32px] font-extrabold leading-none tracking-tight"
            style={{ color: '#FFB800' }}
          >
            {trialInfo.price_rubles.toFixed(0)}
          </span>
          <span className="text-base font-semibold opacity-70" style={{ color: '#FFB800' }}>
            {currencySymbol}
          </span>
        </div>
      )}

      {/* Trial stats */}
      <div className="mb-7 flex justify-center gap-8">
        {[
          { value: String(trialInfo.duration_days), label: t('subscription.trial.days') },
          {
            value: trialInfo.traffic_limit_gb === 0 ? '∞' : String(trialInfo.traffic_limit_gb),
            label: t('common.units.gb'),
          },
          { value: String(trialInfo.device_limit), label: t('subscription.trial.devices') },
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-extrabold leading-none tracking-tight text-dark-50">
              {stat.value}
            </div>
            <div className="mt-1 text-xs font-medium text-dark-50/30">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Balance info for paid trial */}
      {!isFree && trialInfo.price_rubles > 0 && (
        <div
          className="mb-4 space-y-2 rounded-xl p-4 text-left"
          style={{ background: g.innerBg, border: `1px solid ${g.innerBorder}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-dark-50/40">{t('balance.currentBalance')}</span>
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
          <button
            onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
            disabled={activateTrialMutation.isPending}
            className="w-full rounded-[14px] py-4 text-base font-bold tracking-tight transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #FFB800, #FF8C42)',
              color: '#1a1200',
              boxShadow: '0 4px 20px rgba(255,184,0,0.2)',
            }}
          >
            {activateTrialMutation.isPending
              ? t('common.loading')
              : t('subscription.trial.payAndActivate')}
          </button>
        ) : (
          <Link
            to="/balance"
            className="block w-full rounded-[14px] py-4 text-center text-base font-bold tracking-tight transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FFB800, #FF8C42)',
              color: '#1a1200',
              boxShadow: '0 4px 20px rgba(255,184,0,0.2)',
            }}
          >
            {t('subscription.trial.topUpToActivate')}
          </Link>
        )
      ) : (
        <button
          onClick={() => !activateTrialMutation.isPending && activateTrialMutation.mutate()}
          disabled={activateTrialMutation.isPending}
          className="w-full rounded-[14px] py-4 text-base font-bold tracking-tight transition-all duration-300 disabled:opacity-50"
          style={
            isDark
              ? {
                  background:
                    'linear-gradient(135deg, rgba(62,219,176,0.12) 0%, rgba(62,219,176,0.04) 100%)',
                  border: '1px solid rgba(62,219,176,0.25)',
                  color: '#fff',
                }
              : {
                  background: 'linear-gradient(135deg, #3EDBB0, #2BC49A)',
                  color: '#0a2a1e',
                  boxShadow: '0 4px 20px rgba(62,219,176,0.25)',
                }
          }
        >
          {activateTrialMutation.isPending ? t('common.loading') : t('subscription.trial.activate')}
        </button>
      )}
    </div>
  );
}
