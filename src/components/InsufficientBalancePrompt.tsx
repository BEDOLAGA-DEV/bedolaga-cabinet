import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { balanceApi } from '../api/balance'
import { useCurrency } from '../hooks/useCurrency'
import TopUpModal from './TopUpModal'
import type { PaymentMethod } from '../types'

interface InsufficientBalancePromptProps {
  /** Amount missing in kopeks */
  missingAmountKopeks: number
  /** Optional custom message */
  message?: string
  /** Compact mode for inline use */
  compact?: boolean
  /** Additional className */
  className?: string
}

export default function InsufficientBalancePrompt({
  missingAmountKopeks,
  message,
  compact = false,
  className = '',
}: InsufficientBalancePromptProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useCurrency()
  const [showMethodSelect, setShowMethodSelect] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
    enabled: showMethodSelect,
  })

  const missingRubles = missingAmountKopeks / 100
  const displayAmount = formatAmount(missingRubles)

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method)
    setShowMethodSelect(false)
  }

  if (compact) {
    return (
      <>
        <div className={`flex items-center justify-between gap-3 p-3 bg-error-500/10 border border-error-500/30 rounded-xl ${className}`}>
          <div className="flex items-center gap-2 text-sm text-error-400">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>
              {message || t('balance.insufficientFunds')}: <span className="font-semibold">{displayAmount} {currencySymbol}</span>
            </span>
          </div>
          <button
            onClick={() => setShowMethodSelect(true)}
            className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap"
          >
            {t('balance.topUp')}
          </button>
        </div>

        {showMethodSelect && (
          <PaymentMethodModal
            paymentMethods={paymentMethods}
            onSelect={handleMethodSelect}
            onClose={() => setShowMethodSelect(false)}
          />
        )}

        {selectedMethod && (
          <TopUpModal
            method={selectedMethod}
            initialAmountRubles={Math.ceil(missingRubles)}
            onClose={() => setSelectedMethod(null)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <div className={`p-4 bg-gradient-to-br from-error-500/10 to-warning-500/5 border border-error-500/30 rounded-xl ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-error-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-error-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-error-400 font-medium mb-1">
              {t('balance.insufficientFunds')}
            </div>
            <div className="text-dark-300 text-sm">
              {message || t('balance.topUpToComplete')}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-lg font-bold text-dark-100">
                {t('balance.missing')}: <span className="text-error-400">{displayAmount} {currencySymbol}</span>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowMethodSelect(true)}
          className="btn-primary w-full mt-4 py-2.5 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {t('balance.topUpBalance')}
        </button>
      </div>

      {showMethodSelect && (
        <PaymentMethodModal
          paymentMethods={paymentMethods}
          onSelect={handleMethodSelect}
          onClose={() => setShowMethodSelect(false)}
        />
      )}

      {selectedMethod && (
        <TopUpModal
          method={selectedMethod}
          initialAmountRubles={Math.ceil(missingRubles)}
          onClose={() => setSelectedMethod(null)}
        />
      )}
    </>
  )
}

interface PaymentMethodModalProps {
  paymentMethods: PaymentMethod[] | undefined
  onSelect: (method: PaymentMethod) => void
  onClose: () => void
}

function PaymentMethodModal({ paymentMethods, onSelect, onClose }: PaymentMethodModalProps) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useCurrency()

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-12 sm:pt-0 sm:items-center px-3">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-dark-900 rounded-2xl border border-dark-700/50 shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-800/50">
          <span className="font-semibold text-dark-100">{t('balance.selectPaymentMethod')}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!paymentMethods ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="text-center py-6 text-dark-400 text-sm">
              {t('balance.noPaymentMethods')}
            </div>
          ) : (
            paymentMethods.map((method) => {
              const methodKey = method.id.toLowerCase().replace(/-/g, '_')
              const translatedName = t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' })

              return (
                <button
                  key={method.id}
                  disabled={!method.is_available}
                  onClick={() => method.is_available && onSelect(method)}
                  className={`w-full p-3 rounded-xl text-left flex items-center gap-3 ${
                    method.is_available
                      ? 'bg-dark-800 hover:bg-dark-700 active:bg-dark-600'
                      : 'bg-dark-800/50 opacity-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-accent-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-dark-100 text-sm">{translatedName || method.name}</div>
                    <div className="text-xs text-dark-500">
                      {formatAmount(method.min_amount_kopeks / 100, 0)} – {formatAmount(method.max_amount_kopeks / 100, 0)} {currencySymbol}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
