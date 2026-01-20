import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { AxiosError } from 'axios'
import { subscriptionApi } from '../api/subscription'
import { promoApi } from '../api/promo'
import type { PurchaseSelection, PeriodOption, Tariff, TariffPeriod, ClassicPurchaseOptions } from '../types'
import ConnectionModal from '../components/ConnectionModal'
import InsufficientBalancePrompt from '../components/InsufficientBalancePrompt'
import { useCurrency } from '../hooks/useCurrency'

// Helper to extract error message from axios/api errors
const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (typeof detail === 'object' && detail?.message) return detail.message
  }
  if (error instanceof Error) return error.message
  return 'Произошла ошибка'
}

// Icons
const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

// Convert country code to flag emoji
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return ''
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

type PurchaseStep = 'period' | 'traffic' | 'servers' | 'devices' | 'confirm'

export default function Subscription() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const location = useLocation()
  const { formatAmount, currencySymbol } = useCurrency()
  const [copied, setCopied] = useState(false)
  const [showConnectionModal, setShowConnectionModal] = useState(false)

  // Helper to format price from kopeks
  const formatPrice = (kopeks: number) => `${formatAmount(kopeks / 100)} ${currencySymbol}`

  // Helper to apply promo discount to a price
  const applyPromoDiscount = (priceKopeks: number, hasExistingDiscount: boolean = false): {
    price: number;
    original: number | null;
    percent: number | null
  } => {
    // Only apply promo discount if no existing discount (from promo group) and we have an active promo discount
    if (!activeDiscount?.is_active || !activeDiscount.discount_percent || hasExistingDiscount) {
      return { price: priceKopeks, original: null, percent: null }
    }
    const discountedPrice = Math.round(priceKopeks * (1 - activeDiscount.discount_percent / 100))
    return {
      price: discountedPrice,
      original: priceKopeks,
      percent: activeDiscount.discount_percent
    }
  }

  // Purchase state (classic mode)
  const [currentStep, setCurrentStep] = useState<PurchaseStep>('period')
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null)
  const [selectedTraffic, setSelectedTraffic] = useState<number | null>(null)
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [selectedDevices, setSelectedDevices] = useState<number>(1)
  const [showPurchaseForm, setShowPurchaseForm] = useState(false)

  // Tariffs mode state
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)
  const [selectedTariffPeriod, setSelectedTariffPeriod] = useState<TariffPeriod | null>(null)
  const [showTariffPurchase, setShowTariffPurchase] = useState(false)
  // Custom days/traffic state
  const [customDays, setCustomDays] = useState<number>(30)
  const [customTrafficGb, setCustomTrafficGb] = useState<number>(50)
  const [useCustomDays, setUseCustomDays] = useState(false)
  const [useCustomTraffic, setUseCustomTraffic] = useState(false)
  // Device/traffic topup state
  const [showDeviceTopup, setShowDeviceTopup] = useState(false)
  const [devicesToAdd, setDevicesToAdd] = useState(1)
  const [showTrafficTopup, setShowTrafficTopup] = useState(false)
  const [selectedTrafficPackage, setSelectedTrafficPackage] = useState<number | null>(null)
  const [showServerManagement, setShowServerManagement] = useState(false)
  const [selectedServersToUpdate, setSelectedServersToUpdate] = useState<string[]>([])

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: subscriptionApi.getSubscription,
    retry: false,
    staleTime: 0, // Always refetch to get latest data
    refetchOnMount: 'always',
  })

  const { data: purchaseOptions, isLoading: optionsLoading } = useQuery({
    queryKey: ['purchase-options'],
    queryFn: subscriptionApi.getPurchaseOptions,
  })

  // Fetch active promo discount
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    staleTime: 30000,
  })

  // Check if in tariffs mode (moved up to be available for useEffect)
  const isTariffsMode = purchaseOptions?.sales_mode === 'tariffs'
  const classicOptions = !isTariffsMode ? purchaseOptions as ClassicPurchaseOptions : null
  const tariffs = isTariffsMode && purchaseOptions && 'tariffs' in purchaseOptions ? purchaseOptions.tariffs : []

  // Determine which steps are needed
  const steps = useMemo<PurchaseStep[]>(() => {
    const result: PurchaseStep[] = ['period']
    if (selectedPeriod?.traffic.selectable && (selectedPeriod.traffic.options?.length ?? 0) > 0) {
      result.push('traffic')
    }
    if (selectedPeriod && (selectedPeriod.servers.options?.length ?? 0) > 0) {
      result.push('servers')
    }
    if (selectedPeriod && selectedPeriod.devices.max > selectedPeriod.devices.min) {
      result.push('devices')
    }
    result.push('confirm')
    return result
  }, [selectedPeriod])

  const currentStepIndex = steps.indexOf(currentStep)
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  // Initialize selection from options (classic mode only)
  useEffect(() => {
    if (classicOptions && !selectedPeriod) {
      const defaultPeriod = classicOptions.periods.find(p => p.id === classicOptions.selection.period_id) || classicOptions.periods[0]
      setSelectedPeriod(defaultPeriod)
      setSelectedTraffic(classicOptions.selection.traffic_value)
      setSelectedServers(classicOptions.selection.servers)
      setSelectedDevices(classicOptions.selection.devices)
    }
  }, [classicOptions, selectedPeriod])

  // Build selection object
  const currentSelection: PurchaseSelection = useMemo(() => ({
    period_id: selectedPeriod?.id,
    period_days: selectedPeriod?.period_days,
    traffic_value: selectedTraffic ?? undefined,
    servers: selectedServers,
    devices: selectedDevices,
  }), [selectedPeriod, selectedTraffic, selectedServers, selectedDevices])

  // Preview query
  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['purchase-preview', currentSelection],
    queryFn: () => subscriptionApi.previewPurchase(currentSelection),
    enabled: !!selectedPeriod && showPurchaseForm && currentStep === 'confirm',
  })

  const purchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.submitPurchase(currentSelection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] })
      setShowPurchaseForm(false)
      setCurrentStep('period')
    },
  })

  const autopayMutation = useMutation({
    mutationFn: (enabled: boolean) => subscriptionApi.updateAutopay(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  // Devices query
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: subscriptionApi.getDevices,
    enabled: !!subscription,
  })

  // Delete device mutation
  const deleteDeviceMutation = useMutation({
    mutationFn: (hwid: string) => subscriptionApi.deleteDevice(hwid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  // Delete all devices mutation
  const deleteAllDevicesMutation = useMutation({
    mutationFn: () => subscriptionApi.deleteAllDevices(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    },
  })

  // Pause subscription mutation
  const pauseMutation = useMutation({
    mutationFn: () => subscriptionApi.togglePause(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })

  // Refs for auto-scroll
  const switchModalRef = useRef<HTMLDivElement>(null)
  const tariffPurchaseRef = useRef<HTMLDivElement>(null)
  const tariffsCardRef = useRef<HTMLDivElement>(null)

  // Tariff switch preview
  const [switchTariffId, setSwitchTariffId] = useState<number | null>(null)
  const { data: switchPreview, isLoading: switchPreviewLoading } = useQuery({
    queryKey: ['tariff-switch-preview', switchTariffId],
    queryFn: () => subscriptionApi.previewTariffSwitch(switchTariffId!),
    enabled: !!switchTariffId,
  })

  // Tariff switch mutation
  const switchTariffMutation = useMutation({
    mutationFn: (tariffId: number) => subscriptionApi.switchTariff(tariffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] })
      setSwitchTariffId(null)
    },
  })

  // Tariff purchase mutation
  const tariffPurchaseMutation = useMutation({
    mutationFn: () => {
      if (!selectedTariff) {
        throw new Error('Tariff not selected')
      }
      // For daily tariffs, always use 1 day
      const isDailyTariff = selectedTariff.is_daily || (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0)
      const days = isDailyTariff ? 1 : (useCustomDays ? customDays : (selectedTariffPeriod?.days || 30))
      const trafficGb = useCustomTraffic && selectedTariff.custom_traffic_enabled ? customTrafficGb : undefined
      return subscriptionApi.purchaseTariff(selectedTariff.id, days, trafficGb)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-options'] })
      setShowTariffPurchase(false)
      setSelectedTariff(null)
      setSelectedTariffPeriod(null)
      setUseCustomDays(false)
      setUseCustomTraffic(false)
    },
  })

  // Device price query
  const { data: devicePriceData } = useQuery({
    queryKey: ['device-price', devicesToAdd],
    queryFn: () => subscriptionApi.getDevicePrice(devicesToAdd),
    enabled: showDeviceTopup && !!subscription,
  })

  // Device purchase mutation
  const devicePurchaseMutation = useMutation({
    mutationFn: () => subscriptionApi.purchaseDevices(devicesToAdd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['devices'] })
      setShowDeviceTopup(false)
      setDevicesToAdd(1)
    },
  })

  // Traffic packages query
  const { data: trafficPackages } = useQuery({
    queryKey: ['traffic-packages'],
    queryFn: subscriptionApi.getTrafficPackages,
    enabled: showTrafficTopup && !!subscription,
  })

  // Traffic purchase mutation
  const trafficPurchaseMutation = useMutation({
    mutationFn: (gb: number) => subscriptionApi.purchaseTraffic(gb),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      setShowTrafficTopup(false)
      setSelectedTrafficPackage(null)
    },
  })

  // Countries/servers query
  const { data: countriesData, isLoading: countriesLoading } = useQuery({
    queryKey: ['countries'],
    queryFn: subscriptionApi.getCountries,
    enabled: showServerManagement && !!subscription && !subscription.is_trial,
  })

  // Initialize selected servers when data loads
  useEffect(() => {
    if (countriesData && showServerManagement) {
      const connected = countriesData.countries.filter(c => c.is_connected).map(c => c.uuid)
      setSelectedServersToUpdate(connected)
    }
  }, [countriesData, showServerManagement])

  // Countries update mutation
  const updateCountriesMutation = useMutation({
    mutationFn: (countries: string[]) => subscriptionApi.updateCountries(countries),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
      queryClient.invalidateQueries({ queryKey: ['countries'] })
      setShowServerManagement(false)
    },
  })

  // Auto-scroll to switch tariff modal when it appears
  useEffect(() => {
    if (switchTariffId && switchModalRef.current) {
      const timer = setTimeout(() => {
        switchModalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [switchTariffId])

  // Auto-scroll to tariff purchase form when it appears
  useEffect(() => {
    if (showTariffPurchase && tariffPurchaseRef.current) {
      const timer = setTimeout(() => {
        tariffPurchaseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [showTariffPurchase])

  // Auto-scroll to tariffs section when coming from Dashboard "Продлить" button
  useEffect(() => {
    const state = location.state as { scrollToExtend?: boolean } | null
    if (state?.scrollToExtend && tariffsCardRef.current) {
      const timer = setTimeout(() => {
        tariffsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      // Clear the state to prevent re-scrolling on subsequent renders
      window.history.replaceState({}, document.title)
      return () => clearTimeout(timer)
    }
  }, [location.state])

  const copyUrl = () => {
    if (subscription?.subscription_url) {
      navigator.clipboard.writeText(subscription.subscription_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getTrafficColor = (percent: number) => {
    if (percent > 90) return 'bg-error-500'
    if (percent > 70) return 'bg-warning-500'
    return 'bg-success-500'
  }

  const toggleServer = (uuid: string) => {
    if (selectedServers.includes(uuid)) {
      if (selectedServers.length > 1) {
        setSelectedServers(selectedServers.filter(s => s !== uuid))
      }
    } else {
      setSelectedServers([...selectedServers, uuid])
    }
  }

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex])
    }
  }

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex])
    }
  }

  const resetPurchase = () => {
    setShowPurchaseForm(false)
    setCurrentStep('period')
  }

  const getStepLabel = (step: PurchaseStep) => {
    switch (step) {
      case 'period': return t('subscription.stepPeriod')
      case 'traffic': return t('subscription.stepTraffic')
      case 'servers': return t('subscription.stepServers')
      case 'devices': return t('subscription.stepDevices')
      case 'confirm': return t('subscription.stepConfirm')
    }
  }

  if (isLoading || optionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('subscription.title')}</h1>

      {/* Current Subscription */}
      {subscription ? (
        <div className="bento-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('subscription.currentPlan')}</h2>
              {subscription.tariff_name && (
                <div className="text-sm text-accent-400 mt-1">{subscription.tariff_name}</div>
              )}
            </div>
            <span className={subscription.is_active ? (subscription.is_trial ? 'badge-warning' : 'badge-success') : 'badge-error'}>
              {subscription.is_trial ? t('subscription.trialStatus') : subscription.is_active ? t('subscription.active') : t('subscription.expired')}
            </span>
          </div>

          {/* Connection Data - Top Priority */}
          {subscription.subscription_url && (
            <div className="mb-6 p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl">
              <div className="text-dark-100 font-medium mb-3">{t('subscription.connectionInfo')}</div>

              {/* Get Config Button */}
              <button
                onClick={() => setShowConnectionModal(true)}
                className="btn-primary w-full py-3 mb-3 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {t('subscription.getConfig')}
              </button>

              {/* Subscription URL */}
              <div className="flex gap-2">
                <code className="flex-1 bg-dark-900/50 border border-dark-700/50 px-3 py-2 rounded-lg text-xs text-dark-300 overflow-x-auto scrollbar-hide break-all">
                  {subscription.subscription_url}
                </code>
                <button
                  onClick={copyUrl}
                  className={`btn-secondary px-3 ${copied ? 'text-success-400 border-success-500/30' : ''}`}
                  title={t('subscription.copyLink')}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.daysLeft')}</div>
              <div className="text-xl font-semibold text-dark-100">
                {subscription.days_left > 0 ? (
                  `${subscription.days_left} ${t('subscription.days')}`
                ) : subscription.hours_left > 0 ? (
                  `${subscription.hours_left}${t('subscription.hours')} ${subscription.minutes_left}${t('subscription.minutes')}`
                ) : subscription.minutes_left > 0 ? (
                  `${subscription.minutes_left}${t('subscription.minutes')}`
                ) : (
                  <span className="text-error-400">{t('subscription.expired')}</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.expiresAt')}</div>
              <div className="text-xl font-semibold text-dark-100">
                {new Date(subscription.end_date).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.traffic')}</div>
              <div className="text-xl font-semibold text-dark-100">
                {subscription.traffic_used_gb.toFixed(1)} / {subscription.traffic_limit_gb || '∞'} GB
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-500 mb-1">{t('subscription.devices')}</div>
              <div className="text-xl font-semibold text-dark-100">{subscription.device_limit}</div>
            </div>
          </div>

          {/* Servers */}
          {subscription.servers && subscription.servers.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-dark-500 mb-2">{t('subscription.servers')}</div>
              <div className="flex flex-wrap gap-2">
                {subscription.servers.map((server) => (
                  <span
                    key={server.uuid}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/50 text-sm text-dark-200"
                  >
                    {server.country_code && (
                      <span className="text-base">{getFlagEmoji(server.country_code)}</span>
                    )}
                    {server.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Traffic Usage */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-dark-400">{t('subscription.trafficUsed')}</span>
                <span className="text-dark-300">{subscription.traffic_used_percent.toFixed(1)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${getTrafficColor(subscription.traffic_used_percent)}`}
                  style={{ width: `${Math.min(subscription.traffic_used_percent, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Purchased Traffic Packages */}
          {subscription.traffic_purchases && subscription.traffic_purchases.length > 0 && (
            <div className="mb-6">
              <div className="text-sm text-dark-500 mb-3">{t('subscription.purchasedTraffic')}</div>
              <div className="space-y-3">
                {subscription.traffic_purchases.map((purchase) => (
                  <div key={purchase.id} className="p-3 rounded-lg bg-dark-800/50 border border-dark-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-base font-semibold text-dark-100">{purchase.traffic_gb} ГБ</span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm text-dark-400">
                          {purchase.days_remaining === 0 ? (
                            <span className="text-orange-500">Истекает сегодня</span>
                          ) : purchase.days_remaining === 1 ? (
                            <span className="text-orange-400">Остался 1 день</span>
                          ) : (
                            <span>Осталось {purchase.days_remaining} {purchase.days_remaining >= 5 ? 'дней' : purchase.days_remaining === 1 ? 'день' : 'дня'}</span>
                          )}
                        </div>
                        <div className="text-xs text-dark-500 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{t('subscription.trafficResetAt', 'Сброс')}: {new Date(purchase.expires_at).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="relative h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-0 bg-gradient-to-r from-accent-500 to-accent-600 transition-all duration-300"
                        style={{ width: `${purchase.progress_percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-dark-500 mt-1">
                      <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                      <span>{new Date(purchase.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Autopay Toggle - hide for daily tariffs */}
          {!subscription.is_trial && !subscription.is_daily && (
            <div className="flex items-center justify-between py-4 border-t border-dark-800/50">
              <div>
                <div className="text-dark-100 font-medium">{t('subscription.autoRenewal')}</div>
                <div className="text-sm text-dark-500">
                  {subscription.autopay_days_before} {t('subscription.daysBeforeExpiry')}
                </div>
              </div>
              <button
                onClick={() => autopayMutation.mutate(!subscription.autopay_enabled)}
                disabled={autopayMutation.isPending}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  subscription.autopay_enabled ? 'bg-accent-500' : 'bg-dark-700'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    subscription.autopay_enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div className="text-dark-400 mb-4">{t('subscription.noSubscription')}</div>
        </div>
      )}

      {/* Daily Subscription Pause */}
      {subscription && subscription.is_daily && !subscription.is_trial && (
        <div className="bento-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('subscription.pause.title')}</h2>
              <div className="text-sm text-dark-400 mt-1">
                {subscription.is_daily_paused ? t('subscription.pause.paused') : t('subscription.pause.active')}
              </div>
            </div>
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                subscription.is_daily_paused
                  ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                  : 'bg-warning-500/20 text-warning-400 hover:bg-warning-500/30'
              }`}
            >
              {pauseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                </span>
              ) : subscription.is_daily_paused ? (
                t('subscription.pause.resumeBtn')
              ) : (
                t('subscription.pause.pauseBtn')
              )}
            </button>
          </div>

          {/* Pause mutation error */}
          {pauseMutation.isError && (
            <div className="mt-4 text-sm text-error-400 bg-error-500/10 px-4 py-3 rounded-lg text-center">
              {getErrorMessage(pauseMutation.error)}
            </div>
          )}

          {/* Paused info or Next charge progress bar */}
          {subscription.is_daily_paused ? (
            <div className="mt-4 pt-4 border-t border-dark-800/50">
              <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-warning-400 text-xl">⏸️</div>
                  <div>
                    <div className="text-warning-300 font-medium">{t('subscription.pause.pausedInfo')}</div>
                    <div className="text-sm text-dark-400 mt-1">
                      {t('subscription.pause.pausedDescription')} {new Date(subscription.end_date).toLocaleDateString()} ({subscription.days_left} {
                        subscription.days_left === 1
                          ? t('subscription.pause.days_one')
                          : subscription.days_left < 5
                            ? t('subscription.pause.days_few')
                            : t('subscription.pause.days_many')
                      })
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : subscription.next_daily_charge_at && (() => {
            const now = new Date()
            // Backend returns UTC datetime, ensure it's parsed as UTC
            const nextChargeStr = subscription.next_daily_charge_at.endsWith('Z')
              ? subscription.next_daily_charge_at
              : subscription.next_daily_charge_at + 'Z'
            const nextCharge = new Date(nextChargeStr)
            const totalMs = 24 * 60 * 60 * 1000 // 24 hours in ms
            const remainingMs = Math.max(0, nextCharge.getTime() - now.getTime())
            const elapsedMs = totalMs - remainingMs
            const progress = Math.min(100, (elapsedMs / totalMs) * 100)

            const hours = Math.floor(remainingMs / (1000 * 60 * 60))
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60))

            return (
              <div className="mt-4 pt-4 border-t border-dark-800/50">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-dark-400">{t('subscription.pause.nextCharge')}</span>
                  <span className="text-dark-200 font-medium">
                    {hours > 0 ? `${hours}${t('subscription.pause.hours')} ${minutes}${t('subscription.pause.minutes')}` : `${minutes}${t('subscription.pause.minutes')}`}
                  </span>
                </div>
                <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent-500 to-accent-400 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {subscription.daily_price_kopeks && (
                  <div className="text-xs text-dark-500 mt-2 text-center">
                    {t('subscription.pause.willBeCharged')}: {formatPrice(subscription.daily_price_kopeks)}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Additional Options (Buy Devices) */}
      {subscription && subscription.is_active && !subscription.is_trial && (
        <div className="bento-card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">Дополнительные опции</h2>

          {/* Buy Devices */}
          {!showDeviceTopup ? (
            <button
              onClick={() => setShowDeviceTopup(true)}
              className="w-full p-4 rounded-xl bg-dark-800/30 border border-dark-700/50 text-left hover:border-dark-600 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-dark-100">Докупить устройства</div>
                  <div className="text-sm text-dark-400 mt-1">
                    Текущий лимит: {subscription.device_limit} устройств
                  </div>
                </div>
                <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ) : (
            <div className="bg-dark-800/30 rounded-xl p-5 border border-dark-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-dark-100">Докупить устройства</h3>
                <button
                  onClick={() => setShowDeviceTopup(false)}
                  className="text-dark-400 hover:text-dark-200 text-sm"
                >
                  ✕
                </button>
              </div>

              {devicePriceData?.available === false ? (
                <div className="text-sm text-dark-400 text-center py-4">
                  {devicePriceData.reason || 'Докупка устройств недоступна'}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-6">
                    <button
                      onClick={() => setDevicesToAdd(Math.max(1, devicesToAdd - 1))}
                      disabled={devicesToAdd <= 1}
                      className="btn-secondary w-12 h-12 !p-0 flex items-center justify-center text-2xl"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-dark-100">{devicesToAdd}</div>
                      <div className="text-dark-500 text-sm">устройств</div>
                    </div>
                    <button
                      onClick={() => setDevicesToAdd(devicesToAdd + 1)}
                      className="btn-secondary w-12 h-12 !p-0 flex items-center justify-center text-2xl"
                    >
                      +
                    </button>
                  </div>

                  {devicePriceData && (
                    <div className="text-center">
                      <div className="text-sm text-dark-400 mb-2">
                        {devicePriceData.price_per_device_label}/устройство (пропорционально {devicePriceData.days_left} дням)
                      </div>
                      <div className="text-2xl font-bold text-accent-400">
                        {devicePriceData.total_price_label}
                      </div>
                    </div>
                  )}

                  {devicePriceData && purchaseOptions && devicePriceData.total_price_kopeks && devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks && (
                    <InsufficientBalancePrompt
                      missingAmountKopeks={devicePriceData.total_price_kopeks - purchaseOptions.balance_kopeks}
                      compact
                    />
                  )}

                  <button
                    onClick={() => devicePurchaseMutation.mutate()}
                    disabled={devicePurchaseMutation.isPending || !!(devicePriceData?.total_price_kopeks && purchaseOptions && devicePriceData.total_price_kopeks > purchaseOptions.balance_kopeks)}
                    className="btn-primary w-full py-3"
                  >
                    {devicePurchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      </span>
                    ) : (
                      'Купить'
                    )}
                  </button>

                  {devicePurchaseMutation.isError && (
                    <div className="text-sm text-error-400 text-center">
                      {getErrorMessage(devicePurchaseMutation.error)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Buy Traffic */}
          {subscription.traffic_limit_gb > 0 && (
            <div className="mt-4">
              {!showTrafficTopup ? (
                <button
                  onClick={() => setShowTrafficTopup(true)}
                  className="w-full p-4 rounded-xl bg-dark-800/30 border border-dark-700/50 text-left hover:border-dark-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dark-100">Докупить трафик</div>
                      <div className="text-sm text-dark-400 mt-1">
                        Текущий лимит: {subscription.traffic_limit_gb} ГБ (использовано {subscription.traffic_used_gb.toFixed(1)} ГБ)
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ) : (
                <div className="bg-dark-800/30 rounded-xl p-5 border border-dark-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-dark-100">Докупить трафик</h3>
                    <button
                      onClick={() => {
                        setShowTrafficTopup(false)
                        setSelectedTrafficPackage(null)
                      }}
                      className="text-dark-400 hover:text-dark-200 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs text-dark-500 mb-4 p-2 bg-dark-700/30 rounded-lg">
                    ⚠️ Докупленный трафик добавляется к текущему лимиту и не переносится на следующий период
                  </div>

                  {!trafficPackages || trafficPackages.length === 0 ? (
                    <div className="text-sm text-dark-400 text-center py-4">
                      Докупка трафика недоступна для вашего тарифа
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {trafficPackages.map((pkg) => (
                          <button
                            key={pkg.gb}
                            onClick={() => setSelectedTrafficPackage(pkg.gb)}
                            className={`p-4 rounded-xl border text-center transition-all ${
                              selectedTrafficPackage === pkg.gb
                                ? 'border-accent-500 bg-accent-500/10'
                                : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                            }`}
                          >
                            <div className="text-lg font-semibold text-dark-100">
                              {pkg.is_unlimited ? '♾️ Безлимит' : `${pkg.gb} ГБ`}
                            </div>
                            <div className="text-accent-400 font-medium">
                              {formatPrice(pkg.price_kopeks)}
                            </div>
                          </button>
                        ))}
                      </div>

                      {selectedTrafficPackage && (() => {
                        const selectedPkg = trafficPackages.find(p => p.gb === selectedTrafficPackage)
                        const hasEnoughBalance = !selectedPkg || !purchaseOptions || selectedPkg.price_kopeks <= purchaseOptions.balance_kopeks
                        const missingAmount = selectedPkg && purchaseOptions ? selectedPkg.price_kopeks - purchaseOptions.balance_kopeks : 0

                        return (
                          <>
                            {!hasEnoughBalance && missingAmount > 0 && (
                              <InsufficientBalancePrompt
                                missingAmountKopeks={missingAmount}
                                compact
                                className="mb-3"
                              />
                            )}
                            <button
                              onClick={() => trafficPurchaseMutation.mutate(selectedTrafficPackage)}
                              disabled={trafficPurchaseMutation.isPending || !hasEnoughBalance}
                              className="btn-primary w-full py-3"
                            >
                              {trafficPurchaseMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </span>
                              ) : (
                                `Купить ${selectedTrafficPackage} ГБ`
                              )}
                            </button>
                          </>
                        )
                      })()}

                      {trafficPurchaseMutation.isError && (
                        <div className="text-sm text-error-400 text-center">
                          {getErrorMessage(trafficPurchaseMutation.error)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Server Management - only in classic mode */}
          {!isTariffsMode && (
            <div className="mt-4">
              {!showServerManagement ? (
              <button
                onClick={() => setShowServerManagement(true)}
                className="w-full p-4 rounded-xl bg-dark-800/30 border border-dark-700/50 text-left hover:border-dark-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-dark-100">Управление серверами</div>
                    <div className="text-sm text-dark-400 mt-1">
                      Подключено серверов: {subscription.servers?.length || 0}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ) : (
              <div className="bg-dark-800/30 rounded-xl p-5 border border-dark-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-dark-100">Управление серверами</h3>
                  <button
                    onClick={() => {
                      setShowServerManagement(false)
                      setSelectedServersToUpdate([])
                    }}
                    className="text-dark-400 hover:text-dark-200 text-sm"
                  >
                    ✕
                  </button>
                </div>

                {countriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : countriesData && countriesData.countries.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-xs text-dark-500 p-2 bg-dark-700/30 rounded-lg">
                      ✅ — подключено  •  ➕ — будет добавлено (платно)  •  ➖ — будет отключено
                    </div>

                    {countriesData.discount_percent > 0 && (
                      <div className="text-xs text-success-400 p-2 bg-success-500/10 rounded-lg border border-success-500/30">
                        🎁 Ваша скидка на серверы: -{countriesData.discount_percent}%
                      </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {countriesData.countries.map((country) => {
                        const isCurrentlyConnected = country.is_connected
                        const isSelected = selectedServersToUpdate.includes(country.uuid)
                        const willBeAdded = !isCurrentlyConnected && isSelected
                        const willBeRemoved = isCurrentlyConnected && !isSelected

                        return (
                          <button
                            key={country.uuid}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedServersToUpdate(prev => prev.filter(u => u !== country.uuid))
                              } else {
                                setSelectedServersToUpdate(prev => [...prev, country.uuid])
                              }
                            }}
                            disabled={!country.is_available && !isCurrentlyConnected}
                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                              isSelected
                                ? willBeAdded
                                  ? 'border-success-500 bg-success-500/10'
                                  : 'border-accent-500 bg-accent-500/10'
                                : willBeRemoved
                                  ? 'border-error-500/50 bg-error-500/5'
                                  : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                            } ${!country.is_available && !isCurrentlyConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg">
                                {willBeAdded ? '➕' : willBeRemoved ? '➖' : isSelected ? '✅' : '⚪'}
                              </span>
                              <div>
                                <div className="font-medium text-dark-100 flex items-center gap-2">
                                  {country.name}
                                  {country.has_discount && !isCurrentlyConnected && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-success-500/20 text-success-400">
                                      -{country.discount_percent}%
                                    </span>
                                  )}
                                </div>
                                {willBeAdded && (
                                  <div className="text-xs text-success-400">
                                    +{formatPrice(country.price_kopeks)} (за {countriesData.days_left} дн.)
                                    {country.has_discount && (
                                      <span className="ml-1 line-through text-dark-500">
                                        {formatPrice(Math.round(country.base_price_kopeks * countriesData.days_left / 30))}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!willBeAdded && !isCurrentlyConnected && (
                                  <div className="text-xs text-dark-500">
                                    {formatPrice(country.price_per_month_kopeks)}/мес
                                    {country.has_discount && (
                                      <span className="ml-1 line-through text-dark-600">
                                        {formatPrice(country.base_price_kopeks)}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!country.is_available && !isCurrentlyConnected && (
                                  <div className="text-xs text-dark-500">Недоступен</div>
                                )}
                              </div>
                            </div>
                            {country.country_code && (
                              <span className="text-xl">{getFlagEmoji(country.country_code)}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {(() => {
                      const currentConnected = countriesData.countries.filter(c => c.is_connected).map(c => c.uuid)
                      const added = selectedServersToUpdate.filter(u => !currentConnected.includes(u))
                      const removed = currentConnected.filter(u => !selectedServersToUpdate.includes(u))
                      const hasChanges = added.length > 0 || removed.length > 0

                      // Calculate cost for added servers
                      const addedServers = countriesData.countries.filter(c => added.includes(c.uuid))
                      const totalCost = addedServers.reduce((sum, s) => sum + s.price_kopeks, 0)
                      const hasEnoughBalance = !purchaseOptions || totalCost <= purchaseOptions.balance_kopeks
                      const missingAmount = purchaseOptions ? totalCost - purchaseOptions.balance_kopeks : 0

                      return hasChanges ? (
                        <div className="space-y-3 pt-3 border-t border-dark-700/50">
                          {added.length > 0 && (
                            <div className="text-sm">
                              <span className="text-success-400">Добавить:</span>{' '}
                              <span className="text-dark-300">
                                {addedServers.map(s => s.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {removed.length > 0 && (
                            <div className="text-sm">
                              <span className="text-error-400">Отключить:</span>{' '}
                              <span className="text-dark-300">
                                {countriesData.countries.filter(c => removed.includes(c.uuid)).map(s => s.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {totalCost > 0 && (
                            <div className="text-center">
                              <div className="text-sm text-dark-400">К оплате (пропорционально оставшимся дням):</div>
                              <div className="text-xl font-bold text-accent-400">{formatPrice(totalCost)}</div>
                            </div>
                          )}

                          {totalCost > 0 && !hasEnoughBalance && missingAmount > 0 && (
                            <InsufficientBalancePrompt
                              missingAmountKopeks={missingAmount}
                              compact
                            />
                          )}

                          <button
                            onClick={() => updateCountriesMutation.mutate(selectedServersToUpdate)}
                            disabled={updateCountriesMutation.isPending || selectedServersToUpdate.length === 0 || (totalCost > 0 && !hasEnoughBalance)}
                            className="btn-primary w-full py-3"
                          >
                            {updateCountriesMutation.isPending ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              </span>
                            ) : (
                              'Применить изменения'
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-dark-500 text-center py-2">
                          Выберите серверы для подключения или отключения
                        </div>
                      )
                    })()}

                    {updateCountriesMutation.isError && (
                      <div className="text-sm text-error-400 text-center">
                        {getErrorMessage(updateCountriesMutation.error)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-dark-400 text-center py-4">
                    Нет доступных серверов для управления
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* My Devices Section */}
      {subscription && (
        <div className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">{t('subscription.myDevices')}</h2>
            {devicesData && devicesData.devices.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(t('subscription.confirmDeleteAllDevices'))) {
                    deleteAllDevicesMutation.mutate()
                  }
                }}
                disabled={deleteAllDevicesMutation.isPending}
                className="text-sm text-error-400 hover:text-error-300"
              >
                {t('subscription.deleteAllDevices')}
              </button>
            )}
          </div>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : devicesData && devicesData.devices.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-dark-400 mb-2">
                {devicesData.total} / {devicesData.device_limit} {t('subscription.devices')}
              </div>
              {devicesData.devices.map((device) => (
                <div
                  key={device.hwid}
                  className="flex items-center justify-between p-4 rounded-xl bg-dark-800/30 border border-dark-700/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                      <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-dark-100">{device.device_model || device.platform}</div>
                      <div className="text-sm text-dark-500">{device.platform}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(t('subscription.confirmDeleteDevice'))) {
                        deleteDeviceMutation.mutate(device.hwid)
                      }
                    }}
                    disabled={deleteDeviceMutation.isPending}
                    className="p-2 text-dark-400 hover:text-error-400 transition-colors"
                    title={t('subscription.deleteDevice')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-dark-400">
              {t('subscription.noDevices')}
            </div>
          )}
        </div>
      )}

      {/* Tariffs Section - Combined Purchase/Extend/Switch like MiniApp */}
      {isTariffsMode && tariffs.length > 0 && (
        <div ref={tariffsCardRef} className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">
              {subscription?.is_daily && !subscription?.is_trial
                ? t('subscription.switchTariff.title')
                : subscription && !subscription.is_trial
                  ? t('subscription.extend')
                  : t('subscription.getSubscription')}
            </h2>
          </div>

          {/* Legacy subscription notice - if user has subscription without tariff */}
          {subscription && !subscription.is_trial && !subscription.tariff_id && (
            <div className="mb-6 p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl">
              <div className="text-accent-400 font-medium mb-2">📦 Выберите тариф для продления</div>
              <div className="text-sm text-dark-300">
                Ваша текущая подписка была создана до введения тарифов.
                Для продления необходимо выбрать один из доступных тарифов.
              </div>
              <div className="text-xs text-dark-500 mt-2">
                ⚠️ Ваша текущая подписка продолжит действовать до окончания срока.
              </div>
            </div>
          )}

          {/* Switch Tariff Preview Modal */}
          {switchTariffId && (
            <div ref={switchModalRef} className="mb-6 bg-dark-800/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-dark-100">{t('subscription.switchTariff.title')}</h3>
                <button
                  onClick={() => setSwitchTariffId(null)}
                  className="text-dark-400 hover:text-dark-200 text-sm"
                >
                  ✕
                </button>
              </div>

              {switchPreviewLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : switchPreview && (() => {
                // Find the target tariff to get daily price info
                const targetTariff = tariffs.find(t => t.id === switchTariffId)
                const dailyPrice = targetTariff?.daily_price_kopeks ?? targetTariff?.price_per_day_kopeks ?? 0
                const isDailyTariff = dailyPrice > 0

                return (
                  <>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-dark-300">
                        <span>{t('subscription.switchTariff.currentTariff')}</span>
                        <span className="font-medium text-dark-100">{switchPreview.current_tariff_name || '-'}</span>
                      </div>
                      <div className="flex justify-between text-dark-300">
                        <span>{t('subscription.switchTariff.newTariff')}</span>
                        <span className="font-medium text-accent-400">{switchPreview.new_tariff_name}</span>
                      </div>
                      <div className="flex justify-between text-dark-300">
                        <span>{t('subscription.switchTariff.remainingDays')}</span>
                        <span>{switchPreview.remaining_days}</span>
                      </div>
                    </div>

                    {/* Daily tariff info */}
                    {isDailyTariff && (
                      <div className="bg-accent-500/10 border border-accent-500/30 rounded-lg p-3 text-center">
                        <div className="text-sm text-dark-300">Оплата за день</div>
                        <div className="text-lg font-bold text-accent-400">
                          {formatPrice(dailyPrice)}
                        </div>
                        <div className="text-xs text-dark-400 mt-1">
                          Списывается ежедневно с баланса
                        </div>
                      </div>
                    )}

                    <div className="border-t border-dark-700/50 pt-3 flex justify-between items-center">
                      <span className="font-medium text-dark-100">{t('subscription.switchTariff.upgradeCost')}</span>
                      <span className="text-lg font-bold text-accent-400">
                        {switchPreview.upgrade_cost_kopeks > 0 ? switchPreview.upgrade_cost_label : t('subscription.switchTariff.free')}
                      </span>
                    </div>

                    {!switchPreview.has_enough_balance && switchPreview.upgrade_cost_kopeks > 0 && (
                      <InsufficientBalancePrompt
                        missingAmountKopeks={switchPreview.missing_amount_kopeks}
                        compact
                      />
                    )}

                    <button
                      onClick={() => switchTariffMutation.mutate(switchTariffId)}
                      disabled={switchTariffMutation.isPending || !switchPreview.can_switch}
                      className="btn-primary w-full py-2.5"
                    >
                      {switchTariffMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </span>
                      ) : (
                        t('subscription.switchTariff.switch')
                      )}
                    </button>
                  </>
                )
              })()}
            </div>
          )}

          {!showTariffPurchase ? (
            <>
            {/* Promo group discount banner */}
            {tariffs.some(t => t.promo_group_name) && (
              <div className="mb-4 p-3 bg-success-500/10 border border-success-500/30 rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 bg-success-500/20 rounded-lg flex items-center justify-center text-success-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-success-400">
                    Ваша группа: {tariffs.find(t => t.promo_group_name)?.promo_group_name}
                  </div>
                  <div className="text-xs text-dark-400">Персональные скидки применены к ценам</div>
                </div>
              </div>
            )}
            {/* Tariff List - current tariff first */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...tariffs]
                // Hide Trial tariffs for users who already have trial subscription
                .filter((tariff) => {
                  if (subscription?.is_trial && tariff.name.toLowerCase().includes('trial')) {
                    return false
                  }
                  return true
                })
                .sort((a, b) => {
                  const aIsCurrent = a.is_current || a.id === subscription?.tariff_id
                  const bIsCurrent = b.is_current || b.id === subscription?.tariff_id
                  if (aIsCurrent && !bIsCurrent) return -1
                  if (!aIsCurrent && bIsCurrent) return 1
                  return 0
                })
                .map((tariff) => {
                const isCurrentTariff = tariff.is_current || tariff.id === subscription?.tariff_id
                const canSwitch = subscription && subscription.tariff_id && !isCurrentTariff && !subscription.is_trial
                // Если есть подписка БЕЗ tariff_id (классическая) - разрешить выбрать тариф
                const isLegacySubscription = subscription && !subscription.is_trial && !subscription.tariff_id

                return (
                  <div
                    key={tariff.id}
                    className={`bento-card-hover p-5 text-left transition-all ${
                      isCurrentTariff
                        ? 'bento-card-glow border-accent-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-lg font-semibold text-dark-100">{tariff.name}</div>
                        {tariff.description && (
                          <div className="text-sm text-dark-400 mt-1">{tariff.description}</div>
                        )}
                      </div>
                      {isCurrentTariff && (
                        <span className="badge-success text-xs">{t('subscription.currentTariff')}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-dark-300">
                      <span className="flex items-center gap-1">
                        <span className="text-accent-400">{tariff.traffic_limit_label}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-dark-400">{tariff.device_limit} {t('subscription.devices')}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-dark-400">{tariff.servers_count} {t('subscription.servers')}</span>
                      </span>
                    </div>
                    {/* Price info - daily or period-based */}
                    <div className="mt-3 pt-3 border-t border-dark-700/50 text-sm text-dark-400">
                      {(() => {
                        // Daily tariff price (is_daily + daily_price_kopeks)
                        const dailyPrice = tariff.daily_price_kopeks ?? tariff.price_per_day_kopeks ?? 0
                        const originalDailyPrice = tariff.original_daily_price_kopeks || 0
                        const hasExistingDailyDiscount = originalDailyPrice > dailyPrice
                        if (dailyPrice > 0) {
                          // Apply promo discount if no existing discount
                          const promoDaily = applyPromoDiscount(dailyPrice, hasExistingDailyDiscount)
                          return (
                            <span className="flex items-center gap-2">
                              <span className="text-accent-400 font-medium">{formatPrice(promoDaily.price)}</span>
                              {/* Show original price from promo group or promo offer */}
                              {(hasExistingDailyDiscount || promoDaily.original) && (
                                <span className="text-dark-500 text-xs line-through">
                                  {formatPrice(hasExistingDailyDiscount ? originalDailyPrice : promoDaily.original!)}
                                </span>
                              )}
                              <span>/ день</span>
                              {/* Show discount badge */}
                              {(tariff.daily_discount_percent && tariff.daily_discount_percent > 0) ? (
                                <span className="px-1.5 py-0.5 bg-success-500/20 text-success-400 text-xs rounded">-{tariff.daily_discount_percent}%</span>
                              ) : promoDaily.percent && (
                                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">-{promoDaily.percent}%</span>
                              )}
                            </span>
                          )
                        }
                        // Period-based price
                        if (tariff.periods.length > 0) {
                          const firstPeriod = tariff.periods[0]
                          const hasExistingDiscount = !!(firstPeriod?.original_price_kopeks && firstPeriod.original_price_kopeks > firstPeriod.price_kopeks)
                          // Apply promo discount if no existing discount
                          const promoPeriod = applyPromoDiscount(firstPeriod?.price_kopeks || 0, hasExistingDiscount)
                          return (
                            <span className="flex items-center gap-2 flex-wrap">
                              <span>{t('subscription.from')}</span>
                              <span className="text-accent-400 font-medium">{formatPrice(promoPeriod.price)}</span>
                              {/* Show original price from promo group or promo offer */}
                              {(hasExistingDiscount || promoPeriod.original) && (
                                <span className="text-dark-500 text-xs line-through">
                                  {formatPrice(hasExistingDiscount ? firstPeriod.original_price_kopeks! : promoPeriod.original!)}
                                </span>
                              )}
                              {/* Show discount badge */}
                              {hasExistingDiscount && firstPeriod.discount_percent ? (
                                <span className="px-1.5 py-0.5 bg-success-500/20 text-success-400 text-xs rounded">-{firstPeriod.discount_percent}%</span>
                              ) : promoPeriod.percent && (
                                <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">-{promoPeriod.percent}%</span>
                              )}
                            </span>
                          )
                        }
                        // Fallback
                        return <span className="text-accent-400 font-medium">Гибкая оплата</span>
                      })()}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      {isCurrentTariff ? (
                        /* Current tariff - extend button (hide for daily tariffs) */
                        subscription?.is_daily ? (
                          <div className="flex-1 py-2 text-sm text-center text-dark-500">
                            {t('subscription.currentTariff')}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedTariff(tariff)
                              setSelectedTariffPeriod(tariff.periods[0] || null)
                              setShowTariffPurchase(true)
                            }}
                            className="btn-primary flex-1 py-2 text-sm"
                          >
                            {t('subscription.extend')}
                          </button>
                        )
                      ) : isLegacySubscription ? (
                        /* Legacy subscription without tariff - allow selecting tariff for renewal */
                        <button
                          onClick={() => {
                            setSelectedTariff(tariff)
                            setSelectedTariffPeriod(tariff.periods[0] || null)
                            setShowTariffPurchase(true)
                          }}
                          className="btn-primary flex-1 py-2 text-sm"
                        >
                          Выбрать для продления
                        </button>
                      ) : canSwitch ? (
                        /* Other tariffs with existing tariff - switch button */
                        <button
                          onClick={() => setSwitchTariffId(tariff.id)}
                          className="btn-secondary flex-1 py-2 text-sm"
                        >
                          {t('subscription.switchTariff.switch')}
                        </button>
                      ) : (
                        /* No subscription or trial - purchase button */
                        <button
                          onClick={() => {
                            setSelectedTariff(tariff)
                            setSelectedTariffPeriod(tariff.periods[0] || null)
                            setShowTariffPurchase(true)
                          }}
                          className="btn-primary flex-1 py-2 text-sm"
                        >
                          {t('subscription.purchase')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            </>
          ) : selectedTariff && (
            /* Tariff Purchase Form */
            <div ref={tariffPurchaseRef} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-dark-100">{selectedTariff.name}</h3>
                <button
                  onClick={() => {
                    setShowTariffPurchase(false)
                    setSelectedTariff(null)
                    setSelectedTariffPeriod(null)
                  }}
                  className="text-dark-400 hover:text-dark-200"
                >
                  ← {t('common.back')}
                </button>
              </div>

              {/* Tariff Info */}
              <div className="bg-dark-800/30 rounded-xl p-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-dark-500">{t('subscription.traffic')}:</span>
                    <span className="ml-2 text-dark-200">{selectedTariff.traffic_limit_label}</span>
                  </div>
                  <div>
                    <span className="text-dark-500">{t('subscription.devices')}:</span>
                    <span className="ml-2 text-dark-200">{selectedTariff.device_limit}</span>
                  </div>
                  <div>
                    <span className="text-dark-500">{t('subscription.servers')}:</span>
                    <span className="ml-2 text-dark-200">{selectedTariff.servers_count}</span>
                  </div>
                </div>
                {selectedTariff.servers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTariff.servers.map((server) => (
                      <span key={server.uuid} className="badge-secondary">{server.name}</span>
                    ))}
                    {selectedTariff.servers_count > selectedTariff.servers.length && (
                      <span className="text-dark-500 text-sm">+{selectedTariff.servers_count - selectedTariff.servers.length}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Daily Tariff Purchase */}
              {(selectedTariff.is_daily || (selectedTariff.daily_price_kopeks && selectedTariff.daily_price_kopeks > 0)) ? (
                <div className="bg-accent-500/10 border border-accent-500/30 rounded-xl p-5">
                  <div className="text-center mb-4">
                    <div className="text-dark-400 text-sm mb-2">{t('subscription.dailyPurchase.costPerDay')}</div>
                    <div className="text-3xl font-bold text-accent-400">
                      {formatPrice(selectedTariff.daily_price_kopeks || 0)}
                    </div>
                  </div>
                  <div className="text-sm text-dark-400 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-accent-400">•</span>
                      <span>{t('subscription.dailyPurchase.chargedDaily')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-accent-400">•</span>
                      <span>{t('subscription.dailyPurchase.canPause')}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-accent-400">•</span>
                      <span>{t('subscription.dailyPurchase.pausedOnLowBalance')}</span>
                    </div>
                  </div>

                  {/* Purchase button for daily tariff */}
                  {(() => {
                    const dailyPrice = selectedTariff.daily_price_kopeks || 0
                    const hasEnoughBalance = purchaseOptions && dailyPrice <= purchaseOptions.balance_kopeks

                    return (
                      <div className="mt-6">
                        {purchaseOptions && !hasEnoughBalance && (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={dailyPrice - purchaseOptions.balance_kopeks}
                            compact
                            className="mb-4"
                          />
                        )}

                        <button
                          onClick={() => tariffPurchaseMutation.mutate()}
                          disabled={tariffPurchaseMutation.isPending || !hasEnoughBalance}
                          className="btn-primary w-full py-3"
                        >
                          {tariffPurchaseMutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('common.loading')}
                            </span>
                          ) : (
                            t('subscription.dailyPurchase.activate', { price: formatPrice(dailyPrice) })
                          )}
                        </button>

                        {tariffPurchaseMutation.isError && (
                          <div className="text-sm text-error-400 text-center mt-3">
                            {getErrorMessage(tariffPurchaseMutation.error)}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
              <>
              {/* Period Selection for non-daily tariffs */}
              <div>
                <div className="text-sm text-dark-400 mb-3">{t('subscription.selectPeriod')}</div>

                {/* Fixed periods */}
                {selectedTariff.periods.length > 0 && !useCustomDays && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {selectedTariff.periods.map((period) => {
                      const hasExistingDiscount = !!(period.original_price_kopeks && period.original_price_kopeks > period.price_kopeks)
                      const promoPeriod = applyPromoDiscount(period.price_kopeks, hasExistingDiscount)
                      const displayDiscount = hasExistingDiscount ? period.discount_percent : promoPeriod.percent
                      const displayOriginal = hasExistingDiscount ? period.original_price_kopeks : promoPeriod.original
                      const displayPrice = promoPeriod.price
                      const displayPerMonth = hasExistingDiscount
                        ? period.price_per_month_kopeks
                        : Math.round(promoPeriod.price / (period.days / 30))

                      return (
                        <button
                          key={period.days}
                          onClick={() => {
                            setSelectedTariffPeriod(period)
                            setUseCustomDays(false)
                          }}
                          className={`p-4 rounded-xl border text-left transition-all relative ${
                            selectedTariffPeriod?.days === period.days && !useCustomDays
                              ? 'border-accent-500 bg-accent-500/10'
                              : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                          }`}
                        >
                          {displayDiscount && displayDiscount > 0 && (
                            <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-white text-xs font-medium rounded-full ${
                              hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                            }`}>
                              -{displayDiscount}%
                            </div>
                          )}
                          <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-accent-400 font-medium">{formatPrice(displayPrice)}</span>
                            {displayOriginal && displayOriginal > displayPrice && (
                              <span className="text-dark-500 text-sm line-through">{formatPrice(displayOriginal)}</span>
                            )}
                          </div>
                          <div className="text-xs text-dark-500 mt-1">{formatPrice(displayPerMonth)}/{t('subscription.month')}</div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Custom days option */}
                {selectedTariff.custom_days_enabled && (selectedTariff.price_per_day_kopeks ?? 0) > 0 && (
                  <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-dark-200 font-medium">Произвольное кол-во дней</span>
                      <button
                        type="button"
                        onClick={() => setUseCustomDays(!useCustomDays)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          useCustomDays ? 'bg-accent-500' : 'bg-dark-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            useCustomDays ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {useCustomDays && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={selectedTariff.min_days ?? 1}
                            max={selectedTariff.max_days ?? 365}
                            value={customDays}
                            onChange={(e) => setCustomDays(parseInt(e.target.value))}
                            className="flex-1 accent-accent-500"
                          />
                          <input
                            type="number"
                            value={customDays}
                            min={selectedTariff.min_days ?? 1}
                            max={selectedTariff.max_days ?? 365}
                            onChange={(e) => setCustomDays(Math.max(selectedTariff.min_days ?? 1, Math.min(selectedTariff.max_days ?? 365, parseInt(e.target.value) || (selectedTariff.min_days ?? 1))))}
                            className="w-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 text-center"
                          />
                        </div>
                        {(() => {
                          const basePrice = customDays * (selectedTariff.price_per_day_kopeks ?? 0)
                          const hasExistingDiscount = !!(selectedTariff.original_price_per_day_kopeks && selectedTariff.original_price_per_day_kopeks > (selectedTariff.price_per_day_kopeks ?? 0))
                          const promoCustom = applyPromoDiscount(basePrice, hasExistingDiscount)
                          return (
                            <div className="flex justify-between text-sm">
                              <span className="text-dark-400">{customDays} дней × {formatPrice(selectedTariff.price_per_day_kopeks ?? 0)}/день</span>
                              <div className="flex items-center gap-2">
                                <span className="text-accent-400 font-medium">{formatPrice(promoCustom.price)}</span>
                                {promoCustom.original && (
                                  <>
                                    <span className="text-dark-500 text-xs line-through">{formatPrice(promoCustom.original)}</span>
                                    <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">-{promoCustom.percent}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom traffic option */}
              {selectedTariff.custom_traffic_enabled && (selectedTariff.traffic_price_per_gb_kopeks ?? 0) > 0 && (
                <div>
                  <div className="text-sm text-dark-400 mb-3">Трафик</div>
                  <div className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-dark-200 font-medium">Выбрать объём трафика</span>
                      <button
                        type="button"
                        onClick={() => setUseCustomTraffic(!useCustomTraffic)}
                        className={`w-10 h-6 rounded-full transition-colors relative ${
                          useCustomTraffic ? 'bg-accent-500' : 'bg-dark-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            useCustomTraffic ? 'left-5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {!useCustomTraffic && (
                      <div className="text-sm text-dark-400">
                        По умолчанию: {selectedTariff.traffic_limit_label}
                      </div>
                    )}
                    {useCustomTraffic && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={selectedTariff.min_traffic_gb ?? 1}
                            max={selectedTariff.max_traffic_gb ?? 1000}
                            value={customTrafficGb}
                            onChange={(e) => setCustomTrafficGb(parseInt(e.target.value))}
                            className="flex-1 accent-accent-500"
                          />
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={customTrafficGb}
                              min={selectedTariff.min_traffic_gb ?? 1}
                              max={selectedTariff.max_traffic_gb ?? 1000}
                              onChange={(e) => setCustomTrafficGb(Math.max(selectedTariff.min_traffic_gb ?? 1, Math.min(selectedTariff.max_traffic_gb ?? 1000, parseInt(e.target.value) || (selectedTariff.min_traffic_gb ?? 1))))}
                              className="w-20 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 text-center"
                            />
                            <span className="text-dark-400">ГБ</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">{customTrafficGb} ГБ × {formatPrice(selectedTariff.traffic_price_per_gb_kopeks ?? 0)}/ГБ</span>
                          <span className="text-accent-400 font-medium">+{formatPrice(customTrafficGb * (selectedTariff.traffic_price_per_gb_kopeks ?? 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary & Purchase */}
              {(selectedTariffPeriod || useCustomDays) && (
                <div className="bg-dark-800/50 rounded-xl p-5">
                  {(() => {
                    // Calculate prices with promo discount
                    const basePeriodPrice = useCustomDays
                      ? customDays * (selectedTariff.price_per_day_kopeks ?? 0)
                      : (selectedTariffPeriod?.price_kopeks || 0)
                    const hasExistingPeriodDiscount = !useCustomDays && selectedTariffPeriod?.original_price_kopeks
                      ? selectedTariffPeriod.original_price_kopeks > selectedTariffPeriod.price_kopeks
                      : false
                    const promoPeriod = applyPromoDiscount(basePeriodPrice, hasExistingPeriodDiscount)

                    const trafficPrice = useCustomTraffic && selectedTariff.custom_traffic_enabled
                      ? customTrafficGb * (selectedTariff.traffic_price_per_gb_kopeks ?? 0)
                      : 0

                    const totalPrice = promoPeriod.price + trafficPrice
                    const originalTotal = promoPeriod.original ? promoPeriod.original + trafficPrice : null
                    const hasEnoughBalance = purchaseOptions && totalPrice <= purchaseOptions.balance_kopeks

                    return (
                      <>
                        {/* Price breakdown */}
                        <div className="space-y-2 mb-4">
                          {useCustomDays ? (
                            <div className="flex justify-between text-sm text-dark-300">
                              <span>Период: {customDays} дней</span>
                              <div className="flex items-center gap-2">
                                <span>{formatPrice(promoPeriod.price)}</span>
                                {promoPeriod.original && (
                                  <span className="text-dark-500 text-xs line-through">{formatPrice(promoPeriod.original)}</span>
                                )}
                              </div>
                            </div>
                          ) : selectedTariffPeriod && (
                            <div className="flex justify-between text-sm text-dark-300">
                              <span>Период: {selectedTariffPeriod.label}</span>
                              <div className="flex items-center gap-2">
                                <span>{formatPrice(promoPeriod.price)}</span>
                                {(hasExistingPeriodDiscount || promoPeriod.original) && (
                                  <span className="text-dark-500 text-xs line-through">
                                    {formatPrice(hasExistingPeriodDiscount ? selectedTariffPeriod.original_price_kopeks! : promoPeriod.original!)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {useCustomTraffic && selectedTariff.custom_traffic_enabled && (
                            <div className="flex justify-between text-sm text-dark-300">
                              <span>Трафик: {customTrafficGb} ГБ</span>
                              <span>+{formatPrice(trafficPrice)}</span>
                            </div>
                          )}
                        </div>

                        {/* Promo discount info */}
                        {promoPeriod.percent && (
                          <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                            <span className="text-orange-400 text-sm font-medium">
                              {t('promo.discountApplied')} -{promoPeriod.percent}%
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-4 pt-2 border-t border-dark-700/50">
                          <span className="text-dark-100 font-medium">{t('subscription.total')}</span>
                          <div className="text-right">
                            <span className="text-2xl font-bold text-accent-400">{formatPrice(totalPrice)}</span>
                            {originalTotal && (
                              <div className="text-sm text-dark-500 line-through">{formatPrice(originalTotal)}</div>
                            )}
                          </div>
                        </div>

                        {purchaseOptions && !hasEnoughBalance && (
                          <InsufficientBalancePrompt
                            missingAmountKopeks={totalPrice - purchaseOptions.balance_kopeks}
                            compact
                            className="mb-4"
                          />
                        )}

                        <button
                          onClick={() => tariffPurchaseMutation.mutate()}
                          disabled={tariffPurchaseMutation.isPending || !hasEnoughBalance}
                          className="btn-primary w-full py-3"
                        >
                          {tariffPurchaseMutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              {t('common.loading')}
                            </span>
                          ) : (
                            t('subscription.purchase')
                          )}
                        </button>
                      </>
                    )
                  })()}

                  {tariffPurchaseMutation.isError && (
                    <div className="text-sm text-error-400 text-center mt-3">
                      {getErrorMessage(tariffPurchaseMutation.error)}
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Purchase/Extend Section - Classic Mode */}
      {classicOptions && classicOptions.periods.length > 0 && (
        <div ref={tariffsCardRef} className="bento-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-100">
              {subscription && !subscription.is_trial ? t('subscription.extend') : t('subscription.getSubscription')}
            </h2>
            {!showPurchaseForm && (
              <button
                onClick={() => setShowPurchaseForm(true)}
                className="btn-primary"
              >
                {subscription && !subscription.is_trial ? t('subscription.extend') : t('subscription.getSubscription')}
              </button>
            )}
          </div>

          {showPurchaseForm && (
            <div className="space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="text-sm text-dark-400">
                  {t('subscription.step', { current: currentStepIndex + 1, total: steps.length })}
                </div>
                <div className="flex gap-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step}
                      className={`w-8 h-1 rounded-full transition-colors ${
                        idx <= currentStepIndex ? 'bg-accent-500' : 'bg-dark-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="text-lg font-medium text-dark-100 mb-4">
                {getStepLabel(currentStep)}
              </div>

              {/* Step: Period Selection */}
              {currentStep === 'period' && classicOptions && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {classicOptions.periods.map((period) => {
                    const hasExistingDiscount = !!(period.discount_percent && period.discount_percent > 0)
                    const promoPeriod = applyPromoDiscount(period.price_kopeks, hasExistingDiscount)
                    const displayDiscount = hasExistingDiscount ? period.discount_percent : promoPeriod.percent
                    const displayOriginal = hasExistingDiscount ? period.original_price_kopeks : promoPeriod.original

                    return (
                      <button
                        key={period.id}
                        onClick={() => {
                          setSelectedPeriod(period)
                          if (period.traffic.current !== undefined) {
                            setSelectedTraffic(period.traffic.current)
                          }
                          if (period.servers.selected) {
                            setSelectedServers(period.servers.selected)
                          }
                          if (period.devices.current) {
                            setSelectedDevices(period.devices.current)
                          }
                        }}
                        className={`bento-card-hover p-4 text-left transition-all relative ${
                          selectedPeriod?.id === period.id
                            ? 'bento-card-glow border-accent-500'
                            : ''
                        }`}
                      >
                        {displayDiscount && displayDiscount > 0 && (
                          <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-white text-xs font-medium rounded-full ${
                            hasExistingDiscount ? 'bg-success-500' : 'bg-orange-500'
                          }`}>
                            -{displayDiscount}%
                          </div>
                        )}
                        <div className="text-lg font-semibold text-dark-100">{period.label}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-accent-400 font-medium">{formatPrice(promoPeriod.price)}</span>
                          {displayOriginal && displayOriginal > promoPeriod.price && (
                            <span className="text-dark-500 text-sm line-through">{formatPrice(displayOriginal)}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step: Traffic Selection */}
              {currentStep === 'traffic' && selectedPeriod?.traffic.options && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedPeriod.traffic.options.map((option) => {
                    const hasExistingDiscount = !!(option.discount_percent && option.discount_percent > 0)
                    const promoTraffic = applyPromoDiscount(option.price_kopeks, hasExistingDiscount)

                    return (
                      <button
                        key={option.value}
                        onClick={() => setSelectedTraffic(option.value)}
                        disabled={!option.is_available}
                        className={`bento-card-hover p-4 text-center transition-all relative ${
                          selectedTraffic === option.value
                            ? 'bento-card-glow border-accent-500'
                            : ''
                        } ${!option.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {promoTraffic.percent && (
                          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                            -{promoTraffic.percent}%
                          </div>
                        )}
                        <div className="text-lg font-semibold text-dark-100">{option.label}</div>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-accent-400">{formatPrice(promoTraffic.price)}</span>
                          {promoTraffic.original && (
                            <span className="text-dark-500 text-xs line-through">{formatPrice(promoTraffic.original)}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step: Server Selection */}
              {currentStep === 'servers' && selectedPeriod?.servers.options && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedPeriod.servers.options
                    // Hide Trial server for users who already have trial subscription
                    .filter((server) => {
                      if (subscription?.is_trial && server.name.toLowerCase().includes('trial')) {
                        return false
                      }
                      return true
                    })
                    .map((server) => {
                    const hasExistingDiscount = !!(server.discount_percent && server.discount_percent > 0)
                    const promoServer = applyPromoDiscount(server.price_kopeks, hasExistingDiscount)

                    return (
                      <button
                        key={server.uuid}
                        onClick={() => toggleServer(server.uuid)}
                        disabled={!server.is_available}
                        className={`p-4 rounded-xl border text-left transition-all relative ${
                          selectedServers.includes(server.uuid)
                            ? 'border-accent-500 bg-accent-500/10'
                            : server.is_available
                              ? 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                              : 'border-dark-800/30 bg-dark-900/30 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {promoServer.percent && (
                          <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-orange-500 text-white text-xs font-medium rounded-full">
                            -{promoServer.percent}%
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedServers.includes(server.uuid)
                              ? 'border-accent-500 bg-accent-500'
                              : 'border-dark-600'
                          }`}>
                            {selectedServers.includes(server.uuid) && (
                              <CheckIcon />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-dark-100">{server.name}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-accent-400">{formatPrice(promoServer.price)}{t('subscription.perMonth')}</span>
                              {promoServer.original && (
                                <span className="text-dark-500 text-xs line-through">{formatPrice(promoServer.original)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step: Device Selection */}
              {currentStep === 'devices' && selectedPeriod && (
                <div className="flex flex-col items-center py-8">
                  <div className="flex items-center gap-6">
                    <button
                      onClick={() => setSelectedDevices(Math.max(selectedPeriod.devices.min, selectedDevices - 1))}
                      disabled={selectedDevices <= selectedPeriod.devices.min}
                      className="btn-secondary w-14 h-14 !p-0 flex items-center justify-center text-2xl"
                    >
                      -
                    </button>
                    <div className="text-center">
                      <div className="text-5xl font-bold text-dark-100">
                        {selectedDevices}
                      </div>
                      <div className="text-dark-500 mt-2">{t('subscription.devices')}</div>
                    </div>
                    <button
                      onClick={() => setSelectedDevices(Math.min(selectedPeriod.devices.max, selectedDevices + 1))}
                      disabled={selectedDevices >= selectedPeriod.devices.max}
                      className="btn-secondary w-14 h-14 !p-0 flex items-center justify-center text-2xl"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm text-dark-500 mt-4 text-center space-y-1">
                    <div className="text-accent-400">
                      {selectedPeriod.devices.min} {t('subscription.devicesFree')}
                    </div>
                    {selectedPeriod.devices.max > selectedPeriod.devices.min && (
                      <div>
                        {formatPrice(selectedPeriod.devices.price_per_device_kopeks)} {t('subscription.perExtraDevice')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Confirm */}
              {currentStep === 'confirm' && (
                <div>
                  {previewLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : preview ? (
                    <div className="bg-dark-800/50 rounded-xl p-5 space-y-4">
                      {/* Active promo discount banner */}
                      {activeDiscount?.is_active && activeDiscount.discount_percent && !preview.original_price_kopeks && (
                        <div className="flex items-center justify-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                          <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                          <span className="text-orange-400 text-sm font-medium">
                            {t('promo.discountApplied')} -{activeDiscount.discount_percent}%
                          </span>
                        </div>
                      )}

                      {preview.breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-dark-300">
                          <span>{item.label}</span>
                          <span>{item.value}</span>
                        </div>
                      ))}

                      {(() => {
                        // Apply promo discount if not already applied by server
                        const hasServerDiscount = !!preview.original_price_kopeks
                        const promoTotal = applyPromoDiscount(preview.total_price_kopeks, hasServerDiscount)
                        const displayTotal = promoTotal.price
                        const displayOriginal = hasServerDiscount ? preview.original_price_kopeks : promoTotal.original

                        return (
                          <div className="border-t border-dark-700/50 pt-4 flex justify-between items-center">
                            <span className="font-semibold text-dark-100 text-lg">{t('subscription.total')}</span>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-accent-400">{formatPrice(displayTotal)}</div>
                              {displayOriginal && (
                                <div className="text-sm text-dark-500 line-through">{formatPrice(displayOriginal)}</div>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {preview.discount_label && (
                        <div className="text-sm text-success-400 text-center">{preview.discount_label}</div>
                      )}

                      {!preview.can_purchase && preview.status_message && (
                        <div className="text-sm text-error-400 bg-error-500/10 px-4 py-3 rounded-lg text-center">
                          {preview.status_message}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-4 border-t border-dark-800/50">
                {!isFirstStep && (
                  <button
                    onClick={goToPrevStep}
                    className="btn-secondary flex-1"
                  >
                    {t('common.back')}
                  </button>
                )}

                {isFirstStep && (
                  <button
                    onClick={resetPurchase}
                    className="btn-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                )}

                {!isLastStep ? (
                  <button
                    onClick={goToNextStep}
                    disabled={!selectedPeriod}
                    className="btn-primary flex-1"
                  >
                    {t('common.next')}
                  </button>
                ) : (
                  <button
                    onClick={() => purchaseMutation.mutate()}
                    disabled={purchaseMutation.isPending || previewLoading || !preview?.can_purchase}
                    className="btn-primary flex-1"
                  >
                    {purchaseMutation.isPending ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('common.loading')}
                      </span>
                    ) : (
                      t('subscription.purchase')
                    )}
                  </button>
                )}
              </div>

              {purchaseMutation.isError && (
                <div className="text-sm text-error-400 text-center">
                  {getErrorMessage(purchaseMutation.error)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal onClose={() => setShowConnectionModal(false)} />
      )}
    </div>
  )
}
