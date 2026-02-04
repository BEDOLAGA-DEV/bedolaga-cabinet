import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { promoApi } from '../api/promo';

const SparklesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const WarningIcon = () => (
  <svg
    className="h-12 w-12"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
    />
  </svg>
);

const formatTimeLeft = (expiresAt: string, t: (key: string) => string): string => {
  const now = new Date();
  // Ensure UTC parsing - if no timezone specified, assume UTC
  let expires: Date;
  if (expiresAt.includes('Z') || expiresAt.includes('+') || expiresAt.includes('-', 10)) {
    expires = new Date(expiresAt);
  } else {
    // No timezone - treat as UTC
    expires = new Date(expiresAt + 'Z');
  }
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return '';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}${t('promo.time.days')}`;
  }
  if (hours > 0) {
    return `${hours}${t('promo.time.hours')} ${minutes}${t('promo.time.minutes')}`;
  }
  return `${minutes}${t('promo.time.minutes')}`;
};

// ------- Confirmation Modal -------

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  discountPercent: number;
  isDeactivating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeactivateConfirmModal({
  isOpen,
  discountPercent,
  isDeactivating,
  onConfirm,
  onCancel,
}: DeactivateConfirmModalProps) {
  const { t } = useTranslation();

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeactivating) {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeactivating, onCancel]);

  // Scroll lock
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isDeactivating ? undefined : onCancel}
      />

      {/* Modal */}
      <div
        className="relative mx-4 w-full max-w-sm overflow-hidden rounded-2xl border border-dark-700/50 bg-dark-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning header */}
        <div className="flex flex-col items-center bg-gradient-to-br from-warning-500/20 to-red-500/20 px-6 pb-6 pt-8">
          <div className="mb-3 text-warning-400">
            <WarningIcon />
          </div>
          <h2 id="deactivate-modal-title" className="text-center text-lg font-bold text-dark-100">
            {t('promo.deactivate.confirmTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-dark-300">
            {t('promo.deactivate.confirmDescription', { percent: discountPercent })}
          </p>
        </div>

        {/* Warning text */}
        <div className="px-6 py-4">
          <div className="rounded-lg border border-warning-500/20 bg-warning-500/10 px-4 py-3">
            <p className="text-center text-sm text-warning-400">{t('promo.deactivate.warning')}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={isDeactivating}
            className="flex-1 rounded-xl bg-dark-800 py-3 font-semibold text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-100 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeactivating}
            className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 py-3 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:from-red-400 hover:to-red-500 active:from-red-600 active:to-red-700 disabled:opacity-50"
          >
            {isDeactivating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('promo.deactivate.deactivating')}
              </span>
            ) : (
              t('promo.deactivate.confirm')
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

// ------- Main Component -------

export default function PromoDiscountBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const source = activeDiscount?.source;
      if (source && source.startsWith('promocode:')) {
        await promoApi.deactivateDiscount();
      } else {
        await promoApi.clearActiveDiscount();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-discount'] });
      queryClient.invalidateQueries({ queryKey: ['promo-offers'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });
      setShowConfirmModal(false);
      setIsOpen(false);
      setDeactivateError(null);
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      setDeactivateError(axiosErr.response?.data?.detail || t('promo.deactivate.error'));
    },
  });

  const handleCloseConfirmModal = useCallback(() => {
    if (!deactivateMutation.isPending) {
      setShowConfirmModal(false);
      setDeactivateError(null);
    }
  }, [deactivateMutation.isPending]);

  const handleConfirmDeactivate = useCallback(() => {
    setDeactivateError(null);
    deactivateMutation.mutate();
  }, [deactivateMutation]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if no active discount
  if (!activeDiscount || !activeDiscount.is_active || !activeDiscount.discount_percent) {
    return null;
  }

  const timeLeft = activeDiscount.expires_at ? formatTimeLeft(activeDiscount.expires_at, t) : null;

  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  const handleGoToSubscription = () => {
    setIsOpen(false);
    navigate('/subscription');
  };

  const handleDeactivateClick = () => {
    setDeactivateError(null);
    setShowConfirmModal(true);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Badge button */}
        <button
          onClick={handleClick}
          className="group relative flex items-center gap-1 rounded-lg bg-success-500/15 px-2.5 py-1.5 transition-all hover:bg-success-500/25"
          title={t('promo.activeDiscount', 'Active discount')}
        >
          <span className="text-sm font-bold text-success-400">
            -{activeDiscount.discount_percent}%
          </span>
        </button>

        {/* Dropdown - mobile: fixed centered, desktop: absolute right */}
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              onClick={() => setIsOpen(false)}
            />

            <div className="fixed left-4 right-4 top-20 z-50 animate-fade-in overflow-hidden rounded-xl border border-dark-700/50 bg-dark-800 shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              {/* Header */}
              <div className="border-b border-dark-700/50 bg-gradient-to-r from-success-500/20 to-accent-500/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-500/20 text-success-400">
                    <SparklesIcon />
                  </div>
                  <div>
                    <div className="font-semibold text-dark-100">{t('promo.discountActive')}</div>
                    <div className="text-2xl font-bold text-success-400">
                      -{activeDiscount.discount_percent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 p-4">
                <p className="text-sm text-dark-300">{t('promo.discountDescription')}</p>

                {/* Time remaining */}
                {timeLeft && (
                  <div className="flex items-center gap-2 rounded-lg bg-dark-900/50 px-3 py-2 text-sm text-dark-400">
                    <ClockIcon />
                    <span>
                      {t('promo.expiresIn')}:{' '}
                      <span className="font-medium text-warning-400">{timeLeft}</span>
                    </span>
                  </div>
                )}

                {/* Deactivation error */}
                {deactivateError && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                    {deactivateError}
                  </div>
                )}

                {/* CTA Button */}
                <button
                  onClick={handleGoToSubscription}
                  className="btn-primary w-full py-2.5 text-sm font-medium"
                >
                  {t('promo.useNow')}
                </button>

                {/* Deactivate Button */}
                <button
                  onClick={handleDeactivateClick}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dark-600/50 bg-dark-900/50 py-2 text-sm text-dark-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                  aria-label={t('promo.deactivate.button')}
                >
                  <XCircleIcon />
                  <span>{t('promo.deactivate.button')}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Deactivation Confirmation Modal */}
      <DeactivateConfirmModal
        isOpen={showConfirmModal}
        discountPercent={activeDiscount.discount_percent}
        isDeactivating={deactivateMutation.isPending}
        onConfirm={handleConfirmDeactivate}
        onCancel={handleCloseConfirmModal}
      />
    </>
  );
}
