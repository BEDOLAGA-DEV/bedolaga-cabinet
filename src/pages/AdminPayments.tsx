import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { adminPaymentsApi } from '../api/adminPayments'
import { useCurrency } from '../hooks/useCurrency'
import type { PendingPayment, PaginatedResponse } from '../types'

export default function AdminPayments() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { formatAmount, currencySymbol } = useCurrency()

  const [page, setPage] = useState(1)
  const [methodFilter, setMethodFilter] = useState<string>('')
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(null)

  // Fetch payments
  const { data: payments, isLoading, refetch } = useQuery<PaginatedResponse<PendingPayment>>({
    queryKey: ['admin-payments', page, methodFilter],
    queryFn: () => adminPaymentsApi.getPendingPayments({
      page,
      per_page: 20,
      method_filter: methodFilter || undefined,
    }),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['admin-payments-stats'],
    queryFn: adminPaymentsApi.getStats,
    refetchInterval: 30000,
  })

  // Check payment mutation
  const checkPaymentMutation = useMutation({
    mutationFn: ({ method, paymentId }: { method: string; paymentId: number }) =>
      adminPaymentsApi.checkPaymentStatus(method, paymentId),
    onSuccess: async (result) => {
      if (result.status_changed) {
        await refetch()
        queryClient.invalidateQueries({ queryKey: ['admin-payments-stats'] })
      } else {
        await refetch()
      }
    },
    onSettled: () => {
      setCheckingPaymentId(null)
    },
  })

  const handleCheckPayment = (payment: PendingPayment) => {
    setCheckingPaymentId(`${payment.method}_${payment.id}`)
    checkPaymentMutation.mutate({ method: payment.method, paymentId: payment.id })
  }

  // Get unique methods from stats for filter
  const methodOptions = stats?.by_method ? Object.keys(stats.by_method) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-50">{t('admin.payments.title', 'Проверка платежей')}</h1>
            <p className="text-sm text-dark-400">{t('admin.payments.description', 'Ожидающие платежи за последние 24 часа')}</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {t('common.refresh', 'Обновить')}
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-dark-800/50 border border-dark-700/50">
            <div className="text-2xl font-bold text-dark-50">{stats.total_pending}</div>
            <div className="text-sm text-dark-400">{t('admin.payments.totalPending', 'Всего ожидает')}</div>
          </div>
          {Object.entries(stats.by_method).map(([method, count]) => (
            <div
              key={method}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                methodFilter === method
                  ? 'bg-accent-500/20 border-accent-500/50'
                  : 'bg-dark-800/50 border-dark-700/50 hover:border-dark-600'
              }`}
              onClick={() => setMethodFilter(methodFilter === method ? '' : method)}
            >
              <div className="text-2xl font-bold text-dark-50">{count}</div>
              <div className="text-sm text-dark-400">{method}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      {methodOptions.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-dark-400">{t('admin.payments.filterByMethod', 'Фильтр по методу')}:</span>
          <button
            onClick={() => setMethodFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              methodFilter === ''
                ? 'bg-accent-500 text-white'
                : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
            }`}
          >
            {t('common.all', 'Все')}
          </button>
          {methodOptions.map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                methodFilter === method
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      )}

      {/* Payments list */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments?.items && payments.items.length > 0 ? (
          <div className="space-y-3">
            {payments.items.map((payment) => {
              const paymentKey = `${payment.method}_${payment.id}`
              const isChecking = checkingPaymentId === paymentKey

              return (
                <div
                  key={paymentKey}
                  className="p-4 rounded-xl bg-dark-800/30 border border-dark-700/30"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-dark-100">{payment.method_display}</span>
                        <span className="text-sm px-2 py-0.5 rounded-full bg-dark-700/50 text-dark-300">
                          {payment.status_emoji} {payment.status_text}
                        </span>
                        {payment.is_paid && (
                          <span className="text-sm px-2 py-0.5 rounded-full bg-success-500/20 text-success-400">
                            {t('admin.payments.paid', 'Оплачено')}
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-dark-50">
                        {formatAmount(payment.amount_rubles)} {currencySymbol}
                      </div>
                      <div className="text-sm text-dark-400 mt-1">
                        ID: <code className="text-dark-300">{payment.identifier}</code>
                      </div>
                      <div className="text-xs text-dark-500 mt-1">
                        {new Date(payment.created_at).toLocaleString()}
                      </div>
                      {/* User info */}
                      {(payment.user_username || payment.user_telegram_id) && (
                        <div className="text-sm text-dark-400 mt-2">
                          <span className="text-dark-500">{t('admin.payments.user', 'Пользователь')}:</span>{' '}
                          {payment.user_username ? (
                            <span className="text-dark-200">@{payment.user_username}</span>
                          ) : (
                            <span className="text-dark-300">ID: {payment.user_telegram_id}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {payment.payment_url && (
                        <a
                          href={payment.payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          {t('admin.payments.openLink', 'Открыть ссылку')}
                        </a>
                      )}
                      {payment.is_checkable && (
                        <button
                          onClick={() => handleCheckPayment(payment)}
                          disabled={isChecking}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {isChecking ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              {t('admin.payments.checking', 'Проверка...')}
                            </span>
                          ) : (
                            t('admin.payments.checkStatus', 'Проверить статус')
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Show result after check */}
                  {checkPaymentMutation.isSuccess && checkPaymentMutation.variables?.paymentId === payment.id && (
                    <div className={`mt-3 p-2 rounded-lg text-sm ${
                      checkPaymentMutation.data?.status_changed
                        ? 'bg-success-500/10 border border-success-500/30 text-success-400'
                        : 'bg-dark-700/30 text-dark-400'
                    }`}>
                      {checkPaymentMutation.data?.message}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-dark-400">{t('admin.payments.noPayments', 'Нет ожидающих платежей')}</div>
          </div>
        )}

        {/* Pagination */}
        {payments && payments.pages > 1 && (
          <div className="mt-4 flex items-center gap-3 flex-wrap text-sm text-dark-500">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={payments.page <= 1}
              className={`btn-secondary text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px] ${
                payments.page <= 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {t('common.back', 'Назад')}
            </button>
            <div className="flex-1 text-center">
              {t('balance.page', '{current} / {total}', { current: payments.page, total: payments.pages })}
            </div>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(payments.pages, prev + 1))}
              disabled={payments.page >= payments.pages}
              className={`btn-secondary text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px] ${
                payments.page >= payments.pages ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {t('common.next', 'Далее')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
