import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { promoApi, PromoOffer } from '../api/promo'

// Icons
const GiftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

// Helper functions
const formatTimeLeft = (expiresAt: string): string => {
  const now = new Date()
  // Ensure UTC parsing - if no timezone specified, assume UTC
  let expires: Date
  if (expiresAt.includes('Z') || expiresAt.includes('+') || expiresAt.includes('-', 10)) {
    expires = new Date(expiresAt)
  } else {
    // No timezone - treat as UTC
    expires = new Date(expiresAt + 'Z')
  }
  const diffMs = expires.getTime() - now.getTime()

  if (diffMs <= 0) return 'Истекло'

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} дн.`
  }
  if (hours > 0) {
    return `${hours}ч ${minutes}м`
  }
  return `${minutes}м`
}

const getOfferIcon = (effectType: string) => {
  if (effectType === 'test_access') return <ServerIcon />
  return <SparklesIcon />
}

const getOfferTitle = (offer: PromoOffer): string => {
  if (offer.effect_type === 'test_access') {
    return 'Тестовый доступ'
  }
  if (offer.discount_percent) {
    return `Скидка ${offer.discount_percent}%`
  }
  return 'Специальное предложение'
}

const getOfferDescription = (offer: PromoOffer): string => {
  if (offer.effect_type === 'test_access') {
    const squads = offer.extra_data?.test_squad_uuids?.length || 0
    return squads > 0 ? `Доступ к ${squads} серверам` : 'Доступ к дополнительным серверам'
  }
  return 'Активируйте скидку на покупку подписки'
}

interface PromoOffersSectionProps {
  className?: string
}

export default function PromoOffersSection({ className = '' }: PromoOffersSectionProps) {
  const queryClient = useQueryClient()
  const [claimingId, setClaimingId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Fetch available offers
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['promo-offers'],
    queryFn: promoApi.getOffers,
    staleTime: 30000,
  })

  // Fetch active discount
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  })

  // Claim offer mutation
  const claimMutation = useMutation({
    mutationFn: promoApi.claimOffer,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['promo-offers'] })
      queryClient.invalidateQueries({ queryKey: ['active-discount'] })
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      setSuccessMessage(result.message)
      setClaimingId(null)
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.detail || 'Не удалось активировать предложение')
      setClaimingId(null)
      setTimeout(() => setErrorMessage(null), 5000)
    },
  })

  const handleClaim = (offerId: number) => {
    setClaimingId(offerId)
    setErrorMessage(null)
    setSuccessMessage(null)
    claimMutation.mutate(offerId)
  }

  // Filter unclaimed and active offers
  const availableOffers = offers.filter(o => o.is_active && !o.is_claimed)

  // Don't render if no offers and no active discount
  if (!offersLoading && availableOffers.length === 0 && (!activeDiscount || !activeDiscount.is_active)) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Active Discount Banner */}
      {activeDiscount && activeDiscount.is_active && activeDiscount.discount_percent > 0 && (
        <div className="card border-accent-500/30 bg-gradient-to-br from-accent-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0 text-accent-400">
              <CheckIcon />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-dark-100">
                  Скидка {activeDiscount.discount_percent}% активна
                </h3>
                <span className="px-2 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded">
                  Действует
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-dark-400">
                {activeDiscount.expires_at && (
                  <div className="flex items-center gap-1">
                    <ClockIcon />
                    <span>Истекает: {formatTimeLeft(activeDiscount.expires_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-success-500/10 border border-success-500/30 text-success-400 rounded-xl flex items-center gap-3">
          <CheckIcon />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-error-500/10 border border-error-500/30 text-error-400 rounded-xl">
          {errorMessage}
        </div>
      )}

      {/* Available Offers */}
      {availableOffers.length > 0 && (
        <div className="space-y-3">
          {availableOffers.map((offer) => (
            <div
              key={offer.id}
              className="card border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-transparent hover:border-orange-500/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0 text-orange-400">
                  {getOfferIcon(offer.effect_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-dark-100">
                      {getOfferTitle(offer)}
                    </h3>
                    {offer.effect_type === 'test_access' && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                        Тест
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-dark-400 mb-3">
                    {getOfferDescription(offer)}
                  </p>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 text-xs text-dark-500">
                      <ClockIcon />
                      <span>Осталось: {formatTimeLeft(offer.expires_at)}</span>
                    </div>
                    <button
                      onClick={() => handleClaim(offer.id)}
                      disabled={claimingId === offer.id}
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {claimingId === offer.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Активация...</span>
                        </>
                      ) : (
                        <>
                          <GiftIcon />
                          <span>Активировать</span>
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
            <div className="w-12 h-12 rounded-xl bg-dark-700 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 bg-dark-700 rounded animate-pulse" />
              <div className="h-4 w-48 bg-dark-700 rounded animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
