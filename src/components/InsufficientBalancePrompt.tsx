import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../hooks/useCurrency';
import { InfoIcon, WalletIcon, PlusIcon } from '@/components/icons';

interface InsufficientBalancePromptProps {
  /** Amount missing in kopeks */
  missingAmountKopeks: number;
  /** Optional custom message */
  message?: string;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Additional className */
  className?: string;
  /** Callback to execute before opening top-up modal (e.g., save cart) */
  onBeforeTopUp?: () => Promise<void>;
}

export default function InsufficientBalancePrompt({
  missingAmountKopeks,
  message,
  compact = false,
  className = '',
  onBeforeTopUp,
}: InsufficientBalancePromptProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatAmount, currencySymbol } = useCurrency();
  const [isPreparingTopUp, setIsPreparingTopUp] = useState(false);

  const missingRubles = missingAmountKopeks / 100;
  const displayAmount = formatAmount(missingRubles);

  const handleTopUpClick = async () => {
    if (onBeforeTopUp) {
      setIsPreparingTopUp(true);
      try {
        await onBeforeTopUp();
      } catch {
        // Silently ignore errors - still navigate
      } finally {
        setIsPreparingTopUp(false);
      }
    }
    const params = new URLSearchParams();
    params.set('amount', String(Math.ceil(missingRubles)));
    params.set('returnTo', location.pathname);
    navigate(`/balance/top-up?${params.toString()}`);
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/10 p-3 ${className}`}
      >
        <div className="flex items-center gap-2 text-sm text-error-400">
          <InfoIcon className="h-4 w-4 flex-shrink-0" />
          <span>
            {message || t('balance.insufficientFunds')}:{' '}
            <span className="font-semibold">
              {displayAmount} {currencySymbol}
            </span>
          </span>
        </div>
        <button
          onClick={handleTopUpClick}
          disabled={isPreparingTopUp}
          className="btn-primary whitespace-nowrap px-3 py-1.5 text-xs"
        >
          {isPreparingTopUp ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
          ) : (
            t('balance.topUp')
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-error-500/30 bg-gradient-to-br from-error-500/10 to-warning-500/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-error-500/20">
          <WalletIcon className="h-5 w-5 text-error-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 font-medium text-error-400">{t('balance.insufficientFunds')}</div>
          <div className="text-sm text-dark-300">{message || t('balance.topUpToComplete')}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-lg font-bold text-dark-100">
              {t('balance.missing')}:{' '}
              <span className="text-error-400">
                {displayAmount} {currencySymbol}
              </span>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={handleTopUpClick}
        disabled={isPreparingTopUp}
        className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-2.5"
      >
        {isPreparingTopUp ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <>
            <PlusIcon className="h-5 w-5" />
            {t('balance.topUpBalance')}
          </>
        )}
      </button>
    </div>
  );
}
