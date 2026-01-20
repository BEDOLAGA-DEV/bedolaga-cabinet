import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { balanceApi } from '../api/balance'
import { useCurrency } from '../hooks/useCurrency'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit'
import type { PaymentMethod } from '../types'

const TELEGRAM_LINK_REGEX = /^https?:\/\/t\.me\//i
const isTelegramPaymentLink = (url: string): boolean => TELEGRAM_LINK_REGEX.test(url)

const openPaymentLink = (url: string, reservedWindow?: Window | null) => {
  if (typeof window === 'undefined' || !url) return
  const webApp = window.Telegram?.WebApp

  if (isTelegramPaymentLink(url) && webApp?.openTelegramLink) {
    try { webApp.openTelegramLink(url); return } catch (e) { console.warn('[TopUpModal] openTelegramLink failed:', e) }
  }
  if (webApp?.openLink) {
    try { webApp.openLink(url, { try_instant_view: false, try_browser: true }); return } catch (e) { console.warn('[TopUpModal] webApp.openLink failed:', e) }
  }
  if (reservedWindow && !reservedWindow.closed) {
    try { reservedWindow.location.href = url; reservedWindow.focus?.() } catch (e) { console.warn('[TopUpModal] Failed to use reserved window:', e) }
    return
  }
  const w2 = window.open(url, '_blank', 'noopener,noreferrer')
  if (w2) { w2.opener = null; return }
  window.location.href = url
}

// Icons
const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const WalletIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
)

const StarIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const CardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
)

const CryptoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

interface TopUpModalProps {
  method: PaymentMethod
  onClose: () => void
  initialAmountRubles?: number
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 640
  })
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

// Get method icon based on method type
const getMethodIcon = (methodId: string) => {
  const id = methodId.toLowerCase()
  if (id.includes('stars')) return <StarIcon />
  if (id.includes('crypto') || id.includes('ton') || id.includes('usdt')) return <CryptoIcon />
  return <CardIcon />
}

