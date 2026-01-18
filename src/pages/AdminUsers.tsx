import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '../hooks/useCurrency'
import {
  adminUsersApi,
  type UserListItem,
  type UserDetailResponse,
  type UsersStatsResponse,
  type UserAvailableTariff,
  type PanelSyncStatusResponse,
} from '../api/adminUsers'

// ============ Icons ============

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

const XMarkIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const RefreshIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const MinusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
  </svg>
)

const SyncIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
)

const TelegramIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
)

// ============ Components ============

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

function StatCard({ title, value, subtitle, color }: StatCardProps) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
      {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    blocked: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    deleted: 'bg-dark-600 text-dark-400 border-dark-500',
    trial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    expired: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    disabled: 'bg-dark-600 text-dark-400 border-dark-500',
  }

  return (
    <span className={`px-2 py-0.5 text-xs rounded-full border ${styles[status] || styles.active}`}>
      {status}
    </span>
  )
}

// ============ User List Component ============

interface UserRowProps {
  user: UserListItem
  onSelect: (user: UserListItem) => void
  formatAmount: (rubAmount: number) => string
}

function UserRow({ user, onSelect, formatAmount }: UserRowProps) {
  return (
    <div
      onClick={() => onSelect(user)}
      className="flex items-center gap-4 p-4 bg-dark-800/50 rounded-xl border border-dark-700 hover:border-dark-600 hover:bg-dark-800 cursor-pointer transition-all"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium shrink-0">
        {user.first_name?.[0] || user.username?.[0] || '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-dark-100 truncate">{user.full_name}</span>
          {user.username && (
            <span className="text-xs text-dark-500">@{user.username}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-dark-400">
          <span className="flex items-center gap-1">
            <TelegramIcon />
            {user.telegram_id}
          </span>
          {user.status !== 'active' && (
            <StatusBadge status={user.status} />
          )}
          {user.has_subscription && user.subscription_status && (
            <span className={`px-2 py-0.5 text-xs rounded-full border ${
              user.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
              user.subscription_status === 'trial' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
              'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              {user.subscription_status === 'active' ? 'Подписка' :
               user.subscription_status === 'trial' ? 'Триал' : 'Истекла'}
            </span>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="text-right shrink-0">
        <div className="font-medium text-dark-100">{formatAmount(user.balance_rubles)}</div>
        <div className="text-xs text-dark-500">
          {user.purchase_count > 0 ? `${user.purchase_count} покупок` : 'Нет покупок'}
        </div>
      </div>

      <ChevronRightIcon />
    </div>
  )
}

// ============ User Detail Modal ============

interface UserDetailModalProps {
  userId: number
  onClose: () => void
  onUpdate: () => void
}

function UserDetailModal({ userId, onClose, onUpdate }: UserDetailModalProps) {
  const { formatWithCurrency } = useCurrency()
  const [user, setUser] = useState<UserDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'subscription' | 'balance' | 'sync'>('info')
  const [syncStatus, setSyncStatus] = useState<PanelSyncStatusResponse | null>(null)
  const [tariffs, setTariffs] = useState<UserAvailableTariff[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  // Balance form
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceDescription, setBalanceDescription] = useState('')

  // Subscription form
  const [subAction, setSubAction] = useState<string>('extend')
  const [subDays, setSubDays] = useState('30')
  const [selectedTariffId, setSelectedTariffId] = useState<number | null>(null)

  const loadUser = useCallback(async () => {
    try {
      setLoading(true)
      const data = await adminUsersApi.getUser(userId)
      setUser(data)
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await adminUsersApi.getSyncStatus(userId)
      setSyncStatus(data)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }, [userId])

  const loadTariffs = useCallback(async () => {
    try {
      const data = await adminUsersApi.getAvailableTariffs(userId, true)
      setTariffs(data.tariffs)
    } catch (error) {
      console.error('Failed to load tariffs:', error)
    }
  }, [userId])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (activeTab === 'sync') loadSyncStatus()
    if (activeTab === 'subscription') loadTariffs()
  }, [activeTab, loadSyncStatus, loadTariffs])

  const handleUpdateBalance = async (isAdd: boolean) => {
    if (!balanceAmount) return
    setActionLoading(true)
    try {
      const amount = Math.abs(parseFloat(balanceAmount) * 100)
      await adminUsersApi.updateBalance(userId, {
        amount_kopeks: isAdd ? amount : -amount,
        description: balanceDescription || (isAdd ? 'Начисление админом' : 'Списание админом'),
      })
      await loadUser()
      setBalanceAmount('')
      setBalanceDescription('')
      onUpdate()
    } catch (error) {
      console.error('Failed to update balance:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateSubscription = async () => {
    setActionLoading(true)
    try {
      const data: Record<string, unknown> = { action: subAction }
      if (subAction === 'extend') data.days = parseInt(subDays)
      if (subAction === 'change_tariff' && selectedTariffId) data.tariff_id = selectedTariffId
      if (subAction === 'create') {
        data.days = parseInt(subDays)
        if (selectedTariffId) data.tariff_id = selectedTariffId
      }
      await adminUsersApi.updateSubscription(userId, data as any)
      await loadUser()
      onUpdate()
    } catch (error) {
      console.error('Failed to update subscription:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBlockUser = async () => {
    if (!confirm('Заблокировать пользователя?')) return
    setActionLoading(true)
    try {
      await adminUsersApi.blockUser(userId)
      await loadUser()
      onUpdate()
    } catch (error) {
      console.error('Failed to block user:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnblockUser = async () => {
    setActionLoading(true)
    try {
      await adminUsersApi.unblockUser(userId)
      await loadUser()
      onUpdate()
    } catch (error) {
      console.error('Failed to unblock user:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncFromPanel = async () => {
    setActionLoading(true)
    try {
      await adminUsersApi.syncFromPanel(userId, { update_subscription: true, update_traffic: true })
      await loadUser()
      await loadSyncStatus()
      onUpdate()
    } catch (error) {
      console.error('Failed to sync from panel:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleSyncToPanel = async () => {
    setActionLoading(true)
    try {
      await adminUsersApi.syncToPanel(userId, { create_if_missing: true })
      await loadUser()
      await loadSyncStatus()
      onUpdate()
    } catch (error) {
      console.error('Failed to sync to panel:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-dark-800 rounded-2xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              {user.first_name?.[0] || user.username?.[0] || '?'}
            </div>
            <div>
              <div className="font-semibold text-dark-100">{user.full_name}</div>
              <div className="text-sm text-dark-400 flex items-center gap-2">
                <TelegramIcon />
                {user.telegram_id}
                {user.username && <span>@{user.username}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
            <XMarkIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['info', 'subscription', 'balance', 'sync'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'info' && 'Информация'}
              {tab === 'subscription' && 'Подписка'}
              {tab === 'balance' && 'Баланс'}
              {tab === 'sync' && 'Синхронизация'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl">
                <span className="text-dark-400">Статус</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={user.status} />
                  {user.status === 'active' ? (
                    <button
                      onClick={handleBlockUser}
                      disabled={actionLoading}
                      className="px-3 py-1 text-xs bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-colors"
                    >
                      Заблокировать
                    </button>
                  ) : user.status === 'blocked' ? (
                    <button
                      onClick={handleUnblockUser}
                      disabled={actionLoading}
                      className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                    >
                      Разблокировать
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Email</div>
                  <div className="text-dark-100">{user.email || '-'}</div>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Язык</div>
                  <div className="text-dark-100">{user.language}</div>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Регистрация</div>
                  <div className="text-dark-100">{formatDate(user.created_at)}</div>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Последняя активность</div>
                  <div className="text-dark-100">{formatDate(user.last_activity)}</div>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Всего потрачено</div>
                  <div className="text-dark-100">{formatWithCurrency(user.total_spent_kopeks / 100)}</div>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">Покупок</div>
                  <div className="text-dark-100">{user.purchase_count}</div>
                </div>
              </div>

              {/* Referral */}
              <div className="p-3 bg-dark-900/50 rounded-xl">
                <div className="text-sm font-medium text-dark-200 mb-2">Реферальная программа</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-dark-100">{user.referral.referrals_count}</div>
                    <div className="text-xs text-dark-500">Рефералов</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-dark-100">{formatWithCurrency(user.referral.total_earnings_kopeks / 100)}</div>
                    <div className="text-xs text-dark-500">Заработано</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-dark-100">{user.referral.commission_percent || 0}%</div>
                    <div className="text-xs text-dark-500">Комиссия</div>
                  </div>
                </div>
              </div>

              {/* Restrictions */}
              {(user.restriction_topup || user.restriction_subscription) && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                  <div className="text-sm font-medium text-rose-400 mb-2">Ограничения</div>
                  {user.restriction_topup && <div className="text-xs text-rose-300">• Запрет пополнения</div>}
                  {user.restriction_subscription && <div className="text-xs text-rose-300">• Запрет покупки подписки</div>}
                  {user.restriction_reason && <div className="text-xs text-dark-400 mt-1">Причина: {user.restriction_reason}</div>}
                </div>
              )}
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {user.subscription ? (
                <>
                  {/* Current subscription */}
                  <div className="p-4 bg-dark-900/50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-dark-200">Текущая подписка</span>
                      <StatusBadge status={user.subscription.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-dark-500">Тариф</div>
                        <div className="text-dark-100">{user.subscription.tariff_name || 'Не указан'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-500">Действует до</div>
                        <div className="text-dark-100">{formatDate(user.subscription.end_date)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-500">Трафик</div>
                        <div className="text-dark-100">
                          {user.subscription.traffic_used_gb.toFixed(1)} / {user.subscription.traffic_limit_gb} ГБ
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-dark-500">Устройств</div>
                        <div className="text-dark-100">{user.subscription.device_limit}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 bg-dark-900/50 rounded-xl">
                    <div className="font-medium text-dark-200 mb-3">Действия</div>
                    <div className="space-y-3">
                      <select
                        value={subAction}
                        onChange={(e) => setSubAction(e.target.value)}
                        className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                      >
                        <option value="extend">Продлить</option>
                        <option value="change_tariff">Сменить тариф</option>
                        <option value="cancel">Отменить</option>
                        <option value="activate">Активировать</option>
                      </select>

                      {subAction === 'extend' && (
                        <input
                          type="number"
                          value={subDays}
                          onChange={(e) => setSubDays(e.target.value)}
                          placeholder="Дней"
                          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                        />
                      )}

                      {subAction === 'change_tariff' && (
                        <select
                          value={selectedTariffId || ''}
                          onChange={(e) => setSelectedTariffId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                        >
                          <option value="">Выберите тариф</option>
                          {tariffs.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {!t.is_available && '(недоступен)'}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={handleUpdateSubscription}
                        disabled={actionLoading}
                        className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading ? 'Применение...' : 'Применить'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-dark-900/50 rounded-xl">
                  <div className="text-center text-dark-400 mb-4">Нет активной подписки</div>
                  <div className="space-y-3">
                    <select
                      value={selectedTariffId || ''}
                      onChange={(e) => setSelectedTariffId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                    >
                      <option value="">Выберите тариф</option>
                      {tariffs.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={subDays}
                      onChange={(e) => setSubDays(e.target.value)}
                      placeholder="Дней"
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                    />
                    <button
                      onClick={() => {
                        setSubAction('create')
                        handleUpdateSubscription()
                      }}
                      disabled={actionLoading}
                      className="w-full py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? 'Создание...' : 'Создать подписку'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Balance Tab */}
          {activeTab === 'balance' && (
            <div className="space-y-4">
              {/* Current balance */}
              <div className="p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                <div className="text-sm text-dark-400 mb-1">Текущий баланс</div>
                <div className="text-3xl font-bold text-dark-100">{formatWithCurrency(user.balance_rubles)}</div>
              </div>

              {/* Add/subtract form */}
              <div className="p-4 bg-dark-900/50 rounded-xl space-y-3">
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Сумма в рублях"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                />
                <input
                  type="text"
                  value={balanceDescription}
                  onChange={(e) => setBalanceDescription(e.target.value)}
                  placeholder="Описание (опционально)"
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-dark-100"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateBalance(true)}
                    disabled={actionLoading || !balanceAmount}
                    className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusIcon /> Начислить
                  </button>
                  <button
                    onClick={() => handleUpdateBalance(false)}
                    disabled={actionLoading || !balanceAmount}
                    className="flex-1 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <MinusIcon /> Списать
                  </button>
                </div>
              </div>

              {/* Recent transactions */}
              {user.recent_transactions.length > 0 && (
                <div className="p-4 bg-dark-900/50 rounded-xl">
                  <div className="font-medium text-dark-200 mb-3">Последние транзакции</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {user.recent_transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                        <div>
                          <div className="text-sm text-dark-200">{tx.description || tx.type}</div>
                          <div className="text-xs text-dark-500">{formatDate(tx.created_at)}</div>
                        </div>
                        <div className={tx.amount_kopeks >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {tx.amount_kopeks >= 0 ? '+' : ''}{formatWithCurrency(tx.amount_rubles)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              {/* Sync status */}
              {syncStatus && (
                <div className={`p-4 rounded-xl border ${syncStatus.has_differences ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {syncStatus.has_differences ? (
                      <span className="text-amber-400 font-medium">Есть расхождения</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">Синхронизировано</span>
                    )}
                  </div>

                  {syncStatus.differences.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {syncStatus.differences.map((diff, i) => (
                        <div key={i} className="text-xs text-dark-300">• {diff}</div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-dark-500 text-xs mb-2">Бот</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-dark-400">Статус:</span>
                          <span className="text-dark-200">{syncStatus.bot_subscription_status || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">До:</span>
                          <span className="text-dark-200">
                            {syncStatus.bot_subscription_end_date
                              ? new Date(syncStatus.bot_subscription_end_date).toLocaleDateString('ru-RU')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Трафик:</span>
                          <span className="text-dark-200">{syncStatus.bot_traffic_used_gb.toFixed(2)} ГБ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Устройства:</span>
                          <span className="text-dark-200">{syncStatus.bot_device_limit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Сквады:</span>
                          <span className="text-dark-200">{syncStatus.bot_squads?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-dark-500 text-xs mb-2">Панель</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-dark-400">Статус:</span>
                          <span className="text-dark-200">{syncStatus.panel_status || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">До:</span>
                          <span className="text-dark-200">
                            {syncStatus.panel_expire_at
                              ? new Date(syncStatus.panel_expire_at).toLocaleDateString('ru-RU')
                              : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Трафик:</span>
                          <span className="text-dark-200">{syncStatus.panel_traffic_used_gb.toFixed(2)} ГБ</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Устройства:</span>
                          <span className="text-dark-200">{syncStatus.panel_device_limit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">Сквады:</span>
                          <span className="text-dark-200">{syncStatus.panel_squads?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* UUID info */}
              <div className="p-4 bg-dark-900/50 rounded-xl">
                <div className="text-sm text-dark-400 mb-1">Remnawave UUID</div>
                <div className="text-dark-100 font-mono text-sm break-all">
                  {syncStatus?.remnawave_uuid || user.remnawave_uuid || 'Не привязан'}
                </div>
              </div>

              {/* Sync buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSyncFromPanel}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <SyncIcon className={actionLoading ? 'animate-spin' : ''} />
                  Из панели в бота
                </button>
                <button
                  onClick={handleSyncToPanel}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  <SyncIcon className={actionLoading ? 'animate-spin' : ''} />
                  Из бота в панель
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Main Page ============

export default function AdminUsers() {
  const { formatWithCurrency } = useCurrency()

  const [users, setUsers] = useState<UserListItem[]>([])
  const [stats, setStats] = useState<UsersStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [offset, setOffset] = useState(0)
  const [total, setTotal] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)

  const limit = 20

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, unknown> = { offset, limit, sort_by: sortBy }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter

      const data = await adminUsersApi.getUsers(params as any)
      setUsers(data.users)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }, [offset, search, statusFilter, sortBy])

  const loadStats = useCallback(async () => {
    try {
      const data = await adminUsersApi.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setOffset(0)
    loadUsers()
  }

  const totalPages = Math.ceil(total / limit)
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <ChevronLeftIcon />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-dark-100">Пользователи</h1>
            <p className="text-sm text-dark-400">Управление пользователями бота</p>
          </div>
        </div>
        <button
          onClick={() => { loadUsers(); loadStats() }}
          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <StatCard title="Всего" value={stats.total_users} color="blue" />
          <StatCard title="Активных" value={stats.active_users} color="green" />
          <StatCard title="С подпиской" value={stats.users_with_active_subscription} color="purple" />
          <StatCard title="Новых сегодня" value={stats.new_today} color="yellow" />
          <StatCard title="Заблокировано" value={stats.blocked_users} color="red" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ID, имени, username..."
              className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder-dark-500 focus:border-dark-600 focus:outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
              <SearchIcon />
            </div>
          </div>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0) }}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-dark-100"
        >
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="blocked">Заблокированные</option>
          <option value="deleted">Удалённые</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setOffset(0) }}
          className="bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 text-dark-100"
        >
          <option value="created_at">По дате</option>
          <option value="balance">По балансу</option>
          <option value="last_activity">По активности</option>
          <option value="total_spent">По расходам</option>
        </select>
      </div>

      {/* Users list */}
      <div className="space-y-2 mb-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            Пользователи не найдены
          </div>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              onSelect={(u) => setSelectedUserId(u.id)}
              formatAmount={(amount) => formatWithCurrency(amount)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-dark-400">
            Показано {offset + 1}-{Math.min(offset + limit, total)} из {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-2 bg-dark-800 border border-dark-700 rounded-lg disabled:opacity-50 hover:bg-dark-700 transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <span className="px-3 py-2 text-dark-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-2 bg-dark-800 border border-dark-700 rounded-lg disabled:opacity-50 hover:bg-dark-700 transition-colors"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}

      {/* User detail modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUpdate={() => { loadUsers(); loadStats() }}
        />
      )}
    </div>
  )
}
