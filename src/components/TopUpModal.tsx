import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { balanceApi } from '../api/balance'
import { useCurrency } from '../hooks/useCurrency'
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit'
import type { PaymentMethod } from '../types'

const TELEGRAM_LINK_REGEX = /^https?:\/\/t\.me\//i

const isTelegramPaymentLink = (url: string): boolean => TELEGRAM_LINK_REGEX.test(url)

const openPaymentLink = (url: string, reservedWindow?: Window | null) => {
  if (typeof window === 'undefined' || !url) return
  const webApp = window.Telegram?.WebApp

  // If inside Telegram Mini App, let Telegram handle t.me links
  if (isTelegramPaymentLink(url) && webApp?.openTelegramLink) {
    try { webApp.openTelegramLink(url); return } catch (e) { console.warn('[TopUpModal] openTelegramLink failed:', e) }
  }

  // Inside Telegram Mini App → open in external browser
  if (webApp?.openLink) {
    try { webApp.openLink(url, { try_instant_view: false }); return } catch (e) { console.warn('[TopUpModal] webApp.openLink failed:', e) }
  }

  // Regular browser: use reserved popup window if available
  if (reservedWindow && !reservedWindow.closed) {
    try { reservedWindow.location.href = url; reservedWindow.focus?.() } catch (e) { console.warn('[TopUpModal] Failed to use reserved window:', e) }
    return
  }

  const w2 = window.open(url, '_blank', 'noopener,noreferrer')
  if (w2) { w2.opener = null; return }
  window.location.href = url
}

interface TopUpModalProps {
  method: PaymentMethod
  onClose: () => void
  /** Pre-filled amount in rubles (will be converted to user's currency) */
  initialAmountRubles?: number
}

