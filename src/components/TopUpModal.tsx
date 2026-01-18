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

  if (isTelegramPaymentLink(url) && webApp?.openTelegramLink) {
    try { webApp.openTelegramLink(url); return } catch (e) { console.warn('[TopUpModal] openTelegramLink failed:', e) }
  }

  if (webApp?.openLink) {
    try { webApp.openLink(url, { try_instant_view: false }); return } catch (e) { console.warn('[TopUpModal] webApp.openLink failed:', e) }
  }

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
  initialAmountRubles?: number
}

export default function TopUpModal({ method, onClose, initialAmountRubles }: TopUpModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } = useCurrency()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const popupRef = useRef<Window | null>(null)

  const hasOptions = method.options && method.options.length > 0
  const minRubles = method.min_amount_kopeks / 100
  const maxRubles = method.max_amount_kopeks / 100
  const methodKey = method.id.toLowerCase().replace(/-/g, '_')
  const isStarsMethod = methodKey.includes('stars')
  const methodName = t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' }) || method.name
  const isTelegramMiniApp = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData)

  // Detect keyboard open/close
  useEffect(() => {
    const handleFocus = () => setIsKeyboardOpen(true)
    const handleBlur = () => setTimeout(() => setIsKeyboardOpen(false), 100)

    const input = inputRef.current
    if (input) {
      input.addEventListener('focus', handleFocus)
      input.addEventListener('blur', handleBlur)
      return () => {
        input.removeEventListener('focus', handleFocus)
        input.removeEventListener('blur', handleBlur)
      }
    }
  }, [])

  // Scroll to input when keyboard opens
  useEffect(() => {
    if (isKeyboardOpen && containerRef.current && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 150)
    }
  }, [isKeyboardOpen])

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
          else if (status === 'cancelled') { setError(null) }
        })
      } catch (e) { setError('Ошибка открытия окна оплаты: ' + String(e)) }
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { detail?: string }, status?: number } }
      setError(`Ошибка API (${axiosError?.response?.status || 'network'}): ${axiosError?.response?.data?.detail || 'Не удалось создать счёт'}`)
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
      if (redirectUrl) openPaymentLink(redirectUrl, popupRef.current)
      popupRef.current = null
      onClose()
    },
    onError: (error: unknown) => {
      try { if (popupRef.current && !popupRef.current.closed) popupRef.current.close() } catch {}
      popupRef.current = null
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || ''
      if (detail.includes('not yet implemented')) setError(t('balance.useBot'))
      else setError(detail || t('common.error'))
    },
  })

  const handleSubmit = () => {
    setError(null)
    inputRef.current?.blur()

    if (!checkRateLimit(RATE_LIMIT_KEYS.PAYMENT, 3, 30000)) {
      setError(t('balance.tooManyRequests', { seconds: getRateLimitResetTime(RATE_LIMIT_KEYS.PAYMENT) }) || 'Подождите...')
      return
    }

    if (hasOptions && !selectedOption) { setError(t('balance.selectPaymentOption', 'Выберите способ')); return }
    const amountCurrency = parseFloat(amount)
    if (isNaN(amountCurrency) || amountCurrency <= 0) { setError(t('balance.invalidAmount', 'Введите сумму')); return }
    const amountRubles = convertToRub(amountCurrency)
    if (amountRubles < minRubles) { setError(t('balance.minAmountError', { amount: minRubles })); return }
    if (amountRubles > maxRubles) { setError(t('balance.maxAmountError', { amount: maxRubles })); return }

    const amountKopeks = Math.round(amountRubles * 100)
    if (!isTelegramMiniApp) {
      try { popupRef.current = window.open('', '_blank') } catch { popupRef.current = null }
    }
    if (isStarsMethod) { starsPaymentMutation.mutate(amountKopeks); return }
    topUpMutation.mutate(amountKopeks)
  }

  const quickAmounts = [100, 300, 500, 1000].filter((a) => a >= minRubles && a <= maxRubles)
  const currencyDecimals = targetCurrency === 'IRR' || targetCurrency === 'RUB' ? 0 : 2
  const getQuickAmountValue = (rubAmount: number): string => {
    if (targetCurrency === 'IRR') return Math.round(convertAmount(rubAmount)).toString()
    return convertAmount(rubAmount).toFixed(currencyDecimals)
  }
  const inputStep = currencyDecimals === 0 ? 1 : 0.01
  const isPending = topUpMutation.isPending || starsPaymentMutation.isPending

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={containerRef}
        className="relative w-full sm:max-w-md sm:mx-4 bg-dark-900 sm:rounded-2xl rounded-t-2xl border border-dark-700/50 shadow-2xl animate-slide-up max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Compact Header */}
        <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-dark-100">{methodName}</h2>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-3">
            {/* Payment options - compact grid */}
            {hasOptions && method.options && (
              <div className="grid grid-cols-2 gap-2">
                {method.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedOption(option.id)}
                    className={`p-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      selectedOption === option.id
                        ? 'bg-accent-500 text-white'
                        : 'bg-dark-800 text-dark-300 active:bg-dark-700'
                    }`}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            )}

            {/* Amount input with currency */}
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${formatAmount(minRubles, 0)} – ${formatAmount(maxRubles, 0)}`}
                step={inputStep}
                className="w-full h-14 px-4 pr-16 text-xl font-semibold bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                autoComplete="off"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 font-medium text-lg">
                {currencySymbol}
              </span>
            </div>

            {/* Quick amounts - compact */}
            {quickAmounts.length > 0 && (
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
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-accent-500 text-white'
                          : 'bg-dark-800 text-dark-300 active:bg-dark-700'
                      }`}
                    >
                      {formatAmount(a, 0)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-error-500/10 border border-error-500/30 text-error-400 px-3 py-2 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Footer with Submit */}
        <div className="flex-shrink-0 p-4 pt-3 border-t border-dark-800 bg-dark-900 safe-area-inset-bottom">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount}
            className="btn-primary w-full h-12 text-base font-semibold"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span className="flex items-center justify-center gap-2">
                {t('balance.topUp')}
                {amount && parseFloat(amount) > 0 && (
                  <span className="opacity-80">{formatAmount(parseFloat(amount), currencyDecimals)} {currencySymbol}</span>
                )}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
