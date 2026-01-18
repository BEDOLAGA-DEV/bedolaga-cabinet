import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { balanceApi } from '../api/balance'
import { useCurrency } from '../hooks/useCurrency'
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit'
import type { PaymentMethod } from '../types'

const TELEGRAM_LINK_REGEX = /^https?:\/\/t\.me\//i
const CRYPTOBOT_INVOICE_REGEX = /^(?:https?:\/\/)?(?:app\.cr\.bot|cr\.bot)\/invoices\/([A-Za-z0-9_-]+)/i

const isTelegramPaymentLink = (url: string): boolean => TELEGRAM_LINK_REGEX.test(url)

const buildCryptoBotDeepLink = (url: string): string | null => {
  try {
    const m = url.match(CRYPTOBOT_INVOICE_REGEX)
    if (m && m[1]) return `tg://resolve?domain=CryptoBot&start=${m[1]}`
    const parsed = new URL(url)
    if (/^(?:www\.)?t\.me$/i.test(parsed.hostname) && /\/CryptoBot/i.test(parsed.pathname)) {
      return `tg://resolve?domain=CryptoBot${parsed.search || ''}`
    }
    return null
  } catch (e) {
    console.warn('[TopUpModal] Failed to build CryptoBot deep link:', e)
    return null
  }
}

const openPaymentLink = (url: string, reservedWindow?: Window | null) => {
  if (typeof window === 'undefined' || !url) return
  const webApp = window.Telegram?.WebApp

  // If inside Telegram Mini App, let Telegram handle t.me links
  if (isTelegramPaymentLink(url) && webApp?.openTelegramLink) {
    try { webApp.openTelegramLink(url); return } catch (e) { console.warn('[TopUpModal] openTelegramLink failed:', e) }
  }

  // Prefer Telegram deep link specifically for CryptoBot invoices, but only when
  // the backend didn't already return a direct t.me link (those work fine).
  const cb = buildCryptoBotDeepLink(url)
  const target = cb && !isTelegramPaymentLink(url) ? cb : url

  if (reservedWindow && !reservedWindow.closed) {
    try { reservedWindow.location.href = target; reservedWindow.focus?.() } catch (e) { console.warn('[TopUpModal] Failed to use reserved window:', e) }
    return
  }

  const w2 = window.open(target, '_blank', 'noopener,noreferrer')
  if (w2) { w2.opener = null; return }
  window.location.href = target
}

interface TopUpModalProps { method: PaymentMethod; onClose: () => void }

export default function TopUpModal({ method, onClose }: TopUpModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol, convertAmount, convertToRub, targetCurrency } = useCurrency()
  const [amount, setAmount] = useState('')
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
    e.preventDefault(); setError(null)

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-dark-100">{t('balance.topUp')} - {methodName}</h2>
          <button onClick={onClose} className="btn-icon">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {hasOptions && method.options && (
            <div>
              <label className="label">{t('balance.paymentOption', 'Способ оплаты')}</label>
              <div className="flex flex-wrap gap-2">
                {method.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedOption(option.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex flex-col items-start ${
                      selectedOption === option.id
                        ? 'bg-accent-500 text-white ring-2 ring-accent-400 ring-offset-2 ring-offset-dark-900'
                        : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    <span>{option.name}</span>
                    {option.description && (
                      <span className={`text-xs mt-0.5 ${selectedOption === option.id ? 'text-white/70' : 'text-dark-500'}`}>
                        {option.description}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">{t('balance.amount')} ({currencySymbol})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${formatAmount(minRubles, currencyDecimals)} - ${formatAmount(maxRubles, currencyDecimals)}`}
              min={minInputValue}
              max={maxInputValue}
              step={inputStep}
              className="input"
            />
            <div className="text-xs text-dark-500 mt-2">
              {t('balance.minAmount')}: {formatAmount(minRubles, currencyDecimals)} {currencySymbol} | {t('balance.maxAmount')}: {formatAmount(maxRubles, currencyDecimals)} {currencySymbol}
            </div>
          </div>

          {quickAmounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((a) => {
                const quickValue = getQuickAmountValue(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(quickValue)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      amount === quickValue ? 'bg-accent-500 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                    }`}
                  >
                    {formatAmount(a, currencyDecimals)} {currencySymbol}
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-3 rounded-xl text-sm">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={topUpMutation.isPending || starsPaymentMutation.isPending || !amount} className="btn-primary flex-1">
              {topUpMutation.isPending || starsPaymentMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('common.loading')}
                </span>
              ) : (
                t('balance.topUp')
              )}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

