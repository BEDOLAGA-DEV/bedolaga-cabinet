/**
 * Global success notification modal.
 * Shows prominent success messages for balance top-ups and subscription purchases.
 */

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useSuccessNotification } from '../store/successNotification';
import { useCurrency } from '../hooks/useCurrency';
import { useTelegramSDK } from '../hooks/useTelegramSDK';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useHaptic } from '@/platform';
import {
  CheckCircleIcon,
  CloseIcon,
  DevicesIcon,
  RocketIcon,
  TrafficIcon,
  WalletIcon,
} from '@/components/icons';

export default function SuccessNotificationModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isOpen = useSuccessNotification((state) => state.isOpen);
  const data = useSuccessNotification((state) => state.data);
  const hide = useSuccessNotification((state) => state.hide);
  const { formatAmount, currencySymbol } = useCurrency();
  const { safeAreaInset, contentSafeAreaInset, isTelegramWebApp } = useTelegramSDK();
  const haptic = useHaptic();

  const safeBottom = isTelegramWebApp
    ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom)
    : 0;

  const handleClose = useCallback(() => {
    hide();
  }, [hide]);

  // Esc + scroll-lock are handled by the effects below; the trap only manages focus.
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, { lockScroll: false });

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

  useEffect(() => {
    if (isOpen) {
      haptic.notification('success');
    }
  }, [isOpen, haptic]);

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
  const isDevicesPurchased = data.type === 'devices_purchased';
  const isTrafficPurchased = data.type === 'traffic_purchased';

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
  let icon = <CheckCircleIcon className="h-16 w-16" />;
  let gradientClass = 'from-success-500 to-success-600';

  if (!title) {
    if (isBalanceTopup) {
      title = t('successNotification.balanceTopup.title', 'Balance topped up!');
      icon = <WalletIcon className="h-8 w-8" />;
      gradientClass = 'from-success-500 to-success-600';
    } else if (data.type === 'subscription_activated') {
      title = t('successNotification.subscriptionActivated.title', 'Subscription activated!');
      icon = <RocketIcon className="h-8 w-8" />;
      gradientClass = 'from-accent-500 to-purple-600';
    } else if (data.type === 'subscription_renewed') {
      title = t('successNotification.subscriptionRenewed.title', 'Subscription renewed!');
      icon = <RocketIcon className="h-8 w-8" />;
      gradientClass = 'from-accent-500 to-purple-600';
    } else if (data.type === 'subscription_purchased') {
      title = t('successNotification.subscriptionPurchased.title', 'Subscription purchased!');
      icon = <RocketIcon className="h-8 w-8" />;
      gradientClass = 'from-accent-500 to-purple-600';
    } else if (data.type === 'devices_purchased') {
      title = t('successNotification.devicesPurchased.title', 'Devices added!');
      icon = <DevicesIcon className="h-8 w-8" />;
      gradientClass = 'from-blue-500 to-cyan-600';
    } else if (data.type === 'traffic_purchased') {
      title = t('successNotification.trafficPurchased.title', 'Traffic added!');
      icon = <TrafficIcon className="h-8 w-8" />;
      gradientClass = 'from-success-500 to-success-600';
    }
  }

  const handleGoToSubscription = () => {
    hide();
    navigate('/subscriptions');
  };

  const handleGoToBalance = () => {
    hide();
    navigate('/balance');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-modal-title"
        tabIndex={-1}
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-dark-700/50 bg-dark-900 shadow-2xl"
        style={{
          marginBottom: safeBottom ? `${safeBottom}px` : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label={t('common.close')}
          className="absolute right-3 top-3 z-10 rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
        >
          <CloseIcon />
        </button>

        {/* Success header with animation */}
        <div
          className={`flex flex-col items-center bg-gradient-to-br ${gradientClass} px-6 pb-8 pt-10`}
        >
          {/* Use animate-pulse for celebration; bounce easing reads dated and
              the lift is the moment, not the bounce. */}
          <div className="mb-4 animate-pulse text-white">{icon}</div>
          <h2 id="success-modal-title" className="text-center text-2xl font-bold text-white">
            {title}
          </h2>
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
              <span
                className={`text-lg font-bold ${isDevicesPurchased || isTrafficPurchased ? 'text-dark-100' : 'text-success-400'}`}
              >
                {isDevicesPurchased || isTrafficPurchased ? '' : '+'}
                {formattedAmount}
              </span>
            </div>
          )}

          {/* Devices info (for devices purchase) */}
          {isDevicesPurchased && data.devicesAdded && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.devicesAdded', 'Devices added')}
              </span>
              <span className="text-lg font-bold text-blue-400">+{data.devicesAdded}</span>
            </div>
          )}

          {isDevicesPurchased && data.newDeviceLimit && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.totalDevices', 'Total devices')}
              </span>
              <span className="font-semibold text-dark-100">{data.newDeviceLimit}</span>
            </div>
          )}

          {/* Traffic info (for traffic purchase) */}
          {isTrafficPurchased && data.trafficGbAdded && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.trafficAdded', 'Traffic added')}
              </span>
              <span className="text-lg font-bold text-success-400">+{data.trafficGbAdded} GB</span>
            </div>
          )}

          {isTrafficPurchased && data.newTrafficLimitGb && (
            <div className="flex items-center justify-between rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="text-dark-400">
                {t('successNotification.totalTraffic', 'Total traffic')}
              </span>
              <span className="font-semibold text-dark-100">{data.newTrafficLimitGb} GB</span>
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
            <div className="flex items-center justify-between gap-3 rounded-xl bg-dark-800/50 px-4 py-3">
              <span className="shrink-0 text-dark-400">
                {t('successNotification.tariff', 'Tariff')}
              </span>
              <span className="min-w-0 truncate font-semibold text-dark-100">
                {data.tariffName}
              </span>
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3.5 font-bold text-white shadow-lg shadow-accent-500/25 transition-colors hover:bg-accent-400 active:bg-accent-600"
              >
                <RocketIcon className="h-8 w-8" />
                <span>{t('successNotification.goToSubscription', 'Go to Subscription')}</span>
              </button>
            )}

            {isBalanceTopup && (
              <button
                onClick={handleGoToBalance}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-500 py-3.5 font-bold text-white shadow-lg shadow-success-500/25 transition-colors hover:bg-success-400 active:bg-success-600"
              >
                <WalletIcon className="h-8 w-8" />
                <span>{t('successNotification.goToBalance', 'Go to Balance')}</span>
              </button>
            )}

            {isDevicesPurchased && (
              <button
                onClick={handleGoToSubscription}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 py-3.5 font-bold text-white shadow-lg shadow-accent-500/25 transition-colors hover:bg-accent-400 active:bg-accent-600"
              >
                <DevicesIcon className="h-8 w-8" />
                <span>{t('successNotification.goToSubscription', 'Go to Subscription')}</span>
              </button>
            )}

            {isTrafficPurchased && (
              <button
                onClick={handleGoToSubscription}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-success-500 py-3.5 font-bold text-white shadow-lg shadow-success-500/25 transition-colors hover:bg-success-400 active:bg-success-600"
              >
                <TrafficIcon className="h-8 w-8" />
                <span>{t('successNotification.goToSubscription', 'Go to Subscription')}</span>
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
