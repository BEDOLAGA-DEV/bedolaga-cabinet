import { useState, useRef } from 'react'
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

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-12 sm:pt-0 sm:items-center px-3">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-dark-900 rounded-2xl border border-dark-700/50 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-800/50">
          <span className="font-semibold text-dark-100">{methodName}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Payment options */}
          {hasOptions && method.options && (
            <div className="flex gap-2">
              {method.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOption(opt.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    selectedOption === opt.id
                      ? 'bg-accent-500 text-white'
                      : 'bg-dark-800 text-dark-300'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          )}

          {/* Amount input */}
          <div className="relative">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${formatAmount(minRubles, 0)} – ${formatAmount(maxRubles, 0)}`}
              className="w-full h-12 px-4 pr-12 text-lg font-semibold bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:outline-none focus:border-accent-500"
              autoComplete="off"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 font-medium">
              {currencySymbol}
            </span>
          </div>

          {/* Quick amounts */}
          {quickAmounts.length > 0 && (
            <div className="flex gap-2">
              {quickAmounts.map((a) => {
                const val = getQuickValue(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => { setAmount(val); inputRef.current?.blur() }}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                      amount === val ? 'bg-accent-500 text-white' : 'bg-dark-800 text-dark-300'
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
            <div className="text-error-400 text-sm text-center py-1">{error}</div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !amount}
            className="btn-primary w-full h-11 text-base font-semibold"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {t('balance.topUp')}
                {amount && parseFloat(amount) > 0 && (
                  <span className="ml-2 opacity-80">{formatAmount(parseFloat(amount), currencyDecimals)} {currencySymbol}</span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