export default function TopUpModal({ method, onClose, initialAmountRubles }: TopUpModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } = useCurrency()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calculate initial amount in user's currency
  const getInitialAmount = (): string => {
    if (!initialAmountRubles || initialAmountRubles <= 0) return ''
    const converted = convertAmount(initialAmountRubles)
    if (targetCurrency === 'IRR' || targetCurrency === 'RUB') {
      return Math.ceil(converted).toString()
    }
    return converted.toFixed(2)
  }

  const [amount, setAmount] = useState(getInitialAmount)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(
    method.options && method.options.length > 0 ? method.options[0].id : null
  )
  const popupRef = useRef<Window | null>(null)

  const hasOptions = method.options && method.options.length > 0

  const minRubles = method.min_amount_kopeks / 100
  const maxRubles = method.max_amount_kopeks / 100

  const methodKey = method.id.toLowerCase().replace(/-/g, '_')
  const isStarsMethod = methodKey.includes('stars')
  const methodName = t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' }) || method.name
  const isTelegramMiniApp = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData)

  // Handle visual viewport changes (keyboard appearance on mobile)
  useEffect(() => {
    const handleResize = () => {
      // Scroll input into view when keyboard appears
      if (document.activeElement === inputRef.current) {
        setTimeout(() => {
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize)
      return () => window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [])

  // Stars payment using the same approach as Wheel.tsx
  const starsPaymentMutation = useMutation({
    mutationFn: (amountKopeks: number) => balanceApi.createStarsInvoice(amountKopeks),
    onSuccess: (data) => {
      const webApp = window.Telegram?.WebApp

      if (!data.invoice_url) {
        setError('Сервер не вернул ссылку на оплату')
        return
      }

      if (!webApp?.openInvoice) {
        setError('Оплата Stars доступна только в Telegram Mini App')
        return
      }

      try {
        webApp.openInvoice(data.invoice_url, (status) => {
          if (status === 'paid') {
            setError(null)
            onClose()
          } else if (status === 'failed') {
            setError(t('wheel.starsPaymentFailed'))
          } else if (status === 'cancelled') {
            setError(null)
          }
        })
      } catch (e) {
        setError('Ошибка открытия окна оплаты: ' + String(e))
      }
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { detail?: string }, status?: number } }
      const detail = axiosError?.response?.data?.detail
      const status = axiosError?.response?.status
      setError(`Ошибка API (${status || 'network'}): ${detail || 'Не удалось создать счёт'}`)
    },
  })

  const topUpMutation = useMutation<{
    payment_id: string
    payment_url?: string
    invoice_url?: string
    amount_kopeks: number
    amount_rubles: number
    status: string
    expires_at: string | null
  }, unknown, number>({
    mutationFn: (amountKopeks: number) => balanceApi.createTopUp(amountKopeks, method.id, selectedOption || undefined),
    onSuccess: (data) => {
      const redirectUrl = data.payment_url || (data as any).invoice_url
      if (redirectUrl) {
        openPaymentLink(redirectUrl, popupRef.current)
      }
      popupRef.current = null
      onClose()
    },
    onError: (error: unknown) => {
      try { if (popupRef.current && !popupRef.current.closed) popupRef.current.close() } catch (e) { console.warn('[TopUpModal] Failed to close popup:', e) }
      popupRef.current = null
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || ''
      if (detail.includes('not yet implemented')) setError(t('balance.useBot'))
      else setError(detail || t('common.error'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Hide keyboard on mobile
    inputRef.current?.blur()

    // Rate limit check: max 3 payment attempts per 30 seconds
    if (!checkRateLimit(RATE_LIMIT_KEYS.PAYMENT, 3, 30000)) {
      const resetTime = getRateLimitResetTime(RATE_LIMIT_KEYS.PAYMENT)
      setError(t('balance.tooManyRequests', { seconds: resetTime }) || `Слишком много запросов. Подождите ${resetTime} сек.`)
      return
    }

    if (hasOptions && !selectedOption) { setError(t('balance.selectPaymentOption', 'Выберите способ оплаты')); return }
    const amountCurrency = parseFloat(amount)
    if (isNaN(amountCurrency) || amountCurrency <= 0) { setError(t('balance.invalidAmount', 'Invalid amount')); return }
    const amountRubles = convertToRub(amountCurrency)
    if (amountRubles < minRubles) { setError(t('balance.minAmountError', { amount: minRubles })); return }
    if (amountRubles > maxRubles) { setError(t('balance.maxAmountError', { amount: maxRubles })); return }
    const amountKopeks = Math.round(amountRubles * 100)
    // Pre-open popup window to avoid browser blocking (must happen in user click context)
    if (!isTelegramMiniApp) {
      try { popupRef.current = window.open('', '_blank') } catch { popupRef.current = null }
    }
    if (isStarsMethod) {
      starsPaymentMutation.mutate(amountKopeks); return
    }
    topUpMutation.mutate(amountKopeks)
  }

  const quickAmounts = [100, 300, 500, 1000].filter((a) => a >= minRubles && a <= maxRubles)
  const currencyDecimals = targetCurrency === 'IRR' || targetCurrency === 'RUB' ? 0 : 2
  const getQuickAmountValue = (rubAmount: number): string => {
    if (targetCurrency === 'IRR') return Math.round(convertAmount(rubAmount)).toString()
    return convertAmount(rubAmount).toFixed(currencyDecimals)
  }
  const inputStep = currencyDecimals === 0 ? 1 : 0.01
  const minInputValue = targetCurrency === 'RUB' ? minRubles : targetCurrency === 'IRR' ? Math.round(convertAmount(minRubles)) : Number(convertAmount(minRubles).toFixed(currencyDecimals))
  const maxInputValue = targetCurrency === 'RUB' ? maxRubles : targetCurrency === 'IRR' ? Math.round(convertAmount(maxRubles)) : Number(convertAmount(maxRubles).toFixed(currencyDecimals))

  const isPending = topUpMutation.isPending || starsPaymentMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal content - bottom sheet on mobile, centered on desktop */}
      <div className="relative w-full sm:max-w-md sm:mx-4 bg-dark-900 sm:rounded-2xl rounded-t-2xl border border-dark-700/50 shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header - sticky */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 sm:p-5 border-b border-dark-800">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">{t('balance.topUp')}</h2>
            <p className="text-sm text-dark-400 mt-0.5">{methodName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-dark-800 hover:bg-dark-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
            {/* Payment options */}
            {hasOptions && method.options && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('balance.paymentOption', 'Способ оплаты')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {method.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOption(option.id)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all text-left ${
                        selectedOption === option.id
                          ? 'bg-accent-500 text-white ring-2 ring-accent-400'
                          : 'bg-dark-800 text-dark-300 hover:bg-dark-700 active:bg-dark-600'
                      }`}
                    >
                      <span className="block">{option.name}</span>
                      {option.description && (
                        <span className={`block text-xs mt-0.5 ${selectedOption === option.id ? 'text-white/70' : 'text-dark-500'}`}>
                          {option.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount input */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                {t('balance.amount')} ({currencySymbol})
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${formatAmount(minRubles, currencyDecimals)} - ${formatAmount(maxRubles, currencyDecimals)}`}
                  min={minInputValue}
                  max={maxInputValue}
                  step={inputStep}
                  className="input text-lg pr-14 h-14"
                  autoComplete="off"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 font-medium">
                  {currencySymbol}
                </span>
              </div>
              <p className="text-xs text-dark-500 mt-2">
                {t('balance.minAmount')}: {formatAmount(minRubles, currencyDecimals)} — {t('balance.maxAmount')}: {formatAmount(maxRubles, currencyDecimals)} {currencySymbol}
              </p>
            </div>

            {/* Quick amounts */}
            {quickAmounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">{t('balance.quickAmount', 'Быстрый выбор')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAmounts.map((a) => {
                    const quickValue = getQuickAmountValue(a)
                    const isSelected = amount === quickValue
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => {
                          setAmount(quickValue)
                          inputRef.current?.blur()
                        }}
                        className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-accent-500 text-white'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 active:bg-dark-600'
                        }`}
                      >
                        {formatAmount(a, 0)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Footer with buttons - sticky at bottom */}
        <div className="flex-shrink-0 px-4 sm:px-5 pt-4 sm:pt-5 safe-area-inset-bottom border-t border-dark-800 bg-dark-900">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 h-12 text-base"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isPending || !amount}
              className="btn-primary flex-[2] h-12 text-base font-semibold"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </span>
              ) : (
                <>
                  {t('balance.topUp')}
                  {amount && (
                    <span className="ml-1 opacity-80">
                      {formatAmount(parseFloat(amount) || 0, currencyDecimals)} {currencySymbol}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
