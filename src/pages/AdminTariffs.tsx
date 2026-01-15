import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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
const TariffIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
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

// Default period options
const DEFAULT_PERIODS = [7, 14, 30, 90, 180, 365]

interface TariffModalProps {
  tariff?: TariffDetail | null
  servers: ServerInfo[]
  onSave: (data: TariffCreateRequest | TariffUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function TariffModal({ tariff, servers, onSave, onClose, isLoading }: TariffModalProps) {
  const { t } = useTranslation()
  const isEdit = !!tariff

  const [name, setName] = useState(tariff?.name || '')
  const [description, setDescription] = useState(tariff?.description || '')
  const [trafficLimitGb, setTrafficLimitGb] = useState(tariff?.traffic_limit_gb || 0)
  const [deviceLimit, setDeviceLimit] = useState(tariff?.device_limit || 1)
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(tariff?.device_price_kopeks || 0)
  const [tierLevel, setTierLevel] = useState(tariff?.tier_level || 1)
  const [periodPrices, setPeriodPrices] = useState<PeriodPrice[]>(
    tariff?.period_prices || DEFAULT_PERIODS.map(d => ({ days: d, price_kopeks: 0 }))
  )
  const [selectedSquads, setSelectedSquads] = useState<string[]>(tariff?.allowed_squads || [])
  const [serverTrafficLimits, setServerTrafficLimits] = useState<Record<string, ServerTrafficLimit>>(
    tariff?.server_traffic_limits || {}
  )
  // Произвольное количество дней
  const [customDaysEnabled, setCustomDaysEnabled] = useState(tariff?.custom_days_enabled || false)
  const [pricePerDayKopeks, setPricePerDayKopeks] = useState(tariff?.price_per_day_kopeks || 0)
  const [minDays, setMinDays] = useState(tariff?.min_days || 1)
  const [maxDays, setMaxDays] = useState(tariff?.max_days || 365)
  // Произвольный трафик
  const [customTrafficEnabled, setCustomTrafficEnabled] = useState(tariff?.custom_traffic_enabled || false)
  const [trafficPricePerGbKopeks, setTrafficPricePerGbKopeks] = useState(tariff?.traffic_price_per_gb_kopeks || 0)
  const [minTrafficGb, setMinTrafficGb] = useState(tariff?.min_traffic_gb || 1)
  const [maxTrafficGb, setMaxTrafficGb] = useState(tariff?.max_traffic_gb || 1000)
  // Докупка трафика
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(tariff?.traffic_topup_enabled || false)
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(tariff?.max_topup_traffic_gb || 0)
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>(
    tariff?.traffic_topup_packages || {}
  )
  // Дневной тариф
  const [isDaily, setIsDaily] = useState(tariff?.is_daily || false)
  const [dailyPriceKopeks, setDailyPriceKopeks] = useState(tariff?.daily_price_kopeks || 0)
  const [activeTab, setActiveTab] = useState<'basic' | 'prices' | 'servers' | 'custom'>('basic')

  const handleSubmit = () => {
    // Фильтруем лимиты только для выбранных серверов и только если они заданы (> 0)
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
      tier_level: tierLevel,
      period_prices: periodPrices.filter(p => p.price_kopeks > 0),
      allowed_squads: selectedSquads,
      server_traffic_limits: Object.keys(filteredLimits).length > 0 ? filteredLimits : {},
      // Произвольное количество дней
      custom_days_enabled: customDaysEnabled,
      price_per_day_kopeks: pricePerDayKopeks,
      min_days: minDays,
      max_days: maxDays,
      // Произвольный трафик
      custom_traffic_enabled: customTrafficEnabled,
      traffic_price_per_gb_kopeks: trafficPricePerGbKopeks,
      min_traffic_gb: minTrafficGb,
      max_traffic_gb: maxTrafficGb,
      // Докупка трафика
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      // Дневной тариф
      is_daily: isDaily,
      daily_price_kopeks: dailyPriceKopeks,
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

  const updatePeriodPrice = (days: number, priceKopeks: number) => {
    setPeriodPrices(prev => {
      const existing = prev.find(p => p.days === days)
      if (existing) {
        return prev.map(p => p.days === days ? { ...p, price_kopeks: priceKopeks } : p)
      }
      return [...prev, { days, price_kopeks: priceKopeks }]
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100">
            {isEdit ? t('admin.tariffs.edit') : t('admin.tariffs.create')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['basic', 'prices', 'servers', 'custom'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-accent-400 border-b-2 border-accent-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'basic' && t('admin.tariffs.tabs.basic')}
              {tab === 'prices' && t('admin.tariffs.tabs.prices')}
              {tab === 'servers' && t('admin.tariffs.tabs.servers')}
              {tab === 'custom' && 'Гибкие опции'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">{t('admin.tariffs.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  placeholder={t('admin.tariffs.namePlaceholder')}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">{t('admin.tariffs.description')}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 resize-none"
                  rows={3}
                  placeholder={t('admin.tariffs.descriptionPlaceholder')}
                />
              </div>

              {/* Traffic Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">{t('admin.tariffs.trafficLimit')}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trafficLimitGb}
                    onChange={e => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                    min={0}
                  />
                  <span className="text-dark-400">GB</span>
                  {trafficLimitGb === 0 && (
                    <span className="flex items-center gap-1 text-sm text-success-500">
                      <InfinityIcon />
                      {t('admin.tariffs.unlimited')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-500 mt-1">{t('admin.tariffs.trafficHint')}</p>
              </div>

              {/* Device Limit */}
              <div>
                <label className="block text-sm text-dark-300 mb-1">{t('admin.tariffs.deviceLimit')}</label>
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
                <label className="block text-sm text-dark-300 mb-1">{t('admin.tariffs.tierLevel')}</label>
                <input
                  type="number"
                  value={tierLevel}
                  onChange={e => setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                  min={1}
                  max={10}
                />
                <p className="text-xs text-dark-500 mt-1">{t('admin.tariffs.tierHint')}</p>
              </div>
            </div>
          )}

          {activeTab === 'prices' && (
            <div className="space-y-3">
              <p className="text-sm text-dark-400 mb-4">{t('admin.tariffs.pricesHint')}</p>
              {DEFAULT_PERIODS.map(days => {
                const price = periodPrices.find(p => p.days === days)?.price_kopeks || 0
                const isEnabled = price > 0
                return (
                  <div
                    key={days}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isEnabled
                        ? 'bg-dark-700/50'
                        : 'bg-dark-800/30 opacity-60'
                    }`}
                  >
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isEnabled) {
                          updatePeriodPrice(days, 0)
                        } else {
                          updatePeriodPrice(days, 10000) // Default 100₽
                        }
                      }}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        isEnabled ? 'bg-accent-500' : 'bg-dark-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          isEnabled ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                    <span className="w-20 text-dark-300">{days} {t('admin.tariffs.days')}</span>
                    <input
                      type="number"
                      value={price / 100}
                      onChange={e => updatePeriodPrice(days, Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                      disabled={!isEnabled}
                      className={`w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 ${
                        !isEnabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      min={0}
                      step={1}
                    />
                    <span className="text-dark-400">₽</span>
                    {!isEnabled && (
                      <span className="text-xs text-dark-500">{t('admin.tariffs.periodDisabled')}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-2">
              <p className="text-sm text-dark-400 mb-4">{t('admin.tariffs.serversHint')}</p>
              {servers.length === 0 ? (
                <p className="text-dark-500 text-center py-4">{t('admin.tariffs.noServers')}</p>
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
                      {/* Лимит трафика для сервера */}
                      {isSelected && (
                        <div className="mt-2 ml-8 flex items-center gap-2">
                          <span className="text-xs text-dark-400">{t('admin.tariffs.serverTrafficLimit')}:</span>
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
                          <span className="text-xs text-dark-400">GB</span>
                          {serverLimit === 0 && (
                            <span className="text-xs text-dark-500">({t('admin.tariffs.useDefault')})</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              {/* Дневной тариф */}
              <div className="p-4 bg-dark-700/50 rounded-lg border border-amber-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-amber-400">🌙 Дневной тариф</h4>
                    <p className="text-xs text-dark-500 mt-1">Ежедневное списание с баланса. Можно ставить на паузу.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDaily(!isDaily)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      isDaily ? 'bg-amber-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        isDaily ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {isDaily && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-400 w-32">Цена за день:</span>
                    <input
                      type="number"
                      value={dailyPriceKopeks / 100}
                      onChange={e => setDailyPriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                      className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-amber-500"
                      min={0}
                      step={0.1}
                    />
                    <span className="text-dark-400">₽/день</span>
                  </div>
                )}
              </div>

              {/* Цена за доп. устройство */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-dark-200 mb-3">Докупка устройств</h4>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-dark-400">Цена за устройство (30 дней):</span>
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
                <p className="text-xs text-dark-500 mt-1">0 = докупка недоступна</p>
              </div>

              {/* Произвольное количество дней */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-dark-200">Произвольное кол-во дней</h4>
                  <button
                    type="button"
                    onClick={() => setCustomDaysEnabled(!customDaysEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      customDaysEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        customDaysEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {customDaysEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Цена за день:</span>
                      <input
                        type="number"
                        value={pricePerDayKopeks / 100}
                        onChange={e => setPricePerDayKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={0}
                        step={0.1}
                      />
                      <span className="text-dark-400">₽</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Мин. дней:</span>
                      <input
                        type="number"
                        value={minDays}
                        onChange={e => setMinDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Макс. дней:</span>
                      <input
                        type="number"
                        value={maxDays}
                        onChange={e => setMaxDays(Math.max(1, parseInt(e.target.value) || 365))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Произвольный трафик */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-dark-200">Произвольный трафик при покупке</h4>
                  <button
                    type="button"
                    onClick={() => setCustomTrafficEnabled(!customTrafficEnabled)}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      customTrafficEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        customTrafficEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {customTrafficEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Цена за 1 ГБ:</span>
                      <input
                        type="number"
                        value={trafficPricePerGbKopeks / 100}
                        onChange={e => setTrafficPricePerGbKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={0}
                        step={0.1}
                      />
                      <span className="text-dark-400">₽</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Мин. ГБ:</span>
                      <input
                        type="number"
                        value={minTrafficGb}
                        onChange={e => setMinTrafficGb(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-dark-400 w-32">Макс. ГБ:</span>
                      <input
                        type="number"
                        value={maxTrafficGb}
                        onChange={e => setMaxTrafficGb(Math.max(1, parseInt(e.target.value) || 1000))}
                        className="w-24 px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Докупка трафика */}
              <div className="p-4 bg-dark-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-dark-200">Докупка трафика (после покупки)</h4>
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
                      <span className="text-sm text-dark-400">Пакеты трафика (ГБ: цена ₽):</span>
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminTariffs() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(false)
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
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TariffUpdateRequest }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
      setShowModal(false)
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

  const handleEdit = async (tariffId: number) => {
    try {
      const detail = await tariffsApi.getTariff(tariffId)
      setEditingTariff(detail)
      setShowModal(true)
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

  const tariffs = tariffsData?.tariffs || []

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-500/20 rounded-lg">
            <TariffIcon />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.tariffs.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.tariffs.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingTariff(null); setShowModal(true) }}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <TariffModal
          tariff={editingTariff}
          servers={servers}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingTariff(null) }}
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
