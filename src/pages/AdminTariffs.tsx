import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  tariffsApi,
  TariffListItem,
  TariffDetail,
  TariffCreateRequest,
  TariffUpdateRequest,
  PeriodPrice,
  ServerInfo,
  ServerTrafficLimit
} from '../api/tariffs'

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

const InfinityIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
  </svg>
)

const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
)

const SunIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

// Type selection modal
interface TariffTypeSelectProps {
  onSelect: (isDaily: boolean) => void
  onClose: () => void
}

function TariffTypeSelect({ onSelect, onClose }: TariffTypeSelectProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">Выберите тип тарифа</h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <button
            onClick={() => onSelect(false)}
            className="w-full p-4 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-500/20 rounded-lg text-accent-400 group-hover:bg-accent-500/30">
                <CalendarIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">Периодный тариф</h3>
                <p className="text-sm text-dark-400 mt-1">
                  Оплата за период (7, 30, 90 дней и т.д.). Произвольные периоды и цены.
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => onSelect(true)}
            className="w-full p-4 bg-dark-700 hover:bg-dark-600 rounded-xl transition-colors text-left group"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-lg text-amber-400 group-hover:bg-amber-500/30">
                <SunIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">Суточный тариф</h3>
                <p className="text-sm text-dark-400 mt-1">
                  Ежедневное списание с баланса. Можно ставить на паузу.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// Period tariff modal
