import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/auth'
import { balanceApi } from '../api/balance'
import TopUpModal from '../components/TopUpModal'
import { useCurrency } from '../hooks/useCurrency'
import type { PaymentMethod, PaginatedResponse, Transaction } from '../types'

export default function Balance() {
  const { t } = useTranslation()
  const { refreshUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { formatAmount, currencySymbol } = useCurrency()

  // Fetch balance directly from API with no caching
  const { data: balanceData, refetch: refetchBalance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: 0, // Always refetch
    refetchOnMount: 'always',
  })

  // Refresh user data on mount to sync balance in store
  useEffect(() => {
    refreshUser()
  }, [])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [promocode, setPromocode] = useState('')
  const [promocodeLoading, setPromocodeLoading] = useState(false)
  const [promocodeError, setPromocodeError] = useState<string | null>(null)
  const [promocodeSuccess, setPromocodeSuccess] =
    useState<{ message: string; amount: number } | null>(null)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const { data: transactions, isLoading } = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ['transactions', transactionsPage],
    queryFn: () => balanceApi.getTransactions({ per_page: 20, page: transactionsPage }),
    placeholderData: (previousData) => previousData,
  })

  const { data: paymentMethods } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
  })

  const normalizeType = (type: string) => type?.toUpperCase?.() ?? type

  const getTypeBadge = (type: string) => {
    switch (normalizeType(type)) {
      case 'DEPOSIT':
        return 'badge-success'
      case 'SUBSCRIPTION_PAYMENT':
        return 'badge-info'
      case 'REFERRAL_REWARD':
        return 'badge-warning'
      case 'WITHDRAWAL':
        return 'badge-error'
      default:
        return 'badge-neutral'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (normalizeType(type)) {
      case 'DEPOSIT':
        return t('balance.deposit')
      case 'SUBSCRIPTION_PAYMENT':
        return t('balance.subscriptionPayment')
      case 'REFERRAL_REWARD':
        return t('balance.referralReward')
      case 'WITHDRAWAL':
        return t('balance.withdrawal')
      default:
        return type
    }
  }

  const handlePromocodeActivate = async () => {
    if (!promocode.trim()) return

    setPromocodeLoading(true)
    setPromocodeError(null)
    setPromocodeSuccess(null)

    try {
      const result = await balanceApi.activatePromocode(promocode.trim())
      if (result.success) {
        const bonusAmount = result.balance_after - result.balance_before
        setPromocodeSuccess({
          message: result.bonus_description || t('balance.promocode.success'),
          amount: bonusAmount,
        })
        setTransactionsPage(1)
        setPromocode('')
        // Refresh balance and transactions
        await refetchBalance()
        await refreshUser()
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      }
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } }
      const errorDetail = axiosError.response?.data?.detail || 'server_error'
      // Map backend error messages to translation keys
      const errorKey = errorDetail.toLowerCase().includes('not found')
        ? 'not_found'
        : errorDetail.toLowerCase().includes('expired')
        ? 'expired'
        : errorDetail.toLowerCase().includes('fully used')
        ? 'used'
        : errorDetail.toLowerCase().includes('already used')
        ? 'already_used_by_user'
        : 'server_error'
      setPromocodeError(t(`balance.promocode.errors.${errorKey}`))
    } finally {
      setPromocodeLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('balance.title')}</h1>

      {/* Balance Card */}
      <div className="bento-card bento-card-glow bg-gradient-to-br from-accent-500/10 to-transparent">
        <div className="text-sm text-dark-400 mb-2">{t('balance.currentBalance')}</div>
        <div className="text-4xl sm:text-5xl font-bold text-dark-50">
          {formatAmount(balanceData?.balance_rubles || 0)}
          <span className="text-2xl text-dark-400 ml-2">{currencySymbol}</span>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="bento-card">
        <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('balance.promocode.title')}</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={promocode}
            onChange={(e) => setPromocode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePromocodeActivate()}
            placeholder={t('balance.promocode.placeholder')}
            className="input flex-1"
            disabled={promocodeLoading}
          />
          <button
            onClick={handlePromocodeActivate}
            disabled={!promocode.trim() || promocodeLoading}
            className="btn-primary px-6 whitespace-nowrap"
          >
            {promocodeLoading ? t('balance.promocode.activating') : t('balance.promocode.activate')}
          </button>
        </div>
        {promocodeError && (
          <div className="mt-3 p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm">
            {promocodeError}
          </div>
        )}
        {promocodeSuccess && (
          <div className="mt-3 p-3 rounded-lg bg-success-500/10 border border-success-500/30 text-success-400 text-sm">
            <div className="font-medium">{promocodeSuccess.message}</div>
            {promocodeSuccess.amount > 0 && (
              <div className="mt-1">{t('balance.promocode.balanceAdded', { amount: promocodeSuccess.amount.toFixed(2) })}</div>
            )}
          </div>
        )}
      </div>

      {/* Payment Methods */}
      {paymentMethods && paymentMethods.length > 0 && (
        <div className="bento-card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('balance.topUpBalance')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentMethods.map((method) => {
              const methodKey = method.id.toLowerCase().replace(/-/g, '_')
              const translatedName = t(`balance.paymentMethods.${methodKey}.name`, { defaultValue: '' })
              const translatedDesc = t(`balance.paymentMethods.${methodKey}.description`, { defaultValue: '' })

              return (
              <button
                key={method.id}
                disabled={!method.is_available}
                onClick={() => method.is_available && setSelectedMethod(method)}
                className={`bento-card-hover p-4 text-left transition-all ${
                  method.is_available
                    ? 'cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="font-semibold text-dark-100">{translatedName || method.name}</div>
                {(translatedDesc || method.description) && (
                  <div className="text-sm text-dark-500 mt-1">{translatedDesc || method.description}</div>
                )}
                <div className="text-xs text-dark-600 mt-3">
                  {formatAmount(method.min_amount_kopeks / 100, 0)} – {formatAmount(method.max_amount_kopeks / 100, 0)} {currencySymbol}
                </div>
              </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="bento-card overflow-hidden">
        <button
          onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-lg font-semibold text-dark-100">{t('balance.transactionHistory')}</h2>
          <svg
            className={`w-5 h-5 text-dark-400 transition-transform duration-200 ${isHistoryOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {isHistoryOpen && (
          <div className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : transactions?.items && transactions.items.length > 0 ? (
              <div className="space-y-3">
                {transactions.items.map((tx) => {
                  const isPositive = tx.amount_rubles >= 0
                  const displayAmount = Math.abs(tx.amount_rubles)
                  const sign = isPositive ? '+' : '-'
                  const colorClass = isPositive ? 'text-success-400' : 'text-error-400'

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-dark-800/30 border border-dark-700/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={getTypeBadge(tx.type)}>
                            {getTypeLabel(tx.type)}
                          </span>
                          <span className="text-xs text-dark-500">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {tx.description && (
                          <div className="text-sm text-dark-400">{tx.description}</div>
                        )}
                      </div>
                      <div className={`text-lg font-semibold ${colorClass}`}>
                        {sign}{formatAmount(displayAmount)} {currencySymbol}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <div className="text-dark-400">{t('balance.noTransactions')}</div>
              </div>
            )}

            {transactions && transactions.pages > 1 && (
              <div className="mt-4 flex items-center gap-3 flex-wrap text-sm text-dark-500">
                <button
                  type="button"
                  onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
                  disabled={transactions.page <= 1}
                  className={`btn-secondary text-xs sm:text-sm flex-1 sm:flex-none min-w-[120px] ${
                    transactions.page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {t('common.back')}
                </button>
                <div className="flex-1 text-center">
                  {t('balance.page', { current: transactions.page, total: transactions.pages })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setTransactionsPage((prev) =>
                      transactions.pages ? Math.min(transactions.pages, prev + 1) : prev + 1
                    )
                  }
                  disabled={transactions.page >= transactions.pages}
                  className={`btn-secondary text-xs sm:text-sm flex-1 sm:flex-none min-w-[120px] ${
                    transactions.page >= transactions.pages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TopUp Modal */}
      {selectedMethod && (
        <TopUpModal
          method={selectedMethod}
          onClose={() => setSelectedMethod(null)}
        />
      )}
    </div>
  )
}
