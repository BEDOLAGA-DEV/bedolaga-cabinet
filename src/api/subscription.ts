import apiClient from './client'
import type { Subscription, RenewalOption, TrafficPackage, TrialInfo, PurchaseOptions, PurchaseSelection, PurchasePreview, AppConfig } from '../types'

export const subscriptionApi = {
  // Get current subscription
  getSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get<Subscription>('/cabinet/subscription')
    return response.data
  },

  // Get renewal options
  getRenewalOptions: async (): Promise<RenewalOption[]> => {
    const response = await apiClient.get<RenewalOption[]>('/cabinet/subscription/renewal-options')
    return response.data
  },

  // Renew subscription
  renewSubscription: async (periodDays: number): Promise<{
    message: string
    new_end_date: string
    amount_paid_kopeks: number
  }> => {
    const response = await apiClient.post('/cabinet/subscription/renew', {
      period_days: periodDays,
    })
    return response.data
  },

  // Get traffic packages
  getTrafficPackages: async (): Promise<TrafficPackage[]> => {
    const response = await apiClient.get<TrafficPackage[]>('/cabinet/subscription/traffic-packages')
    return response.data
  },

  // Purchase traffic
  purchaseTraffic: async (gb: number): Promise<{
    message: string
    gb_added: number
    amount_paid_kopeks: number
  }> => {
    const response = await apiClient.post('/cabinet/subscription/traffic', { gb })
    return response.data
  },

  // Purchase devices
  purchaseDevices: async (devices: number): Promise<{
    success: boolean
    message: string
    devices_added: number
    new_device_limit: number
    price_kopeks: number
    price_label: string
    balance_kopeks: number
    balance_label: string
  }> => {
    const response = await apiClient.post('/cabinet/subscription/devices/purchase', { devices })
    return response.data
  },

  // Get device purchase price
  getDevicePrice: async (devices: number = 1): Promise<{
    available: boolean
    reason?: string
    devices?: number
    price_per_device_kopeks?: number
    price_per_device_label?: string
    total_price_kopeks?: number
    total_price_label?: string
    current_device_limit?: number
    days_left?: number
    base_device_price_kopeks?: number
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices/price', { params: { devices } })
    return response.data
  },

  // Update autopay settings
  updateAutopay: async (enabled: boolean, daysBefore?: number): Promise<{
    message: string
    autopay_enabled: boolean
    autopay_days_before: number
  }> => {
    const response = await apiClient.patch('/cabinet/subscription/autopay', {
      enabled,
      days_before: daysBefore,
    })
    return response.data
  },

  // Get trial info
  getTrialInfo: async (): Promise<TrialInfo> => {
    const response = await apiClient.get<TrialInfo>('/cabinet/subscription/trial')
    return response.data
  },

  // Activate trial
  activateTrial: async (): Promise<Subscription> => {
    const response = await apiClient.post<Subscription>('/cabinet/subscription/trial')
    return response.data
  },

  // Get purchase options (periods, servers, traffic, devices)
  getPurchaseOptions: async (): Promise<PurchaseOptions> => {
    const response = await apiClient.get<PurchaseOptions>('/cabinet/subscription/purchase-options')
    return response.data
  },

  // Preview purchase price
  previewPurchase: async (selection: PurchaseSelection): Promise<PurchasePreview> => {
    const response = await apiClient.post<PurchasePreview>('/cabinet/subscription/purchase-preview', {
      selection,
    })
    return response.data
  },

  // Submit purchase
  submitPurchase: async (selection: PurchaseSelection): Promise<{
    success: boolean
    message: string
    subscription: Subscription
    was_trial_conversion: boolean
  }> => {
    const response = await apiClient.post('/cabinet/subscription/purchase', {
      selection,
    })
    return response.data
  },

  // Purchase tariff (for tariffs mode)
  purchaseTariff: async (tariffId: number, periodDays: number, trafficGb?: number): Promise<{
    success: boolean
    message: string
    subscription: Subscription
    tariff_id: number
    tariff_name: string
    balance_kopeks: number
    balance_label: string
  }> => {
    const response = await apiClient.post('/cabinet/subscription/purchase-tariff', {
      tariff_id: tariffId,
      period_days: periodDays,
      traffic_gb: trafficGb,
    })
    return response.data
  },

  // Get app config for connection
  getAppConfig: async (): Promise<AppConfig> => {
    const response = await apiClient.get<AppConfig>('/cabinet/subscription/app-config')
    return response.data
  },

  // Get available countries/servers
  getCountries: async (): Promise<{
    countries: Array<{
      uuid: string
      name: string
      country_code: string | null
      base_price_kopeks: number
      price_kopeks: number
      price_per_month_kopeks: number
      price_rubles: number
      is_available: boolean
      is_connected: boolean
      has_discount: boolean
      discount_percent: number
    }>
    connected_count: number
    has_subscription: boolean
    days_left: number
    discount_percent: number
  }> => {
    const response = await apiClient.get('/cabinet/subscription/countries')
    return response.data
  },

  // Update countries/servers
  updateCountries: async (countries: string[]): Promise<{
    message: string
    added: string[]
    removed: string[]
    amount_paid_kopeks: number
    connected_squads: string[]
  }> => {
    const response = await apiClient.post('/cabinet/subscription/countries', { countries })
    return response.data
  },

  // Get connection link and instructions
  getConnectionLink: async (): Promise<{
    subscription_url: string | null
    display_link: string | null
    happ_redirect_link: string | null
    happ_scheme_link: string | null
    connect_mode: string
    hide_link: boolean
    instructions: {
      steps: string[]
    }
  }> => {
    const response = await apiClient.get('/cabinet/subscription/connection-link')
    return response.data
  },

  // Get hApp download links
  getHappDownloads: async (): Promise<{
    platforms: Record<string, {
      name: string
      icon: string
      link: string
    }>
    happ_enabled: boolean
  }> => {
    const response = await apiClient.get('/cabinet/subscription/happ-downloads')
    return response.data
  },

  // ============ Device Management ============

  // Get connected devices
  getDevices: async (): Promise<{
    devices: Array<{
      hwid: string
      platform: string
      device_model: string
      created_at: string | null
    }>
    total: number
    device_limit: number
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices')
    return response.data
  },

  // Delete a specific device
  deleteDevice: async (hwid: string): Promise<{
    success: boolean
    message: string
    deleted_hwid: string
  }> => {
    const response = await apiClient.delete(`/cabinet/subscription/devices/${encodeURIComponent(hwid)}`)
    return response.data
  },

  // Delete all devices
  deleteAllDevices: async (): Promise<{
    success: boolean
    message: string
    deleted_count: number
  }> => {
    const response = await apiClient.delete('/cabinet/subscription/devices')
    return response.data
  },

  // ============ Tariff Switch ============

  // Preview tariff switch cost
  previewTariffSwitch: async (tariffId: number): Promise<{
    can_switch: boolean
    current_tariff_id: number | null
    current_tariff_name: string | null
    new_tariff_id: number
    new_tariff_name: string
    remaining_days: number
    upgrade_cost_kopeks: number
    upgrade_cost_label: string
    balance_kopeks: number
    balance_label: string
    has_enough_balance: boolean
    missing_amount_kopeks: number
    missing_amount_label: string
    is_upgrade: boolean
  }> => {
    const response = await apiClient.post('/cabinet/subscription/tariff/switch/preview', {
      tariff_id: tariffId,
      period_days: 30, // Default period for switch
    })
    return response.data
  },

  // Switch to a different tariff
  switchTariff: async (tariffId: number): Promise<{
    success: boolean
    message: string
    subscription: Subscription
    old_tariff_name: string
    new_tariff_id: number
    new_tariff_name: string
    charged_kopeks: number
    balance_kopeks: number
    balance_label: string
  }> => {
    const response = await apiClient.post('/cabinet/subscription/tariff/switch', {
      tariff_id: tariffId,
      period_days: 30,
    })
    return response.data
  },

  // ============ Subscription Pause (Daily Tariffs) ============

  // Toggle pause/resume for daily subscription
  togglePause: async (): Promise<{
    success: boolean
    message: string
    is_paused: boolean
    balance_kopeks: number
    balance_label: string
  }> => {
    const response = await apiClient.post('/cabinet/subscription/pause')
    return response.data
  },

  // ============ Traffic Switch ============

  // Switch to a different traffic package
  switchTraffic: async (gb: number): Promise<{
    success: boolean
    message: string
    old_traffic_gb: number
    new_traffic_gb: number
    charged_kopeks: number
    balance_kopeks: number
    balance_label: string
  }> => {
    const response = await apiClient.put('/cabinet/subscription/traffic', { gb })
    return response.data
  },

  // Refresh traffic usage from RemnaWave (rate limited: 1 per 60 seconds)
  refreshTraffic: async (): Promise<{
    success: boolean
    cached: boolean
    rate_limited?: boolean
    retry_after_seconds?: number
    source?: string
    traffic_used_bytes: number
    traffic_used_gb: number
    traffic_limit_bytes: number
    traffic_limit_gb: number
    traffic_used_percent: number
    is_unlimited: boolean
    lifetime_used_bytes?: number
    lifetime_used_gb?: number
  }> => {
    const response = await apiClient.post('/cabinet/subscription/refresh-traffic')
    return response.data
  },
}