interface PeriodTariffModalProps {
  tariff?: TariffDetail | null
  servers: ServerInfo[]
  onSave: (data: TariffCreateRequest | TariffUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function PeriodTariffModal({ tariff, servers, onSave, onClose, isLoading }: PeriodTariffModalProps) {
  const isEdit = !!tariff

  const [name, setName] = useState(tariff?.name || '')
  const [description, setDescription] = useState(tariff?.description || '')
  const [trafficLimitGb, setTrafficLimitGb] = useState(tariff?.traffic_limit_gb || 100)
  const [deviceLimit, setDeviceLimit] = useState(tariff?.device_limit || 1)
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(tariff?.device_price_kopeks || 0)
  const [maxDeviceLimit, setMaxDeviceLimit] = useState(tariff?.max_device_limit || 0)
  const [tierLevel, setTierLevel] = useState(tariff?.tier_level || 1)
  const [periodPrices, setPeriodPrices] = useState<PeriodPrice[]>(
    tariff?.period_prices?.length ? tariff.period_prices : []
  )
  const [selectedSquads, setSelectedSquads] = useState<string[]>(tariff?.allowed_squads || [])
  const [serverTrafficLimits, setServerTrafficLimits] = useState<Record<string, ServerTrafficLimit>>(
    tariff?.server_traffic_limits || {}
  )
  // Докупка трафика
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(tariff?.traffic_topup_enabled || false)
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(tariff?.max_topup_traffic_gb || 0)
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>(
    tariff?.traffic_topup_packages || {}
  )

  // Режим сброса трафика
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(tariff?.traffic_reset_mode || null)

  // Новый период для добавления
  const [newPeriodDays, setNewPeriodDays] = useState(30)
  const [newPeriodPrice, setNewPeriodPrice] = useState(300)

  const [activeTab, setActiveTab] = useState<'basic' | 'periods' | 'servers' | 'extra'>('basic')

  const handleSubmit = () => {
    const filteredLimits: Record<string, ServerTrafficLimit> = {}
    for (const uuid of selectedSquads) {
      if (serverTrafficLimits[uuid] && serverTrafficLimits[uuid].traffic_limit_gb > 0) {
        filteredLimits[uuid] = serverTrafficLimits[uuid]
      }
    }

    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      traffic_limit_gb: trafficLimitGb,
      device_limit: deviceLimit,
      device_price_kopeks: devicePriceKopeks > 0 ? devicePriceKopeks : undefined,
      max_device_limit: maxDeviceLimit > 0 ? maxDeviceLimit : undefined,
      tier_level: tierLevel,
      period_prices: periodPrices.filter(p => p.price_kopeks > 0),
      allowed_squads: selectedSquads,
      server_traffic_limits: Object.keys(filteredLimits).length > 0 ? filteredLimits : {},
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      is_daily: false,
      daily_price_kopeks: 0,
      traffic_reset_mode: trafficResetMode,
    }
    onSave(data)
  }

  const updateServerTrafficLimit = (uuid: string, limitGb: number) => {
    setServerTrafficLimits(prev => ({
      ...prev,
      [uuid]: { traffic_limit_gb: limitGb }
    }))
  }

  const toggleServer = (uuid: string) => {
    setSelectedSquads(prev =>
      prev.includes(uuid)
        ? prev.filter(s => s !== uuid)
        : [...prev, uuid]
    )
  }

  const addPeriod = () => {
    if (newPeriodDays > 0 && newPeriodPrice > 0) {
      // Проверяем, нет ли уже такого периода
      const exists = periodPrices.some(p => p.days === newPeriodDays)
      if (!exists) {
        setPeriodPrices(prev => [...prev, { days: newPeriodDays, price_kopeks: newPeriodPrice * 100 }].sort((a, b) => a.days - b.days))
        setNewPeriodDays(30)
        setNewPeriodPrice(300)
      }
    }
  }

  const removePeriod = (days: number) => {
    setPeriodPrices(prev => prev.filter(p => p.days !== days))
  }

  const updatePeriodPrice = (days: number, priceRubles: number) => {
    setPeriodPrices(prev => prev.map(p =>
      p.days === days ? { ...p, price_kopeks: priceRubles * 100 } : p
    ))
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg text-accent-400">
              <CalendarIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {isEdit ? 'Редактирование тарифа' : 'Новый периодный тариф'}
              </h2>
              <p className="text-xs text-dark-500">Оплата за период</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['basic', 'periods', 'servers', 'extra'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-accent-400 border-b-2 border-accent-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'basic' && 'Основное'}
              {tab === 'periods' && 'Периоды'}
              {tab === 'servers' && 'Серверы'}
              {tab === 'extra' && 'Дополнительно'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Название тарифа</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  placeholder="Например: Стандарт"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Описание</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 resize-none"
                  rows={2}
                  placeholder="Краткое описание тарифа"
                />
              </div>

              {/* Traffic Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Лимит трафика</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trafficLimitGb}
                    onChange={e => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                    min={0}
                  />
                  <span className="text-dark-400">ГБ</span>
                  {trafficLimitGb === 0 && (
                    <span className="flex items-center gap-1 text-sm text-success-500">
                      <InfinityIcon />
                      Безлимит
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-500 mt-1">0 = безлимитный трафик</p>
              </div>

              {/* Device Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Устройств в тарифе</label>
                <input
                  type="number"
                  value={deviceLimit}
                  onChange={e => setDeviceLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={1}
                />
              </div>

              {/* Tier Level */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Уровень тарифа</label>
                <input
                  type="number"
                  value={tierLevel}
                  onChange={e => setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={1}
                  max={10}
                />
                <p className="text-xs text-dark-500 mt-1">Влияет на доступность перехода между тарифами</p>
              </div>
            </div>
          )}

          {activeTab === 'periods' && (
            <div className="space-y-4">
              <p className="text-sm text-dark-400">
                Добавьте периоды и цены для тарифа. Пользователи смогут выбирать из добавленных периодов.
              </p>

              {/* Add new period */}
              <div className="p-4 bg-dark-700/50 rounded-lg border border-dashed border-dark-600">
                <h4 className="text-sm font-medium text-dark-300 mb-3">Добавить период</h4>
                <div className="flex items-end gap-3 flex-wrap">
                  <div>
                    <label className="block text-xs text-dark-500 mb-1">Дней</label>
                    <input
                      type="number"
                      value={newPeriodDays}
                      onChange={e => setNewPeriodDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dark-500 mb-1">Цена (₽)</label>
                    <input
                      type="number"
                      value={newPeriodPrice}
                      onChange={e => setNewPeriodPrice(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-28 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                      min={1}
                    />
                  </div>
                  <button
                    onClick={addPeriod}
                    disabled={periodPrices.some(p => p.days === newPeriodDays)}
                    className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <PlusIcon />
                    Добавить
                  </button>
                </div>
              </div>

              {/* Period list */}
              {periodPrices.length === 0 ? (
                <div className="text-center py-8 text-dark-500">
                  Нет добавленных периодов. Добавьте хотя бы один период.
                </div>
              ) : (
                <div className="space-y-2">
                  {periodPrices.map(period => (
                    <div
                      key={period.days}
                      className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg"
                    >
                      <div className="w-20 text-dark-300 font-medium">{period.days} дн.</div>
                      <input
                        type="number"
                        value={period.price_kopeks / 100}
                        onChange={e => updatePeriodPrice(period.days, Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-28 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={0}
                        step={1}
                      />
                      <span className="text-dark-400">₽</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => removePeriod(period.days)}
                        className="p-2 text-dark-400 hover:text-error-400 hover:bg-error-500/20 rounded-lg transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-2">
              <p className="text-sm text-dark-400 mb-4">
                Выберите серверы, доступные на этом тарифе. Можно задать индивидуальный лимит трафика для каждого.
              </p>
              {servers.length === 0 ? (
                <p className="text-dark-500 text-center py-4">Нет доступных серверов</p>
              ) : (
                servers.map(server => {
                  const isSelected = selectedSquads.includes(server.squad_uuid)
                  const serverLimit = serverTrafficLimits[server.squad_uuid]?.traffic_limit_gb || 0
                  return (
                    <div
                      key={server.id}
                      className={`p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-accent-500/20 border border-accent-500/50'
                          : 'bg-dark-700 hover:bg-dark-600 border border-transparent'
                      }`}
                    >
                      <div
                        onClick={() => toggleServer(server.squad_uuid)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          isSelected
                            ? 'bg-accent-500 text-white'
                            : 'bg-dark-600'
                        }`}>
                          {isSelected && <CheckIcon />}
                        </div>
                        <span className="text-dark-200 flex-1">{server.display_name}</span>
                        {server.country_code && (
                          <span className="text-xs text-dark-500">{server.country_code}</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="mt-2 ml-8 flex items-center gap-2">
                          <span className="text-xs text-dark-400">Лимит трафика:</span>
                          <input
                            type="number"
                            value={serverLimit}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation()
                              updateServerTrafficLimit(server.squad_uuid, Math.max(0, parseInt(e.target.value) || 0))
                            }}
                            className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100 focus:outline-none focus:border-accent-500"
                            min={0}
                            placeholder="0"
                          />
                          <span className="text-xs text-dark-400">ГБ</span>
                          {serverLimit === 0 && (
                            <span className="text-xs text-dark-500">(использовать общий)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'extra' && (
            <div className="space-y-6">
              {/* Докупка устройств */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-dark-200 mb-3">Докупка устройств</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400 w-48">Цена за устройство (30 дней):</span>
                    <input
                      type="number"
                      value={devicePriceKopeks / 100}
                      onChange={e => setDevicePriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                      min={0}
                      step={1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <p className="text-xs text-dark-500">0 = докупка недоступна</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400 w-48">Макс. устройств на тарифе:</span>
                    <input
                      type="number"
                      value={maxDeviceLimit}
                      onChange={e => setMaxDeviceLimit(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-dark-500">0 = без ограничений</p>
                </div>
              </div>

              {/* Докупка трафика */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-dark-200">Докупка трафика</h4>
                  <button
                    type="button"
                    onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      trafficTopupEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        trafficTopupEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {trafficTopupEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Макс. лимит:</span>
                      <input
                        type="number"
                        value={maxTopupTrafficGb}
                        onChange={e => setMaxTopupTrafficGb(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={0}
                      />
                      <span className="text-dark-400">ГБ</span>
                      <span className="text-xs text-dark-500">(0 = без ограничений)</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-dark-400">Пакеты трафика:</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[5, 10, 20, 50].map(gb => (
                          <div key={gb} className="flex items-center gap-2">
                            <span className="text-sm text-dark-300 w-12">{gb} ГБ:</span>
                            <input
                              type="number"
                              value={(trafficTopupPackages[String(gb)] || 0) / 100}
                              onChange={e => {
                                const price = Math.max(0, parseFloat(e.target.value) || 0) * 100
                                setTrafficTopupPackages(prev => ({
                                  ...prev,
                                  [String(gb)]: price
                                }))
                              }}
                              className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100 focus:outline-none focus:border-accent-500"
                              min={0}
                              step={1}
                            />
                            <span className="text-xs text-dark-400">₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Режим сброса трафика */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-dark-200 mb-3">Режим сброса трафика</h4>
                <p className="text-xs text-dark-500 mb-3">
                  Определяет, когда сбрасывается использованный трафик у подписчиков этого тарифа
                </p>
                <div className="space-y-2">
                  {[
                    { value: null, label: '🌐 Глобальная настройка', desc: 'Использовать значение из конфига бота' },
                    { value: 'DAY', label: '📅 Ежедневно', desc: 'Сброс каждый день' },
                    { value: 'WEEK', label: '📆 Еженедельно', desc: 'Сброс каждую неделю' },
                    { value: 'MONTH', label: '🗓️ Ежемесячно', desc: 'Сброс каждый месяц' },
                    { value: 'NO_RESET', label: '🚫 Никогда', desc: 'Трафик не сбрасывается' },
                  ].map(option => (
                    <button
                      key={option.value || 'global'}
                      type="button"
                      onClick={() => setTrafficResetMode(option.value)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        trafficResetMode === option.value
                          ? 'bg-accent-500/20 border border-accent-500'
                          : 'bg-dark-600 border border-dark-500 hover:border-dark-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-dark-100">{option.label}</span>
                          <p className="text-xs text-dark-400 mt-0.5">{option.desc}</p>
                        </div>
                        {trafficResetMode === option.value && (
                          <span className="text-accent-400"><CheckIcon /></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            disabled={!name || periodPrices.length === 0 || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Daily tariff modal
interface DailyTariffModalProps {
  tariff?: TariffDetail | null
  servers: ServerInfo[]
  onSave: (data: TariffCreateRequest | TariffUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function DailyTariffModal({ tariff, servers, onSave, onClose, isLoading }: DailyTariffModalProps) {
  const isEdit = !!tariff

  const [name, setName] = useState(tariff?.name || '')
  const [description, setDescription] = useState(tariff?.description || '')
  const [trafficLimitGb, setTrafficLimitGb] = useState(tariff?.traffic_limit_gb || 100)
  const [deviceLimit, setDeviceLimit] = useState(tariff?.device_limit || 1)
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(tariff?.device_price_kopeks || 0)
  const [maxDeviceLimit, setMaxDeviceLimit] = useState(tariff?.max_device_limit || 0)
  const [tierLevel, setTierLevel] = useState(tariff?.tier_level || 1)
  const [dailyPriceKopeks, setDailyPriceKopeks] = useState(tariff?.daily_price_kopeks || 0)
  const [selectedSquads, setSelectedSquads] = useState<string[]>(tariff?.allowed_squads || [])
  const [serverTrafficLimits, setServerTrafficLimits] = useState<Record<string, ServerTrafficLimit>>(
    tariff?.server_traffic_limits || {}
  )
  // Докупка трафика
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(tariff?.traffic_topup_enabled || false)
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(tariff?.max_topup_traffic_gb || 0)
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>(
    tariff?.traffic_topup_packages || {}
  )

  // Режим сброса трафика
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(tariff?.traffic_reset_mode || null)

  const [activeTab, setActiveTab] = useState<'basic' | 'servers' | 'extra'>('basic')

  const handleSubmit = () => {
    const filteredLimits: Record<string, ServerTrafficLimit> = {}
    for (const uuid of selectedSquads) {
      if (serverTrafficLimits[uuid] && serverTrafficLimits[uuid].traffic_limit_gb > 0) {
        filteredLimits[uuid] = serverTrafficLimits[uuid]
      }
    }

    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      traffic_limit_gb: trafficLimitGb,
      device_limit: deviceLimit,
      device_price_kopeks: devicePriceKopeks > 0 ? devicePriceKopeks : undefined,
      max_device_limit: maxDeviceLimit > 0 ? maxDeviceLimit : undefined,
      tier_level: tierLevel,
      period_prices: [],
      allowed_squads: selectedSquads,
      server_traffic_limits: Object.keys(filteredLimits).length > 0 ? filteredLimits : {},
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      is_daily: true,
      daily_price_kopeks: dailyPriceKopeks,
      traffic_reset_mode: trafficResetMode,
    }
    onSave(data)
  }

  const updateServerTrafficLimit = (uuid: string, limitGb: number) => {
    setServerTrafficLimits(prev => ({
      ...prev,
      [uuid]: { traffic_limit_gb: limitGb }
    }))
  }

  const toggleServer = (uuid: string) => {
    setSelectedSquads(prev =>
      prev.includes(uuid)
        ? prev.filter(s => s !== uuid)
        : [...prev, uuid]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <SunIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {isEdit ? 'Редактирование тарифа' : 'Новый суточный тариф'}
              </h2>
              <p className="text-xs text-dark-500">Ежедневное списание</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['basic', 'servers', 'extra'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'basic' && 'Основное'}
              {tab === 'servers' && 'Серверы'}
              {tab === 'extra' && 'Дополнительно'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Название тарифа</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                  placeholder="Например: Суточный"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Описание</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500 resize-none"
                  rows={2}
                  placeholder="Краткое описание тарифа"
                />
              </div>

              {/* Daily Price */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <label className="block text-sm text-amber-400 font-medium mb-2">Цена за день</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={dailyPriceKopeks / 100}
                    onChange={e => setDailyPriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                    className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                    min={0}
                    step={0.1}
                  />
                  <span className="text-dark-400">₽/день</span>
                </div>
                <p className="text-xs text-dark-500 mt-2">Списывается ежедневно с баланса пользователя</p>
              </div>

              {/* Traffic Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Лимит трафика</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trafficLimitGb}
                    onChange={e => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                    min={0}
                  />
                  <span className="text-dark-400">ГБ</span>
                  {trafficLimitGb === 0 && (
                    <span className="flex items-center gap-1 text-sm text-success-500">
                      <InfinityIcon />
                      Безлимит
                    </span>
                  )}
                </div>
              </div>

              {/* Device Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Устройств в тарифе</label>
                <input
                  type="number"
                  value={deviceLimit}
                  onChange={e => setDeviceLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                  min={1}
                />
              </div>

              {/* Tier Level */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">Уровень тарифа</label>
                <input
                  type="number"
                  value={tierLevel}
                  onChange={e => setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                  min={1}
                  max={10}
                />
              </div>
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-2">
              <p className="text-sm text-dark-400 mb-4">
                Выберите серверы, доступные на этом тарифе.
              </p>
              {servers.length === 0 ? (
                <p className="text-dark-500 text-center py-4">Нет доступных серверов</p>
              ) : (
                servers.map(server => {
                  const isSelected = selectedSquads.includes(server.squad_uuid)
                  const serverLimit = serverTrafficLimits[server.squad_uuid]?.traffic_limit_gb || 0
                  return (
                    <div
                      key={server.id}
                      className={`p-3 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-500/50'
                          : 'bg-dark-700 hover:bg-dark-600 border border-transparent'
                      }`}
                    >
                      <div
                        onClick={() => toggleServer(server.squad_uuid)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center ${
                          isSelected
                            ? 'bg-amber-500 text-white'
                            : 'bg-dark-600'
                        }`}>
                          {isSelected && <CheckIcon />}
                        </div>
                        <span className="text-dark-200 flex-1">{server.display_name}</span>
                        {server.country_code && (
                          <span className="text-xs text-dark-500">{server.country_code}</span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="mt-2 ml-8 flex items-center gap-2">
                          <span className="text-xs text-dark-400">Лимит трафика:</span>
                          <input
                            type="number"
                            value={serverLimit}
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation()
                              updateServerTrafficLimit(server.squad_uuid, Math.max(0, parseInt(e.target.value) || 0))
                            }}
                            className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100 focus:outline-none focus:border-amber-500"
                            min={0}
                          />
                          <span className="text-xs text-dark-400">ГБ</span>
                          {serverLimit === 0 && (
                            <span className="text-xs text-dark-500">(использовать общий)</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'extra' && (
            <div className="space-y-6">
              {/* Докупка устройств */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-dark-200 mb-3">Докупка устройств</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400 w-48">Цена за устройство (30 дней):</span>
                    <input
                      type="number"
                      value={devicePriceKopeks / 100}
                      onChange={e => setDevicePriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                      min={0}
                      step={1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <p className="text-xs text-dark-500">0 = докупка недоступна</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400 w-48">Макс. устройств на тарифе:</span>
                    <input
                      type="number"
                      value={maxDeviceLimit}
                      onChange={e => setMaxDeviceLimit(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-dark-500">0 = без ограничений</p>
                </div>
              </div>

              {/* Докупка трафика */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-dark-200">Докупка трафика</h4>
                  <button
                    type="button"
                    onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      trafficTopupEnabled ? 'bg-amber-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        trafficTopupEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {trafficTopupEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Макс. лимит:</span>
                      <input
                        type="number"
                        value={maxTopupTrafficGb}
                        onChange={e => setMaxTopupTrafficGb(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                        min={0}
                      />
                      <span className="text-dark-400">ГБ</span>
                      <span className="text-xs text-dark-500">(0 = без ограничений)</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-dark-400">Пакеты трафика:</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[5, 10, 20, 50].map(gb => (
                          <div key={gb} className="flex items-center gap-2">
                            <span className="text-sm text-dark-300 w-12">{gb} ГБ:</span>
                            <input
                              type="number"
                              value={(trafficTopupPackages[String(gb)] || 0) / 100}
                              onChange={e => {
                                const price = Math.max(0, parseFloat(e.target.value) || 0) * 100
                                setTrafficTopupPackages(prev => ({
                                  ...prev,
                                  [String(gb)]: price
                                }))
                              }}
                              className="w-20 px-2 py-1 bg-dark-600 border border-dark-500 rounded text-sm text-dark-100 focus:outline-none focus:border-amber-500"
                              min={0}
                              step={1}
                            />
                            <span className="text-xs text-dark-400">₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Режим сброса трафика */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-dark-200 mb-3">Режим сброса трафика</h4>
                <p className="text-xs text-dark-500 mb-3">
                  Определяет, когда сбрасывается использованный трафик у подписчиков этого тарифа
                </p>
                <div className="space-y-2">
                  {[
                    { value: null, label: '🌐 Глобальная настройка', desc: 'Использовать значение из конфига бота' },
                    { value: 'DAY', label: '📅 Ежедневно', desc: 'Сброс каждый день' },
                    { value: 'WEEK', label: '📆 Еженедельно', desc: 'Сброс каждую неделю' },
                    { value: 'MONTH', label: '🗓️ Ежемесячно', desc: 'Сброс каждый месяц' },
                    { value: 'NO_RESET', label: '🚫 Никогда', desc: 'Трафик не сбрасывается' },
                  ].map(option => (
                    <button
                      key={option.value || 'global'}
                      type="button"
                      onClick={() => setTrafficResetMode(option.value)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        trafficResetMode === option.value
                          ? 'bg-amber-500/20 border border-amber-500'
                          : 'bg-dark-600 border border-dark-500 hover:border-dark-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-dark-100">{option.label}</span>
                          <p className="text-xs text-dark-400 mt-0.5">{option.desc}</p>
                        </div>
                        {trafficResetMode === option.value && (
                          <span className="text-amber-400"><CheckIcon /></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            disabled={!name || dailyPriceKopeks <= 0 || isLoading}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTariffs() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showTypeSelect, setShowTypeSelect] = useState(false)
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [showDailyModal, setShowDailyModal] = useState(false)
  const [editingTariff, setEditingTariff] = useState<TariffDetail | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Queries
  const { data: tariffsData, isLoading } = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: () => tariffsApi.getTariffs(true),
  })

  const { data: servers = [] } = useQuery({
    queryKey: ['admin-tariffs-servers'],
    queryFn: () => tariffsApi.getAvailableServers(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: tariffsApi.createTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
      setShowPeriodModal(false)
      setShowDailyModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TariffUpdateRequest }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
      setShowPeriodModal(false)
      setShowDailyModal(false)
      setEditingTariff(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: tariffsApi.deleteTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
      setDeleteConfirm(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: tariffsApi.toggleTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
    },
  })

  const toggleTrialMutation = useMutation({
    mutationFn: tariffsApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
    },
  })

  const handleTypeSelect = (isDaily: boolean) => {
    setShowTypeSelect(false)
    if (isDaily) {
      setShowDailyModal(true)
    } else {
      setShowPeriodModal(true)
    }
  }

  const handleEdit = async (tariffId: number) => {
    try {
      const detail = await tariffsApi.getTariff(tariffId)
      setEditingTariff(detail)
      // Открываем соответствующую модалку в зависимости от типа тарифа
      if (detail.is_daily) {
        setShowDailyModal(true)
      } else {
        setShowPeriodModal(true)
      }
    } catch (error) {
      console.error('Failed to load tariff:', error)
    }
  }

  const handleSave = (data: TariffCreateRequest | TariffUpdateRequest) => {
    if (editingTariff) {
      updateMutation.mutate({ id: editingTariff.id, data })
    } else {
      createMutation.mutate(data as TariffCreateRequest)
    }
  }

  const handleCloseModal = () => {
    setShowPeriodModal(false)
    setShowDailyModal(false)
    setEditingTariff(null)
  }

  const tariffs = tariffsData?.tariffs || []

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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.tariffs.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.tariffs.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingTariff(null); setShowTypeSelect(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          <PlusIcon />
          {t('admin.tariffs.create')}
        </button>
      </div>

      {/* Tariffs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tariffs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-400">{t('admin.tariffs.noTariffs')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tariffs.map((tariff: TariffListItem) => (
            <div
              key={tariff.id}
              className={`p-4 bg-dark-800 rounded-xl border transition-colors ${
                tariff.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-dark-100 truncate">{tariff.name}</h3>
                    {tariff.is_daily ? (
                      <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                        Суточный
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded">
                        Периодный
                      </span>
                    )}
                    {tariff.is_trial_available && (
                      <span className="px-2 py-0.5 text-xs bg-success-500/20 text-success-400 rounded">
                        {t('admin.tariffs.trial')}
                      </span>
                    )}
                    {!tariff.is_active && (
                      <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                        {t('admin.tariffs.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    {tariff.is_daily && tariff.daily_price_kopeks > 0 && (
                      <span className="text-amber-400">{(tariff.daily_price_kopeks / 100).toFixed(2)} ₽/день</span>
                    )}
                    <span>
                      {tariff.traffic_limit_gb === 0
                        ? t('admin.tariffs.unlimited')
                        : `${tariff.traffic_limit_gb} GB`
                      }
                    </span>
                    <span>{tariff.device_limit} {t('admin.tariffs.devices')}</span>
                    <span>{tariff.servers_count} {t('admin.tariffs.servers')}</span>
                    <span>{tariff.subscriptions_count} {t('admin.tariffs.subscriptions')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleMutation.mutate(tariff.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      tariff.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={tariff.is_active ? t('admin.tariffs.deactivate') : t('admin.tariffs.activate')}
                  >
                    {tariff.is_active ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Toggle Trial */}
                  <button
                    onClick={() => toggleTrialMutation.mutate(tariff.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      tariff.is_trial_available
                        ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={t('admin.tariffs.toggleTrial')}
                  >
                    T
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(tariff.id)}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors"
                    title={t('admin.tariffs.edit')}
                  >
                    <EditIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(tariff.id)}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-error-500/20 hover:text-error-400 transition-colors"
                    title={t('admin.tariffs.delete')}
                    disabled={tariff.subscriptions_count > 0}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Type Selection Modal */}
      {showTypeSelect && (
        <TariffTypeSelect
          onSelect={handleTypeSelect}
          onClose={() => setShowTypeSelect(false)}
        />
      )}

      {/* Period Tariff Modal */}
      {showPeriodModal && (
        <PeriodTariffModal
          tariff={editingTariff}
          servers={servers}
          onSave={handleSave}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Daily Tariff Modal */}
      {showDailyModal && (
        <DailyTariffModal
          tariff={editingTariff}
          servers={servers}
          onSave={handleSave}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-dark-100 mb-2">{t('admin.tariffs.confirmDelete')}</h3>
            <p className="text-dark-400 mb-6">{t('admin.tariffs.confirmDeleteText')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="px-4 py-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
