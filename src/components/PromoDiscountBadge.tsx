import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { promoApi } from '../api/promo'

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
)

const ClockIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const formatTimeLeft = (expiresAt: string, t: (key: string) => string): string => {
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

  if (diffMs <= 0) return ''

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}${t('promo.time.days')}`
  }
  if (hours > 0) {
    return `${hours}${t('promo.time.hours')} ${minutes}${t('promo.time.minutes')}`
  }
  return `${minutes}${t('promo.time.minutes')}`
}

export default function PromoDiscountBadge() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
    refetchInterval: 60000, // Refresh every minute
  })

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Don't render if no active discount
  if (!activeDiscount || !activeDiscount.is_active || !activeDiscount.discount_percent) {
    return null
  }

  const timeLeft = activeDiscount.expires_at ? formatTimeLeft(activeDiscount.expires_at, t) : null

  const handleClick = () => {
    setIsOpen(!isOpen)
  }

  const handleGoToSubscription = () => {
    setIsOpen(false)
    navigate('/subscription')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Badge button */}
      <button
        onClick={handleClick}
        className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-success-500/20 to-accent-500/20 border border-success-500/30 hover:border-success-500/50 transition-all group"
        title={t('promo.activeDiscount', 'Active discount')}
      >
        {/* Animated sparkle effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-success-500/10 to-accent-500/10 animate-pulse" />

        <SparklesIcon />
        <span className="relative font-bold text-success-400 text-sm">
          -{activeDiscount.discount_percent}%
        </span>

        {/* Notification dot */}
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-success-400 rounded-full animate-pulse" />
      </button>

      {/* Dropdown - mobile: fixed centered, desktop: absolute right */}
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed left-4 right-4 top-20 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 bg-dark-800 rounded-xl shadow-xl border border-dark-700/50 z-50 animate-fade-in overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-success-500/20 to-accent-500/20 p-4 border-b border-dark-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success-500/20 flex items-center justify-center text-success-400">
                  <SparklesIcon />
                </div>
                <div>
                  <div className="font-semibold text-dark-100">
                    {t('promo.discountActive')}
                  </div>
                  <div className="text-2xl font-bold text-success-400">
                    -{activeDiscount.discount_percent}%
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-dark-300">
                {t('promo.discountDescription')}
              </p>

              {/* Time remaining */}
              {timeLeft && (
                <div className="flex items-center gap-2 text-sm text-dark-400 bg-dark-900/50 px-3 py-2 rounded-lg">
                  <ClockIcon />
                  <span>{t('promo.expiresIn')}: <span className="text-warning-400 font-medium">{timeLeft}</span></span>
                </div>
              )}

              {/* CTA Button */}
              <button
                onClick={handleGoToSubscription}
                className="w-full btn-primary py-2.5 text-sm font-medium"
              >
                {t('promo.useNow')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
