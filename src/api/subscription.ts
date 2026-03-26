import apiClient from './client';
import type {
  Subscription,
  SubscriptionStatusResponse,
  RenewalOption,
  TrafficPackage,
  TrialInfo,
  PurchaseOptions,
  PurchaseSelection,
  PurchasePreview,
  AppConfig,
} from '../types';

export const subscriptionApi = {
  getSubscription: async (): Promise<SubscriptionStatusResponse> => {
    const response = await apiClient.get<SubscriptionStatusResponse>('/cabinet/subscription');
    return response.data;
  },

  getRenewalOptions: async (): Promise<RenewalOption[]> => {
    const response = await apiClient.get<RenewalOption[]>('/cabinet/subscription/renewal-options');
    return response.data;
  },

  renewSubscription: async (
    periodDays: number,
  ): Promise<{
    message: string;
    new_end_date: string;
    amount_paid_kopeks: number;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/renew', {
      period_days: periodDays,
    });
    return response.data;
  },

  getTrafficPackages: async (): Promise<TrafficPackage[]> => {
    const response = await apiClient.get<TrafficPackage[]>(
      '/cabinet/subscription/traffic-packages',
    );
    return response.data;
  },

  purchaseTraffic: async (
    gb: number,
  ): Promise<{
    message: string;
    gb_added: number;
    amount_paid_kopeks: number;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/traffic', { gb });
    return response.data;
  },

  purchaseDevices: async (
    devices: number,
  ): Promise<{
    success: boolean;
    message: string;
    devices_added: number;
    new_device_limit: number;
    price_kopeks: number;
    price_label: string;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/devices/purchase', { devices });
    return response.data;
  },

  getDevicePrice: async (
    devices: number = 1,
    signal?: AbortSignal,
  ): Promise<{
    available: boolean;
    reason?: string;
    devices?: number;
    price_per_device_kopeks?: number;
    price_per_device_label?: string;
    total_price_kopeks?: number;
    total_price_label?: string;
    current_device_limit?: number;
    max_device_limit?: number;
    can_add?: number;
    days_left?: number;
    base_device_price_kopeks?: number;
    // Discount fields (from promo group)
    original_price_per_device_kopeks?: number;
    base_total_price_kopeks?: number;
    discount_percent?: number;
    discount_kopeks?: number;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices/price', {
      params: { devices },
      signal,
    });
    return response.data;
  },

  saveDevicesCart: async (devices: number): Promise<void> => {
    await apiClient.post('/cabinet/subscription/devices/save-cart', { devices });
  },

  getDeviceReductionInfo: async (): Promise<{
    available: boolean;
    reason?: string;
    current_device_limit: number;
    min_device_limit: number;
    can_reduce: number;
    connected_devices_count: number;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices/reduction-info');
    return response.data;
  },

  reduceDevices: async (
    newDeviceLimit: number,
  ): Promise<{
    success: boolean;
    message: string;
    old_device_limit: number;
    new_device_limit: number;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/devices/reduce', {
      new_device_limit: newDeviceLimit,
    });
    return response.data;
  },

  saveTrafficCart: async (trafficGb: number): Promise<void> => {
    await apiClient.post('/cabinet/subscription/traffic/save-cart', { gb: trafficGb });
  },

  updateAutopay: async (
    enabled: boolean,
    daysBefore?: number,
  ): Promise<{
    message: string;
    autopay_enabled: boolean;
    autopay_days_before: number;
  }> => {
    const response = await apiClient.patch('/cabinet/subscription/autopay', {
      enabled,
      days_before: daysBefore,
    });
    return response.data;
  },

  getTrialInfo: async (): Promise<TrialInfo> => {
    const response = await apiClient.get<TrialInfo>('/cabinet/subscription/trial');
    return response.data;
  },

  activateTrial: async (): Promise<Subscription> => {
    const response = await apiClient.post<Subscription>('/cabinet/subscription/trial');
    return response.data;
  },

  getPurchaseOptions: async (): Promise<PurchaseOptions> => {
    const response = await apiClient.get<PurchaseOptions>('/cabinet/subscription/purchase-options');
    return response.data;
  },

  previewPurchase: async (selection: PurchaseSelection): Promise<PurchasePreview> => {
    const response = await apiClient.post<PurchasePreview>(
      '/cabinet/subscription/purchase-preview',
      {
        selection,
      },
    );
    return response.data;
  },

  submitPurchase: async (
    selection: PurchaseSelection,
  ): Promise<{
    success: boolean;
    message: string;
    subscription: Subscription;
    was_trial_conversion: boolean;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/purchase', {
      selection,
    });
    return response.data;
  },

  purchaseTariff: async (
    tariffId: number,
    periodDays: number,
    trafficGb?: number,
  ): Promise<{
    success: boolean;
    message: string;
    subscription: Subscription;
    tariff_id: number;
    tariff_name: string;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/purchase-tariff', {
      tariff_id: tariffId,
      period_days: periodDays,
      traffic_gb: trafficGb,
    });
    return response.data;
  },

  getAppConfig: async (): Promise<AppConfig> => {
    const response = await apiClient.get<AppConfig>('/cabinet/subscription/app-config');
    return response.data;
  },

  getCountries: async (): Promise<{
    countries: Array<{
      uuid: string;
      name: string;
      country_code: string | null;
      base_price_kopeks: number;
      price_kopeks: number;
      price_per_month_kopeks: number;
      price_rubles: number;
      is_available: boolean;
      is_connected: boolean;
      has_discount: boolean;
      discount_percent: number;
    }>;
    connected_count: number;
    has_subscription: boolean;
    days_left: number;
    discount_percent: number;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/countries');
    return response.data;
  },

  updateCountries: async (
    countries: string[],
  ): Promise<{
    message: string;
    added: string[];
    removed: string[];
    amount_paid_kopeks: number;
    connected_squads: string[];
  }> => {
    const response = await apiClient.post('/cabinet/subscription/countries', { countries });
    return response.data;
  },

  getConnectionLink: async (): Promise<{
    subscription_url: string | null;
    display_link: string | null;
    happ_redirect_link: string | null;
    happ_scheme_link: string | null;
    connect_mode: string;
    hide_link: boolean;
    instructions: {
      steps: string[];
    };
  }> => {
    const response = await apiClient.get('/cabinet/subscription/connection-link');
    return response.data;
  },

  getHappDownloads: async (): Promise<{
    platforms: Record<
      string,
      {
        name: string;
        icon: string;
        link: string;
      }
    >;
    happ_enabled: boolean;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/happ-downloads');
    return response.data;
  },

  getDevices: async (): Promise<{
    devices: Array<{
      hwid: string;
      platform: string;
      device_model: string;
      created_at: string | null;
    }>;
    total: number;
    device_limit: number;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices');
    return response.data;
  },

  deleteDevice: async (
    hwid: string,
  ): Promise<{
    success: boolean;
    message: string;
    deleted_hwid: string;
  }> => {
    const response = await apiClient.delete(
      `/cabinet/subscription/devices/${encodeURIComponent(hwid)}`,
    );
    return response.data;
  },

  deleteAllDevices: async (): Promise<{
    success: boolean;
    message: string;
    deleted_count: number;
  }> => {
    const response = await apiClient.delete('/cabinet/subscription/devices');
    return response.data;
  },

  previewTariffSwitch: async (
    tariffId: number,
  ): Promise<{
    can_switch: boolean;
    current_tariff_id: number | null;
    current_tariff_name: string | null;
    new_tariff_id: number;
    new_tariff_name: string;
    remaining_days: number;
    upgrade_cost_kopeks: number;
    upgrade_cost_label: string;
    balance_kopeks: number;
    balance_label: string;
    has_enough_balance: boolean;
    missing_amount_kopeks: number;
    missing_amount_label: string;
    is_upgrade: boolean;
    // Discount fields (from promo group)
    base_upgrade_cost_kopeks?: number;
    discount_percent?: number;
    discount_kopeks?: number;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/tariff/switch/preview', {
      tariff_id: tariffId,
      period_days: 30, // Default period for switch
    });
    return response.data;
  },

  switchTariff: async (
    tariffId: number,
  ): Promise<{
    success: boolean;
    message: string;
    subscription: Subscription;
    old_tariff_name: string;
    new_tariff_id: number;
    new_tariff_name: string;
    charged_kopeks: number;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/tariff/switch', {
      tariff_id: tariffId,
      period_days: 30,
    });
    return response.data;
  },

  togglePause: async (): Promise<{
    success: boolean;
    message: string;
    is_paused: boolean;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/pause');
    return response.data;
  },

  switchTraffic: async (
    gb: number,
  ): Promise<{
    success: boolean;
    message: string;
    old_traffic_gb: number;
    new_traffic_gb: number;
    charged_kopeks: number;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.put('/cabinet/subscription/traffic', { gb });
    return response.data;
  },

  // Refresh traffic usage from RemnaWave (rate limited: 1 per 60 seconds)
  refreshTraffic: async (): Promise<{
    success: boolean;
    cached: boolean;
    rate_limited?: boolean;
    retry_after_seconds?: number;
    source?: string;
    traffic_used_bytes: number;
    traffic_used_gb: number;
    traffic_limit_bytes: number;
    traffic_limit_gb: number;
    traffic_used_percent: number;
    is_unlimited: boolean;
    lifetime_used_bytes?: number;
    lifetime_used_gb?: number;
  }> => {
    const response = await apiClient.post('/cabinet/subscription/refresh-traffic');
    return response.data;
  },
};
