import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { adminWheelApi, type WheelPrizeAdmin } from '../api/wheel'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
  </svg>
)

const GiftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const PRIZE_TYPE_KEYS = [
  { value: 'subscription_days', key: 'subscription_days', emoji: '📅' },
  { value: 'balance_bonus', key: 'balance_bonus', emoji: '💰' },
  { value: 'traffic_gb', key: 'traffic_gb', emoji: '📊' },
  { value: 'promocode', key: 'promocode', emoji: '🎟️' },
  { value: 'nothing', key: 'nothing', emoji: '😔' },
]

type Tab = 'settings' | 'prizes' | 'statistics'

export default function AdminWheel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const [editingPrize, setEditingPrize] = useState<WheelPrizeAdmin | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Fetch config
  const { data: config, isLoading } = useQuery({
    queryKey: ['admin-wheel-config'],
    queryFn: adminWheelApi.getConfig,
  })

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['admin-wheel-stats'],
    queryFn: () => adminWheelApi.getStatistics(),
    enabled: activeTab === 'statistics',
  })

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: adminWheelApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] })
    },
  })

  // Prize mutations
  const createPrizeMutation = useMutation({
    mutationFn: adminWheelApi.createPrize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] })
      setIsCreating(false)
    },
  })

  const updatePrizeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WheelPrizeAdmin> }) =>
      adminWheelApi.updatePrize(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] })
      setEditingPrize(null)
    },
  })

  const deletePrizeMutation = useMutation({
    mutationFn: adminWheelApi.deletePrize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-wheel-config'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!config) {
    return <div className="text-center py-12 text-dark-400">{t('wheel.errors.loadFailed')}</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <BackIcon />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">
            {t('admin.wheel.title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm ${
            config.is_enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {config.is_enabled ? t('admin.wheel.enabled') : t('admin.wheel.disabled')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700 pb-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'settings'
              ? 'bg-dark-800 text-accent-400 border-b-2 border-accent-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <CogIcon />
          {t('admin.wheel.tabs.settings')}
        </button>
        <button
          onClick={() => setActiveTab('prizes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'prizes'
              ? 'bg-dark-800 text-accent-400 border-b-2 border-accent-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <GiftIcon />
          {t('admin.wheel.tabs.prizes')} ({config.prizes.length})
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'statistics'
              ? 'bg-dark-800 text-accent-400 border-b-2 border-accent-500'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <ChartIcon />
          {t('admin.wheel.tabs.statistics')}
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="card p-6 space-y-6">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-dark-100">{t('admin.wheel.settings.enableWheel')}</h3>
              <p className="text-sm text-dark-400">{t('admin.wheel.settings.allowSpins')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.is_enabled}
                onChange={(e) => updateConfigMutation.mutate({ is_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-500"></div>
            </label>
          </div>

          <hr className="border-dark-700" />

          {/* Spin costs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.costInStars')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.spin_cost_stars}
                  onChange={(e) => updateConfigMutation.mutate({ spin_cost_stars: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={1000}
                  className="input flex-1"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.spin_cost_stars_enabled}
                    onChange={(e) => updateConfigMutation.mutate({ spin_cost_stars_enabled: e.target.checked })}
                    className="rounded border-dark-600"
                  />
                  <span className="text-sm text-dark-400">{t('admin.wheel.enabled')}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.costInDays')}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.spin_cost_days}
                  onChange={(e) => updateConfigMutation.mutate({ spin_cost_days: parseInt(e.target.value) || 1 })}
                  min={1}
                  max={30}
                  className="input flex-1"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.spin_cost_days_enabled}
                    onChange={(e) => updateConfigMutation.mutate({ spin_cost_days_enabled: e.target.checked })}
                    className="rounded border-dark-600"
                  />
                  <span className="text-sm text-dark-400">{t('admin.wheel.enabled')}</span>
                </label>
              </div>
            </div>
          </div>

          <hr className="border-dark-700" />

          {/* RTP and limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.rtpPercent')}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={config.rtp_percent}
                onChange={(e) => updateConfigMutation.mutate({ rtp_percent: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-dark-400">
                <span>0%</span>
                <span className="font-bold text-accent-400">{config.rtp_percent}%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.dailyLimit')}
              </label>
              <input
                type="number"
                value={config.daily_spin_limit}
                onChange={(e) => updateConfigMutation.mutate({ daily_spin_limit: parseInt(e.target.value) || 0 })}
                min={0}
                max={100}
                className="input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.minSubDays')}
              </label>
              <input
                type="number"
                value={config.min_subscription_days_for_day_payment}
                onChange={(e) => updateConfigMutation.mutate({ min_subscription_days_for_day_payment: parseInt(e.target.value) || 1 })}
                min={1}
                max={30}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.settings.promoPrefix')}
              </label>
              <input
                type="text"
                value={config.promo_prefix}
                onChange={(e) => updateConfigMutation.mutate({ promo_prefix: e.target.value })}
                maxLength={20}
                className="input w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Prizes Tab */}
      {activeTab === 'prizes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon />
              {t('admin.wheel.prizes.addPrize')}
            </button>
          </div>

          {/* Prize list */}
          <div className="space-y-3">
            {config.prizes.map((prize) => (
              <div
                key={prize.id}
                className={`card p-4 ${!prize.is_active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: prize.color + '30' }}
                  >
                    {prize.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-dark-100">{prize.display_name}</div>
                    <div className="text-sm text-dark-400">
                      {t(`admin.wheel.prizes.types.${prize.prize_type}`)} •
                      {t('admin.wheel.prizes.fields.value')}: {prize.prize_value} •
                      {t('admin.wheel.prizes.fields.worth')}: {(prize.prize_value_kopeks / 100).toFixed(2)}₽
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPrize(prize)}
                      className="btn-ghost text-sm"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t('admin.wheel.prizes.deletePrize'))) {
                          deletePrizeMutation.mutate(prize.id)
                        }
                      }}
                      className="btn-ghost text-red-400"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {config.prizes.length === 0 && (
            <div className="text-center py-12 text-dark-400">
              {t('admin.wheel.prizes.noPrizes')}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && stats && (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-accent-400">{stats.total_spins}</div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.totalSpins')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-green-400">
                {(stats.total_revenue_kopeks / 100).toFixed(0)}₽
              </div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.revenue')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">
                {(stats.total_payout_kopeks / 100).toFixed(0)}₽
              </div>
              <div className="text-sm text-dark-400">{t('admin.wheel.statistics.payouts')}</div>
            </div>
            <div className="card p-4 text-center">
              <div className={`text-3xl font-bold ${
                stats.actual_rtp_percent <= stats.configured_rtp_percent ? 'text-green-400' : 'text-red-400'
              }`}>
                {stats.actual_rtp_percent.toFixed(1)}%
              </div>
              <div className="text-sm text-dark-400">
                {t('admin.wheel.statistics.actualRtp')} ({t('admin.wheel.statistics.targetRtp')}: {stats.configured_rtp_percent}%)
              </div>
            </div>
          </div>

          {/* Prize distribution */}
          {stats.prizes_distribution.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-dark-100 mb-3">{t('admin.wheel.statistics.prizeDistribution')}</h3>
              <div className="space-y-2">
                {stats.prizes_distribution.map((prize, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">{prize.display_name}</span>
                    <span className="text-dark-100">{prize.count} {t('admin.wheel.statistics.times')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top wins */}
          {stats.top_wins.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-dark-100 mb-3">{t('admin.wheel.statistics.topWins')}</h3>
              <div className="space-y-2">
                {stats.top_wins.slice(0, 5).map((win, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-dark-300">
                      {win.username || `User #${win.user_id}`}
                    </span>
                    <span className="text-dark-100">
                      {win.prize_display_name} ({(win.prize_value_kopeks / 100).toFixed(0)}₽)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Prize Modal */}
      {(isCreating || editingPrize) && (
        <PrizeModal
          prize={editingPrize}
          onClose={() => {
            setIsCreating(false)
            setEditingPrize(null)
          }}
          onSave={(data) => {
            if (editingPrize) {
              updatePrizeMutation.mutate({ id: editingPrize.id, data })
            } else {
              createPrizeMutation.mutate(data as any)
            }
          }}
        />
      )}
    </div>
  )
}

// Prize Modal Component
function PrizeModal({
  prize,
  onClose,
  onSave,
}: {
  prize: WheelPrizeAdmin | null
  onClose: () => void
  onSave: (data: Partial<WheelPrizeAdmin>) => void
}) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    prize_type: prize?.prize_type || 'balance_bonus',
    prize_value: prize?.prize_value || 0,
    display_name: prize?.display_name || '',
    emoji: prize?.emoji || '🎁',
    color: prize?.color || '#3B82F6',
    prize_value_kopeks: prize?.prize_value_kopeks || 0,
    is_active: prize?.is_active ?? true,
    manual_probability: prize?.manual_probability || null,
    promo_balance_bonus_kopeks: prize?.promo_balance_bonus_kopeks || 0,
    promo_subscription_days: prize?.promo_subscription_days || 0,
    promo_traffic_gb: prize?.promo_traffic_gb || 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-dark-50 mb-4">
          {prize ? t('admin.wheel.prizes.editPrize') : t('admin.wheel.prizes.addPrize')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Prize type */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.wheel.prizes.fields.type')}</label>
            <select
              value={formData.prize_type}
              onChange={(e) => setFormData({ ...formData, prize_type: e.target.value })}
              className="input w-full"
            >
              {PRIZE_TYPE_KEYS.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.emoji} {t(`admin.wheel.prizes.types.${type.key}`)}
                </option>
              ))}
            </select>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.wheel.prizes.fields.displayName')}</label>
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              required
              maxLength={100}
              className="input w-full"
              placeholder="e.g. 7 Days Free"
            />
          </div>

          {/* Prize value */}
          {formData.prize_type !== 'nothing' && (
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                {t('admin.wheel.prizes.fields.value')} ({formData.prize_type === 'balance_bonus' ? 'kopeks' : formData.prize_type === 'subscription_days' ? 'days' : 'GB'})
              </label>
              <input
                type="number"
                value={formData.prize_value}
                onChange={(e) => setFormData({ ...formData, prize_value: parseInt(e.target.value) || 0 })}
                min={0}
                className="input w-full"
              />
            </div>
          )}

          {/* Prize value in kopeks (for RTP calculation) */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              {t('admin.wheel.prizes.fields.valueKopeks')}
            </label>
            <input
              type="number"
              value={formData.prize_value_kopeks}
              onChange={(e) => setFormData({ ...formData, prize_value_kopeks: parseInt(e.target.value) || 0 })}
              min={0}
              className="input w-full"
            />
            <p className="text-xs text-dark-500 mt-1">
              = {(formData.prize_value_kopeks / 100).toFixed(2)} RUB
            </p>
          </div>

          {/* Emoji and color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.wheel.prizes.fields.emoji')}</label>
              <input
                type="text"
                value={formData.emoji}
                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                maxLength={10}
                className="input w-full text-center text-2xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('admin.wheel.prizes.fields.color')}</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="input flex-1"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-dark-600"
            />
            <label htmlFor="is_active" className="text-sm text-dark-300">{t('admin.wheel.prizes.fields.active')}</label>
          </div>

          {/* Promocode settings */}
          {formData.prize_type === 'promocode' && (
            <div className="p-3 bg-dark-800 rounded-lg space-y-3">
              <h4 className="font-medium text-dark-200">{t('admin.wheel.prizes.promo.title')}</h4>
              <div>
                <label className="block text-sm text-dark-400 mb-1">{t('admin.wheel.prizes.promo.balanceBonus')}</label>
                <input
                  type="number"
                  value={formData.promo_balance_bonus_kopeks}
                  onChange={(e) => setFormData({ ...formData, promo_balance_bonus_kopeks: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">{t('admin.wheel.prizes.promo.subscriptionDays')}</label>
                <input
                  type="number"
                  value={formData.promo_subscription_days}
                  onChange={(e) => setFormData({ ...formData, promo_subscription_days: parseInt(e.target.value) || 0 })}
                  min={0}
                  className="input w-full"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary flex-1">
              {prize ? t('common.save') : t('common.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
