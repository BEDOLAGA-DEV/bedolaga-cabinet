import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { promoApi, PromoOffer } from '../api/promo';
import { ClockIcon, CheckIcon } from './icons';
import { usePlatform } from '@/platform/hooks/usePlatform';

// Helper functions
const formatTimeLeft = (
  expiresAt: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
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

  if (diffMs <= 0) return t('promo.offers.expired');

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} ${t('promo.time.days')}`;
  }
  if (hours > 0) {
    return `${hours}${t('promo.time.hours')} ${minutes}${t('promo.time.minutes')}`;
  }
  return `${minutes}${t('promo.time.minutes')}`;
};

const getOfferIcon = (effectType: string, discountPercent?: number | null) => {
  if (effectType === 'test_access') return <span className="text-2xl">🚀</span>;
  if (discountPercent) return <span className="text-2xl">🏷️</span>;
  return <span className="text-2xl">🎁</span>;
};

const getOfferTitle = (
  offer: PromoOffer,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (offer.effect_type === 'test_access') {
    return t('promo.offers.testAccess');
  }
  if (offer.discount_percent) {
    return t('promo.offers.discountPercent', { percent: offer.discount_percent });
  }
  return t('promo.offers.specialOffer');
};

const getOfferDescription = (
  offer: PromoOffer,
  t: (key: string, options?: Record<string, unknown>) => string,
): string => {
  if (offer.effect_type === 'test_access') {
    const squads = offer.extra_data?.test_squad_uuids?.length || 0;
    return squads > 0
      ? t('promo.offers.serverAccess', { count: squads })
      : t('promo.offers.additionalServers');
  }
  return t('promo.offers.activateDiscountHint');
};

// Icons for deactivation
const XCircleIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ------- Main Component -------

interface PromoOffersSectionProps {
  className?: string;
}

export default function PromoOffersSection({ className = '' }: PromoOffersSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { dialog, capabilities } = usePlatform();
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['promo-offers'],
    queryFn: promoApi.getOffers,
    staleTime: 30000,
  });

  // Fetch active discount
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  });

  // Claim offer mutation
  const claimMutation = useMutation({
    mutationFn: promoApi.claimOffer,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['promo-offers'] });
      queryClient.invalidateQueries({ queryKey: ['active-discount'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      setSuccessMessage(result.message);
      setClaimingId(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      setErrorMessage(axiosErr.response?.data?.detail || t('promo.offers.activationFailed'));
      setClaimingId(null);
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  // Deactivate discount mutation
  const deactivateMutation = useMutation({
    mutationFn: promoApi.clearActiveDiscount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-discount'] });
      queryClient.invalidateQueries({ queryKey: ['promo-offers'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] });

      setSuccessMessage(t('promo.deactivate.success'));
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (error: unknown) => {
      const axiosErr = error as { response?: { data?: { detail?: string } } };
      setErrorMessage(axiosErr.response?.data?.detail || t('promo.deactivate.error'));

      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleClaim = (offerId: number) => {
    setClaimingId(offerId);
    setErrorMessage(null);
    setSuccessMessage(null);
    claimMutation.mutate(offerId);
  };

  const handleUseNow = () => {
    navigate('/subscription', { state: { scrollToExtend: true } });
  };

  const handleDeactivateClick = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (capabilities.hasNativeDialogs) {
      dialog
        .popup({
          title: t('promo.deactivate.confirmTitle'),
          message: t('promo.deactivate.confirmDescription', {
            percent: activeDiscount?.discount_percent || 0,
          }),
          buttons: [
            { id: 'cancel', type: 'cancel', text: '' },
            { id: 'confirm', type: 'destructive', text: t('promo.deactivate.confirm') },
          ],
        })
        .then((buttonId) => {
          if (buttonId === 'confirm') {
            deactivateMutation.mutate();
          }
        });
    } else {
      const confirmed = window.confirm(
        t('promo.deactivate.confirmDescription', {
          percent: activeDiscount?.discount_percent || 0,
        }),
      );
      if (confirmed) {
        deactivateMutation.mutate();
      }
    }
  };

  // Filter unclaimed and active offers
  const availableOffers = offers.filter((o) => o.is_active && !o.is_claimed);

  // Don't render if no offers and no active discount
  if (
    !offersLoading &&
    availableOffers.length === 0 &&
    (!activeDiscount || !activeDiscount.is_active)
  ) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Discount Banner with actions */}
      {activeDiscount && activeDiscount.is_active && activeDiscount.discount_percent > 0 && (
        <div className="card border-success-500/30 bg-gradient-to-br from-success-500/10 to-accent-500/5">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-success-500/20 text-success-400">
                <span className="text-2xl">🏷️</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-dark-100">
                    {t('promo.offers.discountActiveTitle', {
                      percent: activeDiscount.discount_percent,
                    })}
                  </h3>
                  <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs font-bold text-success-400">
                    -{activeDiscount.discount_percent}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-dark-400">
                  {activeDiscount.expires_at && (
                    <div className="flex items-center gap-1">
                      <ClockIcon />
                      <span>
                        {t('promo.offers.expires', {
                          time: formatTimeLeft(activeDiscount.expires_at, t),
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={handleUseNow}
                className="flex-1 rounded-xl bg-gradient-to-r from-success-500 to-success-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-success-500/25 transition-all hover:from-success-400 hover:to-success-500 active:from-success-600 active:to-success-700"
              >
                {t('promo.useNow')}
              </button>
              <button
                onClick={handleDeactivateClick}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-dark-600/50 bg-dark-900/50 px-4 py-2.5 text-sm text-dark-400 transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
              >
                <XCircleIcon />
                <span>{t('promo.deactivate.button')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-success-500/30 bg-success-500/10 p-4 text-success-400">
          <CheckIcon />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-4 text-error-400">
          {errorMessage}
        </div>
      )}

      {/* Available Offers */}
      {availableOffers.length > 0 && (
        <div className="space-y-3">
          {availableOffers.map((offer) => (
            <div
              key={offer.id}
              className="card border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent transition-colors hover:border-orange-500/50"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20">
                  {getOfferIcon(offer.effect_type, offer.discount_percent)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="font-semibold text-dark-100">{getOfferTitle(offer, t)}</h3>
                    {offer.effect_type === 'test_access' && (
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
                        {t('promo.offers.test')}
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-dark-400">{getOfferDescription(offer, t)}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 text-xs text-dark-500">
                      <ClockIcon />
                      <span>
                        {t('promo.offers.remaining', { time: formatTimeLeft(offer.expires_at, t) })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleClaim(offer.id)}
                      disabled={claimingId === offer.id}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30 active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
                    >
                      {/* Shimmer effect */}
                      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                      {claimingId === offer.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>{t('promo.offers.activating')}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">🎁</span>
                          <span>{t('promo.offers.activate')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {offersLoading && (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-xl bg-dark-700" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-dark-700" />
              <div className="h-4 w-48 animate-pulse rounded bg-dark-700" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
