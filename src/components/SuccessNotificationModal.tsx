/**
 * Global success notification modal.
 * Shows prominent success messages for balance top-ups and subscription purchases.
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSuccessNotification } from '../store/successNotification';
import { useCurrency } from '../hooks/useCurrency';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

// Icons
const CheckCircleIcon = () => (
  <svg
    className="h-16 w-16"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WalletIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

const RocketIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
    />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default function SuccessNotificationModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, data, hide } = useSuccessNotification();
  const { formatAmount, currencySymbol } = useCurrency();
  const { webApp, safeAreaInset, contentSafeAreaInset, isTelegramWebApp } = useTelegramWebApp();

  const safeBottom = isTelegramWebApp
    ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom)
    : 0;

  const handleClose = useCallback(() => {
    hide();
  }, [hide]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Telegram back button
  useEffect(() => {
    if (!isOpen || !webApp?.BackButton) return;

    webApp.BackButton.show();
    webApp.BackButton.onClick(handleClose);

    return () => {
      webApp.BackButton.offClick(handleClose);
      webApp.BackButton.hide();
    };
  }, [isOpen, webApp, handleClose]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const isBalanceTopup = data.type === 'balance_topup';
  const isSubscription =
    data.type === 'subscription_activated' ||
    data.type === 'subscription_renewed' ||
    data.type === 'subscription_purchased';

  // Format amount
  const formattedAmount = data.amountKopeks
    ? `${formatAmount(data.amountKopeks / 100)} ${currencySymbol}`
    : null;

  // Format new balance
  const formattedBalance =
    data.newBalanceKopeks !== undefined
      ? `${formatAmount(data.newBalanceKopeks / 100)} ${currencySymbol}`
      : null;

  // Format expiry date
  const formattedExpiry = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // Determine title and message
  let title = data.title;
  const message = data.message;
  let icon = <CheckCircleIcon />;
  let gradientClass = 'from-success-500 to-emerald-600';

  if (!title) {
    if (isBalanceTopup) {
      title = t('successNotification.balanceTopup.title', 'Balance topped up!');
      icon = <WalletIcon />;
      gradientClass = 'from-success-500 to-emerald-600';
    } else if (data.type === 'subscription_activated') {
      title = t('successNotification.subscriptionActivated.title', 'Subscription activated!');
      icon = <RocketIcon />;
      gradientClass = 'from-accent-500 to-purple-600';
    } else if (data.type === 'subscription_renewed') {
      title = t('successNotification.subscriptionRenewed.title', 'Subscription renewed!');
      icon = <RocketIcon />;
      gradientClass = 'from-accent-500 to-purple-600';
    } else if (data.type === 'subscription_purchased') {
      title = t('successNotification.subscriptionPurchased.title', 'Subscription purchased!');
      icon = <RocketIcon />;
      gradientClass = 'from-accent-500 to-purple-600';
    }
  }

  const handleGoToSubscription = () => {
    hide();
    navigate('/subscription');
  };

  const handleGoToBalance = () => {
    hide();
    navigate('/balance');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-dark-700/50 bg-dark-900 shadow-2xl"
        style={{
          marginBottom: safeBottom ? `${safeBottom}px` : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
        >
          <CloseIcon />
        </button>

        {/* Success header with animation */}
        <div
          className={`flex flex-col items-center bg-gradient-to-br ${gradientClass} px-6 pb-8 pt-10`}
        >
          <div className="mb-4 animate-bounce text-white">{icon}</div>
          <h2 className="text-center text-2xl font-bold text-white">{title}</h2>
          {message && <p className="mt-2 text-center text-white/80">{message}</p>}
        </div>

        {/* Details */}
        <div className="space-y-4 p-6">
          {/* Amount */}
          {formattedAmount && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {isBalanceTopup
                  ? t('successNotification.amount', 'Amount')
                  : t('successNotification.price', 'Price')}
              </span>
              <span className="text-lg font-bold text-success-400">+{formattedAmount}</span>
            </div>
          )}

          {/* New balance (for top-up) */}
          {isBalanceTopup && formattedBalance && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.newBalance', 'New balance')}
              </span>
              <span className="text-lg font-bold text-dark-100">{formattedBalance}</span>
            </div>
          )}

          {/* Tariff name */}
          {data.tariffName && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">{t('successNotification.tariff', 'Tariff')}</span>
              <span className="font-semibold text-dark-100">{data.tariffName}</span>
            </div>
          )}

          {/* Expiry date */}
          {formattedExpiry && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.validUntil', 'Valid until')}
              </span>
              <span className="font-semibold text-dark-100">{formattedExpiry}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {isSubscription && (
              <button
                onClick={handleGoToSubscription}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-3.5 font-bold text-white shadow-lg shadow-accent-500/25 transition-all hover:from-accent-400 hover:to-accent-500 active:from-accent-600 active:to-accent-700"
              >
                <RocketIcon />
                <span>{t('successNotification.goToSubscription', 'Go to Subscription')}</span>
              </button>
            )}

            {isBalanceTopup && (
              <button
                onClick={handleGoToBalance}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-success-500 to-emerald-600 py-3.5 font-bold text-white shadow-lg shadow-success-500/25 transition-all hover:from-success-400 hover:to-emerald-500 active:from-success-600 active:to-emerald-700"
              >
                <WalletIcon />
                <span>{t('successNotification.goToBalance', 'Go to Balance')}</span>
              </button>
            )}

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-dark-800 py-3 font-semibold text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-100"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
