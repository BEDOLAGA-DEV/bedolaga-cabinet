import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useLocation } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { Subscription } from '../../types';
import { subscriptionApi } from '../../api/subscription';
import { useTheme } from '../../hooks/useTheme';
import { useCurrency } from '../../hooks/useCurrency';
import { useHapticFeedback } from '../../platform/hooks/useHaptic';
import { getGlassColors } from '../../utils/glassTheme';
import { getInsufficientBalanceError } from '../../utils/subscriptionHelpers';

interface SubscriptionCardExpiredProps {
  subscription: Subscription;
  balanceKopeks?: number;
  balanceRubles?: number;
  className?: string;
}

export default function SubscriptionCardExpired({
  subscription,
  balanceKopeks = 0,
  balanceRubles = 0,
  className,
}: SubscriptionCardExpiredProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const g = getGlassColors(isDark);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const haptic = useHapticFeedback();

  const [isRenewing, setIsRenewing] = useState(false);
  const [renewError, setRenewError] = useState<string | null>(null);

  const formattedDate = new Date(subscription.end_date).toLocaleDateString();

  // Detect daily subscription (disabled or expired)
  const isDaily = subscription.is_daily;
  const isDisabledDaily = subscription.status === 'disabled' && isDaily;

  // For daily subs, check if balance covers daily price; otherwise 100 kopeks minimum
  const dailyPrice = subscription.daily_price_kopeks ?? 0;
  const hasBalance = isDaily ? balanceKopeks >= dailyPrice && dailyPrice > 0 : balanceKopeks >= 100;

  const handleQuickRenew = async () => {
    setIsRenewing(true);
    setRenewError(null);
    haptic.buttonPressHeavy();

    try {
      if (isDisabledDaily) {
        // Resume daily subscription via toggle pause endpoint
        await subscriptionApi.togglePause();
      } else if (isDaily && subscription.tariff_id) {
        // Expired daily tariff — purchase for 1 day
        await subscriptionApi.purchaseTariff(subscription.tariff_id, 1);
      } else {
        await subscriptionApi.renewSubscription(30);
      }
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
    } catch (err: unknown) {
      haptic.error();
      const insufficientData = getInsufficientBalanceError(err);
      if (insufficientData) {
        setRenewError(t('dashboard.expired.insufficientFunds'));
      } else if (err instanceof AxiosError) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') {
          setRenewError(detail);
        } else {
          setRenewError(t('dashboard.expired.renewError'));
        }
      } else {
        setRenewError(t('dashboard.expired.renewError'));
      }
    } finally {
      setIsRenewing(false);
    }
  };

  const handleTopUp = () => {
    haptic.buttonPress();
    const params = new URLSearchParams();
    params.set('returnTo', location.pathname);
    navigate(`/balance/top-up?${params.toString()}`);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl ${className ?? ''}`}
      style={{
        background: g.cardBg,
        border: isDark ? '1px solid rgba(255,70,70,0.12)' : '1px solid rgba(255,59,92,0.2)',
        boxShadow: isDark
          ? g.shadow
          : '0 2px 16px rgba(255,59,92,0.1), 0 0 0 1px rgba(255,59,92,0.06)',
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
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: isDark ? 0.02 : 0.04,
          backgroundImage: isDark
            ? `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)`,
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
          {isDisabledDaily
            ? t('dashboard.suspended.title')
            : subscription.is_trial
              ? t('dashboard.expired.trialTitle')
              : t('dashboard.expired.title')}
        </h2>
      </div>

      {/* Expired date + Balance row */}
      <div
        className="mb-5 flex items-center justify-between rounded-[14px]"
        style={{
          background: 'rgba(255,59,92,0.04)',
          border: '1px solid rgba(255,59,92,0.08)',
          padding: '14px 18px',
        }}
      >
        <div className="flex items-center">
          <div className="mb-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-dark-50/30">
            {t('dashboard.expired.expiredDate')}
          </div>
          <div className="ml-3 text-base font-bold tracking-tight text-dark-50/50">
            {formattedDate}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-dark-50/30">
            {t('dashboard.expired.balance')}
          </span>
          <span
            className={`text-sm font-semibold ${hasBalance ? 'text-success-400' : 'text-dark-50/30'}`}
          >
            {formatAmount(balanceRubles)} {currencySymbol}
          </span>
        </div>
      </div>

      {/* Renew error */}
      {renewError && (
        <div
          className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-center text-sm text-error-400"
          role="alert"
        >
          {renewError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2.5">
        {/* Quick Renew or Top Up button */}
        {hasBalance ? (
          <button
            type="button"
            onClick={handleQuickRenew}
            disabled={isRenewing}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #FF3B5C, #FF6B35)',
              boxShadow: '0 4px 20px rgba(255,59,92,0.2)',
            }}
          >
            {isRenewing ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            )}
            {isRenewing
              ? t('common.loading')
              : isDisabledDaily
                ? t('dashboard.suspended.resume')
                : t('dashboard.expired.quickRenew')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleTopUp}
            className="flex flex-1 items-center justify-center gap-2 rounded-[14px] py-3.5 text-[15px] font-semibold tracking-tight text-white transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #FF3B5C, #FF6B35)',
              boxShadow: '0 4px 20px rgba(255,59,92,0.2)',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t('dashboard.expired.topUp')}
          </button>
        )}

        {/* Renew (go to purchase page) */}
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
