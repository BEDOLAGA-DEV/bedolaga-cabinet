import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { balanceApi } from '../api/balance'
import { useCurrency } from '../hooks/useCurrency'
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit'
import type { PaymentMethod } from '../types'
import BentoCard from './ui/BentoCard'

const TELEGRAM_LINK_REGEX = /^https?:\/\/t\.me\//i
const isTelegramPaymentLink = (url: string): boolean => TELEGRAM_LINK_REGEX.test(url)

const openPaymentLink = (url: string, reservedWindow?: Window | null) => {
  if (typeof window === 'undefined' || !url) return
  const webApp = window.Telegram?.WebApp

  if (isTelegramPaymentLink(url) && webApp?.openTelegramLink) {
    try { webApp.openTelegramLink(url); return } catch (e) { console.warn('[TopUpModal] openTelegramLink failed:', e) }
  }
  if (webApp?.openLink) {
    // try_browser: true - открывает диалог для перехода во внешний браузер (важно для мобильных)
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

interface TopUpModalProps {
  method: PaymentMethod
  onClose: () => void
  initialAmountRubles?: number
}

export default function TopUpModal({ method, onClose, initialAmountRubles }: TopUpModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } = useCurrency()
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Scroll lock when modal is open
  useEffect(() => {
    const scrollY = window.scrollY

    // Prevent all touch/wheel scroll on backdrop
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

  // Auto-focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  const modalContent = (
    <div
      className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-hidden animate-in fade-in duration-200"
      style={{
        paddingBottom: `max(1rem, env(safe-area-inset-bottom, 0px))`,
      }}
      onClick={onClose}
    >
      <div
        data-modal-content
        className="w-full max-w-sm bg-dark-900/90 backdrop-blur-xl rounded-[32px] border border-dark-700/50 shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-dark-800/30 border-b border-dark-700/30">
          <span className="text-lg font-bold text-dark-50 tracking-tight">{methodName}</span>
          <button 
            onClick={onClose} 
            className="p-2 -mr-2 rounded-xl hover:bg-dark-700/50 text-dark-400 hover:text-dark-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {quickAmounts.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map((a) => {
                const val = getQuickValue(a)
                const isSelected = amount === val
                
                return (
                  <BentoCard
                    key={a}
                    as="button"
                    type="button"
                    onClick={() => { setAmount(val); inputRef.current?.blur() }}
                    className={`flex flex-col items-center justify-center py-4 px-2 transition-all duration-300 group
                      ${isSelected 
                        ? 'border-accent-500 bg-accent-500/10 shadow-glow' 
                        : 'hover:bg-dark-800/80 hover:border-dark-600'
                      }`}
                  >
                    <span className={`text-xl font-extrabold mb-0.5 ${isSelected ? 'text-accent-400' : 'text-dark-100 group-hover:text-white'}`}>
                      {formatAmount(a, 0)}
                    </span>
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-accent-300/80' : 'text-dark-500 group-hover:text-dark-400'}`}>
                      {currencySymbol}
                    </span>
                  </BentoCard>
                )
              })}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                {t('balance.amount') || 'Amount'}
              </label>
              <span className="text-xs text-dark-500 font-medium">
                {formatAmount(minRubles, 0)} – {formatAmount(maxRubles, 0)} {currencySymbol}
              </span>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-500/20 to-accent-600/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
              <div className="relative flex items-center bg-dark-800/50 border border-dark-700/50 rounded-2xl p-1 focus-within:bg-dark-800 focus-within:border-accent-500/50 transition-all duration-300">
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full h-14 pl-5 pr-12 text-2xl font-bold bg-transparent text-dark-50 placeholder:text-dark-600 focus:outline-none"
                  autoComplete="off"
                />
                <div className="absolute right-5 pointer-events-none">
                  <span className="text-lg font-bold text-dark-400 group-focus-within:text-accent-400 transition-colors">
                    {currencySymbol}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {hasOptions && method.options && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-dark-400 uppercase tracking-wider px-1">
                Method Type
              </label>
              <div className="grid grid-cols-2 gap-2 bg-dark-800/30 p-1.5 rounded-2xl border border-dark-700/30">
                {method.options.map((opt) => {
                  const isSelected = selectedOption === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedOption(opt.id)}
                      className={`relative py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                        isSelected
                          ? 'bg-dark-700 text-white shadow-lg'
                          : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                      }`}
                    >
                      {isSelected && (
                         <div className="absolute inset-0 bg-gradient-to-tr from-accent-500/10 to-transparent rounded-xl pointer-events-none" />
                      )}
                      {opt.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error-500/10 border border-error-500/20 rounded-xl p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="text-error-400 mt-0.5">
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-medium text-error-200 leading-snug">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount}
            className={`
              w-full h-14 rounded-2xl text-base font-bold tracking-wide transition-all duration-300
              ${isPending || !amount 
                ? 'bg-dark-800 text-dark-500 cursor-not-allowed border border-dark-700' 
                : 'bg-accent-500 text-white shadow-lg shadow-accent-500/30 hover:bg-accent-400 hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {isPending ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>{t('balance.topUp')}</span>
                {amount && parseFloat(amount) > 0 && (
                  <>
                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                    <span>{formatAmount(parseFloat(amount), currencyDecimals)} {currencySymbol}</span>
                  </>
                )}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  return modalContent
}