export default function TopUpModal({ method, onClose, initialAmountRubles }: TopUpModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } = useCurrency()
  const { isTelegramWebApp, safeAreaInset, contentSafeAreaInset, webApp } = useTelegramWebApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobileScreen = useIsMobile()

  const safeBottom = isTelegramWebApp ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom) : 0

  const getInitialAmount = (): string => {
    if (!initialAmountRubles || initialAmountRubles <= 0) return ''
    const converted = convertAmount(initialAmountRubles)
    return (targetCurrency === 'IRR' || targetCurrency === 'RUB')
      ? Math.ceil(converted).toString()
      : converted.toFixed(2)
  }

  const [amount, setAmount] = useState(getInitialAmount)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(
    method.options && method.options.length > 0 ? method.options[0].id : null
  )
  const popupRef = useRef<Window | null>(null)
  const [isInputFocused, setIsInputFocused] = useState(false)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Keyboard: Escape to close (PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // Telegram back button (Android)
  useEffect(() => {
    if (!webApp?.BackButton) return
    webApp.BackButton.show()
    webApp.BackButton.onClick(handleClose)
    return () => {
      webApp.BackButton.offClick(handleClose)
      webApp.BackButton.hide()
    }
  }, [webApp, handleClose])

  // Scroll lock
  useEffect(() => {
    const scrollY = window.scrollY
    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-modal-content]')) return
      e.preventDefault()
    }
    const preventWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-modal-content]')) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', preventScroll, { passive: false })
    document.addEventListener('wheel', preventWheel, { passive: false })
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('touchmove', preventScroll)
      document.removeEventListener('wheel', preventWheel)
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  const hasOptions = method.options && method.options.length > 0
  const minRubles = method.min_amount_kopeks / 100
  const maxRubles = method.max_amount_kopeks / 100
  const methodKey = method.id.toLowerCase().replace(/-/g, '_')
  const isStarsMethod = methodKey.includes('stars')
  const methodName = t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' }) || method.name
  const isTelegramMiniApp = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData)

  const starsPaymentMutation = useMutation({
    mutationFn: (amountKopeks: number) => balanceApi.createStarsInvoice(amountKopeks),
    onSuccess: (data) => {
      const webApp = window.Telegram?.WebApp
      if (!data.invoice_url) { setError('Сервер не вернул ссылку на оплату'); return }
      if (!webApp?.openInvoice) { setError('Оплата Stars доступна только в Telegram Mini App'); return }
      try {
        webApp.openInvoice(data.invoice_url, (status) => {
          if (status === 'paid') { setError(null); onClose() }
          else if (status === 'failed') { setError(t('wheel.starsPaymentFailed')) }
        })
      } catch (e) { setError('Ошибка: ' + String(e)) }
    },
    onError: (err: unknown) => {
      const axiosError = err as { response?: { data?: { detail?: string }, status?: number } }
      setError(`Ошибка: ${axiosError?.response?.data?.detail || 'Не удалось создать счёт'}`)
    },
  })

  const topUpMutation = useMutation<{
    payment_id: string; payment_url?: string; invoice_url?: string
    amount_kopeks: number; amount_rubles: number; status: string; expires_at: string | null
  }, unknown, number>({
    mutationFn: (amountKopeks: number) => balanceApi.createTopUp(amountKopeks, method.id, selectedOption || undefined),
    onSuccess: (data) => {
      const redirectUrl = data.payment_url || (data as any).invoice_url
      if (redirectUrl) openPaymentLink(redirectUrl, popupRef.current)
      popupRef.current = null
      onClose()
    },
    onError: (err: unknown) => {
      try { if (popupRef.current && !popupRef.current.closed) popupRef.current.close() } catch {}
      popupRef.current = null
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || ''
      setError(detail.includes('not yet implemented') ? t('balance.useBot') : (detail || t('common.error')))
    },
  })

  const handleSubmit = () => {
    setError(null)
    inputRef.current?.blur()

    if (!checkRateLimit(RATE_LIMIT_KEYS.PAYMENT, 3, 30000)) {
      setError('Подождите ' + getRateLimitResetTime(RATE_LIMIT_KEYS.PAYMENT) + ' сек.')
      return
    }
    if (hasOptions && !selectedOption) { setError('Выберите способ'); return }
    const amountCurrency = parseFloat(amount)
    if (isNaN(amountCurrency) || amountCurrency <= 0) { setError('Введите сумму'); return }
    const amountRubles = convertToRub(amountCurrency)
    if (amountRubles < minRubles || amountRubles > maxRubles) {
      setError(`Сумма: ${minRubles} – ${maxRubles} ₽`); return
    }

    const amountKopeks = Math.round(amountRubles * 100)
    if (!isTelegramMiniApp) {
      try { popupRef.current = window.open('', '_blank') } catch { popupRef.current = null }
    }
    if (isStarsMethod) { starsPaymentMutation.mutate(amountKopeks) }
    else { topUpMutation.mutate(amountKopeks) }
  }

  const quickAmounts = [100, 300, 500, 1000].filter((a) => a >= minRubles && a <= maxRubles)
  const currencyDecimals = (targetCurrency === 'IRR' || targetCurrency === 'RUB') ? 0 : 2
  const getQuickValue = (rub: number) => (targetCurrency === 'IRR')
    ? Math.round(convertAmount(rub)).toString()
    : convertAmount(rub).toFixed(currencyDecimals)
  const isPending = topUpMutation.isPending || starsPaymentMutation.isPending

  // Auto-focus input - works on mobile in Telegram WebApp
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        // For iOS Safari - scroll input into view to trigger keyboard
        if (isMobileScreen) {
          inputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Calculate display amount for preview
  const displayAmount = amount && parseFloat(amount) > 0 ? parseFloat(amount) : 0

  // Content JSX - shared between mobile and desktop
  const contentJSX = (
    <div className="space-y-5">
      {/* Header icon and method */}
      <div className="flex items-center gap-4 pb-1">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          isStarsMethod
            ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-400'
            : 'bg-gradient-to-br from-accent-500/20 to-accent-600/20 text-accent-400'
        }`}>
          <div className="w-7 h-7 flex items-center justify-center">
            {getMethodIcon(method.id)}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-dark-100">{methodName}</h3>
          <p className="text-sm text-dark-400">
            {formatAmount(minRubles, 0)} – {formatAmount(maxRubles, 0)} {currencySymbol}
          </p>
        </div>
      </div>

      {/* Payment options (if any) */}
      {hasOptions && method.options && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-dark-400">{t('balance.paymentMethod')}</label>
          <div className="grid grid-cols-2 gap-2">
            {method.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                className={`relative py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectedOption === opt.id
                    ? 'bg-accent-500/15 text-accent-400 ring-2 ring-accent-500/40'
                    : 'bg-dark-800/70 text-dark-300 hover:bg-dark-700/70 border border-dark-700/50'
                }`}
              >
                {opt.name}
                {selectedOption === opt.id && (
                  <span className="absolute top-1.5 right-1.5">
                    <span className="w-2 h-2 rounded-full bg-accent-500 block" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Amount input - modern design */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-dark-400">{t('balance.enterAmount')}</label>
        <div className={`relative rounded-2xl transition-all duration-200 ${
          isInputFocused
            ? 'ring-2 ring-accent-500/50 bg-dark-800'
            : 'bg-dark-800/70 border border-dark-700/50'
        }`}>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            enterKeyHint="done"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit() } }}
            placeholder="0"
            className="w-full h-16 px-5 pr-16 text-2xl font-bold bg-transparent text-dark-100 placeholder:text-dark-600 focus:outline-none"
            style={{ fontSize: '24px' }}
            autoComplete="off"
            autoFocus
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-dark-500">
            {currencySymbol}
          </span>
        </div>
      </div>

      {/* Quick amount buttons */}
      {quickAmounts.length > 0 && (
        <div className="flex gap-2">
          {quickAmounts.map((a) => {
            const val = getQuickValue(a)
            const isSelected = amount === val
            return (
              <button
                key={a}
                type="button"
                onClick={() => { setAmount(val); inputRef.current?.blur() }}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isSelected
                    ? 'bg-accent-500/20 text-accent-400 ring-1 ring-accent-500/40'
                    : 'bg-dark-800/50 text-dark-400 hover:bg-dark-800 hover:text-dark-300 border border-dark-700/30'
                }`}
              >
                {formatAmount(a, 0)}
              </button>
            )
          })}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-error-500/10 border border-error-500/20">
          <svg className="w-5 h-5 text-error-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-error-400">{error}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !amount || parseFloat(amount) <= 0}
        className={`relative w-full h-14 rounded-2xl text-base font-bold transition-colors duration-200 overflow-hidden ${
          isPending || !amount || parseFloat(amount) <= 0
            ? 'bg-dark-700 text-dark-500 cursor-not-allowed'
            : isStarsMethod
              ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/25 hover:from-yellow-400 hover:to-orange-400 active:from-yellow-600 active:to-orange-600'
              : 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/25 hover:from-accent-400 hover:to-accent-500 active:from-accent-600 active:to-accent-700'
        }`}
      >
        {isPending ? (
          <div className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <SparklesIcon />
            <span>{t('balance.topUp')}</span>
            {displayAmount > 0 && (
              <span className="opacity-90">
                {formatAmount(displayAmount, currencyDecimals)} {currencySymbol}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  )

  // Render modal based on screen size - NO nested components!
  const modalContent = isMobileScreen ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/70"
        onClick={handleClose}
      />
      {/* Bottom sheet */}
      <div
        data-modal-content
        className="fixed inset-x-0 bottom-0 z-[9999] bg-dark-900 rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ paddingBottom: safeBottom ? `${safeBottom + 20}px` : 'max(20px, env(safe-area-inset-bottom))' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-dark-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-2">
            <WalletIcon />
            <span className="font-bold text-dark-100 text-lg">{t('balance.topUp')}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -mr-2 rounded-xl hover:bg-dark-800 text-dark-400 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-dark-700 to-transparent mx-5" />

        {/* Content */}
        <div className="px-5 py-5 overflow-y-auto">
          {contentJSX}
        </div>
      </div>
    </>
  ) : (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-start justify-center p-4 pt-[10vh]"
      onClick={handleClose}
    >
      <div
        data-modal-content
        className="w-full max-w-md bg-dark-900 rounded-3xl border border-dark-700/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-dark-800/80 to-dark-800/40 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
              <WalletIcon />
            </div>
            <span className="font-bold text-dark-100 text-lg">{t('balance.topUp')}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 -mr-1 rounded-xl hover:bg-dark-700 text-dark-400 transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {contentJSX}
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return modalContent
}
