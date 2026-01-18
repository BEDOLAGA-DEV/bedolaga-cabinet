import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  campaignsApi,
  CampaignListItem,
  CampaignDetail,
  CampaignStatistics,
  CampaignCreateRequest,
  CampaignUpdateRequest,
  CampaignBonusType,
  ServerSquadInfo,
  TariffListItem,
  CampaignRegistrationItem,
} from '../api/campaigns'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
)

// Bonus type labels and colors
const bonusTypeConfig: Record<CampaignBonusType, { label: string; color: string; bgColor: string }> = {
  balance: { label: 'Баланс', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  subscription: { label: 'Подписка', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  tariff: { label: 'Тариф', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  none: { label: 'Только ссылка', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
}

// Format number as rubles
const formatRubles = (kopeks: number) => (kopeks / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽'

// Format date
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Campaign Modal
interface CampaignModalProps {
  campaign?: CampaignDetail | null
  servers: ServerSquadInfo[]
  tariffs: TariffListItem[]
  onSave: (data: CampaignCreateRequest | CampaignUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function CampaignModal({ campaign, servers, tariffs, onSave, onClose, isLoading }: CampaignModalProps) {
  const isEdit = !!campaign

  const [name, setName] = useState(campaign?.name || '')
  const [startParameter, setStartParameter] = useState(campaign?.start_parameter || '')
  const [bonusType, setBonusType] = useState<CampaignBonusType>(campaign?.bonus_type || 'balance')
  const [isActive, setIsActive] = useState(campaign?.is_active ?? true)

  // Balance bonus
  const [balanceBonusRubles, setBalanceBonusRubles] = useState((campaign?.balance_bonus_kopeks || 0) / 100)

  // Subscription bonus
  const [subscriptionDays, setSubscriptionDays] = useState(campaign?.subscription_duration_days || 7)
  const [subscriptionTraffic, setSubscriptionTraffic] = useState(campaign?.subscription_traffic_gb || 10)
  const [subscriptionDevices, setSubscriptionDevices] = useState(campaign?.subscription_device_limit || 1)
  const [selectedSquads, setSelectedSquads] = useState<string[]>(campaign?.subscription_squads || [])

  // Tariff bonus
  const [tariffId, setTariffId] = useState<number | null>(campaign?.tariff_id || null)
  const [tariffDays, setTariffDays] = useState(campaign?.tariff_duration_days || 30)

  const handleSubmit = () => {
    const data: CampaignCreateRequest | CampaignUpdateRequest = {
      name,
      start_parameter: startParameter,
      bonus_type: bonusType,
      is_active: isActive,
    }

    if (bonusType === 'balance') {
      data.balance_bonus_kopeks = Math.round(balanceBonusRubles * 100)
    } else if (bonusType === 'subscription') {
      data.subscription_duration_days = subscriptionDays
      data.subscription_traffic_gb = subscriptionTraffic
      data.subscription_device_limit = subscriptionDevices
      data.subscription_squads = selectedSquads
    } else if (bonusType === 'tariff') {
      data.tariff_id = tariffId || undefined
      data.tariff_duration_days = tariffDays
    }

    onSave(data)
  }

  const toggleServer = (uuid: string) => {
    setSelectedSquads(prev =>
      prev.includes(uuid)
        ? prev.filter(s => s !== uuid)
        : [...prev, uuid]
    )
  }

  const isValid = name.trim() && startParameter.trim() && /^[a-zA-Z0-9_-]+$/.test(startParameter)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">
            {isEdit ? 'Редактирование кампании' : 'Новая кампания'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Название</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              placeholder="Например: Instagram Реклама"
            />
          </div>

          {/* Start Parameter */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Метка (start параметр)</label>
            <input
              type="text"
              value={startParameter}
              onChange={e => setStartParameter(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              placeholder="instagram_jan2024"
            />
            <p className="text-xs text-dark-500 mt-1">Только латиница, цифры, _ и -</p>
          </div>

          {/* Bonus Type */}
          <div>
            <label className="block text-sm text-dark-300 mb-2">Тип бонуса</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(bonusTypeConfig) as CampaignBonusType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBonusType(type)}
                  className={`p-3 rounded-lg text-left transition-colors ${
                    bonusType === type
                      ? `${bonusTypeConfig[type].bgColor} border border-current ${bonusTypeConfig[type].color}`
                      : 'bg-dark-700 border border-dark-600 text-dark-300 hover:border-dark-500'
                  }`}
                >
                  <span className="text-sm font-medium">{bonusTypeConfig[type].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Bonus Settings */}
          {bonusType === 'balance' && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <label className="block text-sm text-emerald-400 font-medium mb-2">Бонус на баланс</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={balanceBonusRubles}
                  onChange={e => setBalanceBonusRubles(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-emerald-500"
                  min={0}
                  step={1}
                />
                <span className="text-dark-400">₽</span>
              </div>
            </div>
          )}

          {bonusType === 'subscription' && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg space-y-3">
              <label className="block text-sm text-blue-400 font-medium">Пробная подписка</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Дней</label>
                  <input
                    type="number"
                    value={subscriptionDays}
                    onChange={e => setSubscriptionDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Трафик (ГБ)</label>
                  <input
                    type="number"
                    value={subscriptionTraffic}
                    onChange={e => setSubscriptionTraffic(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-500 mb-1">Устройств</label>
                  <input
                    type="number"
                    value={subscriptionDevices}
                    onChange={e => setSubscriptionDevices(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-blue-500"
                    min={1}
                  />
                </div>
              </div>
              {servers.length > 0 && (
                <div>
                  <label className="block text-xs text-dark-500 mb-2">Серверы</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {servers.map(server => (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => toggleServer(server.squad_uuid)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                          selectedSquads.includes(server.squad_uuid)
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center ${
                          selectedSquads.includes(server.squad_uuid) ? 'bg-blue-500 text-white' : 'bg-dark-500'
                        }`}>
                          {selectedSquads.includes(server.squad_uuid) && <CheckIcon />}
                        </div>
                        <span className="text-sm">{server.display_name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bonusType === 'tariff' && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
              <label className="block text-sm text-purple-400 font-medium">Тариф</label>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Выберите тариф</label>
                <select
                  value={tariffId || ''}
                  onChange={e => setTariffId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="">Не выбран</option>
                  {tariffs.map(tariff => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} ({tariff.traffic_limit_gb} ГБ, {tariff.device_limit} уст.)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-500 mb-1">Длительность (дней)</label>
                <input
                  type="number"
                  value={tariffDays}
                  onChange={e => setTariffDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-purple-500"
                  min={1}
                />
              </div>
            </div>
          )}

          {bonusType === 'none' && (
            <div className="p-4 bg-gray-500/10 border border-gray-500/30 rounded-lg">
              <p className="text-sm text-dark-400">
                Кампания без бонусов - только для отслеживания переходов и регистраций.
              </p>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <span className="text-sm text-dark-300">Активна</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative ${
                isActive ? 'bg-accent-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  isActive ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Statistics Modal
interface StatsModalProps {
  stats: CampaignStatistics
  onClose: () => void
  onViewUsers: () => void
}

function StatsModal({ stats, onClose, onViewUsers }: StatsModalProps) {
  const [copied, setCopied] = useState(false)

  const copyLink = () => {
    if (stats.deep_link) {
      navigator.clipboard.writeText(stats.deep_link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">{stats.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded ${bonusTypeConfig[stats.bonus_type].bgColor} ${bonusTypeConfig[stats.bonus_type].color}`}>
                {bonusTypeConfig[stats.bonus_type].label}
              </span>
              {stats.is_active ? (
                <span className="px-2 py-0.5 text-xs bg-success-500/20 text-success-400 rounded">Активна</span>
              ) : (
                <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">Неактивна</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Deep Link */}
          {stats.deep_link && (
            <div className="p-3 bg-dark-700 rounded-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <LinkIcon />
                  <span className="text-sm text-dark-300 truncate">{stats.deep_link}</span>
                </div>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1 px-3 py-1.5 bg-dark-600 text-dark-300 rounded-lg hover:bg-dark-500 transition-colors shrink-0"
                >
                  <CopyIcon />
                  <span className="text-sm">{copied ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-dark-100">{stats.registrations}</div>
              <div className="text-xs text-dark-500">Регистраций</div>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-emerald-400">{formatRubles(stats.total_revenue_kopeks)}</div>
              <div className="text-xs text-dark-500">Доход</div>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.paid_users_count}</div>
              <div className="text-xs text-dark-500">Оплатили</div>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.conversion_rate}%</div>
              <div className="text-xs text-dark-500">Конверсия</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Бонусы выданы</div>
              {stats.bonus_type === 'balance' && (
                <div className="text-lg font-medium text-emerald-400">{formatRubles(stats.balance_issued_kopeks)}</div>
              )}
              {stats.bonus_type === 'subscription' && (
                <div className="text-lg font-medium text-blue-400">{stats.subscription_issued} подписок</div>
              )}
              {stats.bonus_type === 'tariff' && (
                <div className="text-lg font-medium text-purple-400">{stats.subscription_issued} тарифов</div>
              )}
              {stats.bonus_type === 'none' && (
                <div className="text-lg font-medium text-dark-400">-</div>
              )}
            </div>
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Средний доход с пользователя</div>
              <div className="text-lg font-medium text-dark-200">{formatRubles(stats.avg_revenue_per_user_kopeks)}</div>
            </div>
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Средний первый платёж</div>
              <div className="text-lg font-medium text-dark-200">{formatRubles(stats.avg_first_payment_kopeks)}</div>
            </div>
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Пробных подписок</div>
              <div className="text-lg font-medium text-dark-200">{stats.trial_users_count} (активных: {stats.active_trials_count})</div>
            </div>
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Конверсия из триала</div>
              <div className="text-lg font-medium text-dark-200">{stats.trial_conversion_rate}%</div>
            </div>
            <div className="p-3 bg-dark-700/50 rounded-lg">
              <div className="text-sm text-dark-400 mb-2">Последняя регистрация</div>
              <div className="text-sm font-medium text-dark-200">{formatDate(stats.last_registration)}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onViewUsers}
            className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors"
          >
            <UsersIcon />
            Пользователи
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

// Users Modal
interface UsersModalProps {
  campaignId: number
  campaignName: string
  onClose: () => void
}

function UsersModal({ campaignId, campaignName, onClose }: UsersModalProps) {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-registrations', campaignId, page],
    queryFn: () => campaignsApi.getCampaignRegistrations(campaignId, page, 20),
  })

  const registrations = data?.registrations || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-dark-100">Пользователи кампании</h2>
            <p className="text-sm text-dark-400">{campaignName} - {total} регистраций</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-dark-400">
              Нет зарегистрированных пользователей
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-dark-700 sticky top-0">
                <tr>
                  <th className="text-left text-xs font-medium text-dark-400 p-3">Пользователь</th>
                  <th className="text-left text-xs font-medium text-dark-400 p-3">Бонус</th>
                  <th className="text-left text-xs font-medium text-dark-400 p-3">Баланс</th>
                  <th className="text-left text-xs font-medium text-dark-400 p-3">Статус</th>
                  <th className="text-left text-xs font-medium text-dark-400 p-3">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {registrations.map((reg: CampaignRegistrationItem) => (
                  <tr key={reg.id} className="hover:bg-dark-700/50">
                    <td className="p-3">
                      <div className="text-sm text-dark-100">
                        {reg.first_name || 'Без имени'}
                        {reg.username && <span className="text-dark-400 ml-1">@{reg.username}</span>}
                      </div>
                      <div className="text-xs text-dark-500">{reg.telegram_id}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${bonusTypeConfig[reg.bonus_type as CampaignBonusType]?.bgColor || 'bg-dark-600'} ${bonusTypeConfig[reg.bonus_type as CampaignBonusType]?.color || 'text-dark-400'}`}>
                        {bonusTypeConfig[reg.bonus_type as CampaignBonusType]?.label || reg.bonus_type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-dark-300">{formatRubles(reg.user_balance_kopeks)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {reg.has_subscription && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">VPN</span>
                        )}
                        {reg.has_paid && (
                          <span className="px-1.5 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">Платил</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-dark-400">{formatDate(reg.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-dark-700">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Назад
            </button>
            <span className="text-sm text-dark-400">
              {page} из {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Далее
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Main Component
export default function AdminCampaigns() {
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<CampaignDetail | null>(null)
  const [showStats, setShowStats] = useState<CampaignStatistics | null>(null)
  const [showUsers, setShowUsers] = useState<{ id: number; name: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Queries
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: () => campaignsApi.getCampaigns(true),
  })

  const { data: overview } = useQuery({
    queryKey: ['admin-campaigns-overview'],
    queryFn: () => campaignsApi.getOverview(),
  })

  const { data: servers = [] } = useQuery({
    queryKey: ['admin-campaigns-servers'],
    queryFn: () => campaignsApi.getAvailableServers(),
  })

  const { data: tariffs = [] } = useQuery({
    queryKey: ['admin-campaigns-tariffs'],
    queryFn: () => campaignsApi.getAvailableTariffs(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] })
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CampaignUpdateRequest }) =>
      campaignsApi.updateCampaign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      setShowModal(false)
      setEditingCampaign(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: campaignsApi.deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] })
      setDeleteConfirm(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: campaignsApi.toggleCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] })
    },
  })

  const handleEdit = async (campaignId: number) => {
    try {
      const detail = await campaignsApi.getCampaign(campaignId)
      setEditingCampaign(detail)
      setShowModal(true)
    } catch (error) {
      console.error('Failed to load campaign:', error)
    }
  }

  const handleViewStats = async (campaignId: number) => {
    try {
      const stats = await campaignsApi.getCampaignStats(campaignId)
      setShowStats(stats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleSave = (data: CampaignCreateRequest | CampaignUpdateRequest) => {
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data })
    } else {
      createMutation.mutate(data as CampaignCreateRequest)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCampaign(null)
  }

  const campaigns = campaignsData?.campaigns || []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">Рекламные кампании</h1>
            <p className="text-sm text-dark-400">Управление рекламными ссылками</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingCampaign(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          <PlusIcon />
          Создать
        </button>
      </div>

      {/* Overview */}
      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-dark-100">{overview.total}</div>
            <div className="text-sm text-dark-400">Всего кампаний</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-success-400">{overview.active}</div>
            <div className="text-sm text-dark-400">Активных</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-blue-400">{overview.total_registrations}</div>
            <div className="text-sm text-dark-400">Регистраций</div>
          </div>
          <div className="p-4 bg-dark-800 rounded-xl border border-dark-700">
            <div className="text-2xl font-bold text-emerald-400">{formatRubles(overview.total_balance_issued_kopeks)}</div>
            <div className="text-sm text-dark-400">Выдано бонусов</div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-400">Нет рекламных кампаний</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: CampaignListItem) => (
            <div
              key={campaign.id}
              className={`p-4 bg-dark-800 rounded-xl border transition-colors ${
                campaign.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-dark-100 truncate">{campaign.name}</h3>
                    <span className={`px-2 py-0.5 text-xs rounded ${bonusTypeConfig[campaign.bonus_type].bgColor} ${bonusTypeConfig[campaign.bonus_type].color}`}>
                      {bonusTypeConfig[campaign.bonus_type].label}
                    </span>
                    {!campaign.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                        Неактивна
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="font-mono text-xs">?start={campaign.start_parameter}</span>
                    <span>{campaign.registrations_count} регистраций</span>
                    <span>{formatRubles(campaign.total_revenue_kopeks)} доход</span>
                    <span>{campaign.conversion_rate}% конверсия</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stats */}
                  <button
                    onClick={() => handleViewStats(campaign.id)}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                    title="Статистика"
                  >
                    <ChartIcon />
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleMutation.mutate(campaign.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      campaign.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={campaign.is_active ? 'Деактивировать' : 'Активировать'}
                  >
                    {campaign.is_active ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(campaign.id)}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                    title="Редактировать"
                  >
                    <EditIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(campaign.id)}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-error-500/20 hover:text-error-400 transition-colors"
                    title="Удалить"
                    disabled={campaign.registrations_count > 0}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CampaignModal
          campaign={editingCampaign}
          servers={servers}
          tariffs={tariffs}
          onSave={handleSave}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Stats Modal */}
      {showStats && (
        <StatsModal
          stats={showStats}
          onClose={() => setShowStats(null)}
          onViewUsers={() => {
            setShowUsers({ id: showStats.id, name: showStats.name })
            setShowStats(null)
          }}
        />
      )}

      {/* Users Modal */}
      {showUsers && (
        <UsersModal
          campaignId={showUsers.id}
          campaignName={showUsers.name}
          onClose={() => setShowUsers(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Удалить кампанию?</h3>
            <p className="text-dark-400 mb-6">Это действие нельзя отменить. Кампании с регистрациями удалить нельзя.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
