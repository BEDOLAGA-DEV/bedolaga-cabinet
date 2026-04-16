import apiClient from './client';
import type {
  Subscription,
  SubscriptionStatusResponse,
  SubscriptionListItem,
  SubscriptionsListResponse,
  RenewalOption,
  TrafficPackage,
  TrialInfo,
  PurchaseOptions,
  PurchaseSelection,
  PurchasePreview,
  AppConfig,
} from '../types';

/** Helper: build query params with optional subscription_id */
const withSubId = (subscriptionId?: number, extra?: Record<string, unknown>) => ({
  params: {
    ...(subscriptionId != null && { subscription_id: subscriptionId }),
    ...extra,
  },
});

/**
 * Helper for POST/PATCH/PUT: returns [body, axiosConfig] tuple.
 * subscription_id goes as query param (backend expects Query(...)), NOT in body.
 */
const bodyWithSubId = (
  body: Record<string, unknown>,
  subscriptionId?: number,
): [Record<string, unknown>, { params?: Record<string, unknown> }] => [
  body,
  subscriptionId != null ? { params: { subscription_id: subscriptionId } } : {},
];

export const subscriptionApi = {
  // ── Multi-tariff endpoints ──────────────────────────────────────────

  getSubscriptions: async (): Promise<SubscriptionsListResponse> => {
    const response = await apiClient.get<SubscriptionsListResponse>('/cabinet/subscriptions');
    return response.data;
  },

  getSubscriptionById: async (subscriptionId: number): Promise<SubscriptionListItem> => {
    const response = await apiClient.get<SubscriptionListItem>(
      `/cabinet/subscriptions/${subscriptionId}`,
    );
    return response.data;
  },

  deleteSubscription: async (subscriptionId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/cabinet/subscriptions/${subscriptionId}`);
    return response.data;
  },

  // ── Legacy single-subscription status ───────────────────────────────

  getSubscription: async (subscriptionId?: number): Promise<SubscriptionStatusResponse> => {
    const response = await apiClient.get<SubscriptionStatusResponse>(
      '/cabinet/subscription',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  // ── Renewal ─────────────────────────────────────────────────────────

  getRenewalOptions: async (subscriptionId?: number): Promise<RenewalOption[]> => {
    const response = await apiClient.get<RenewalOption[]>(
      '/cabinet/subscription/renewal-options',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  renewSubscription: async (
    periodDays: number,
    subscriptionId?: number,
  ): Promise<{
    message: string;
    new_end_date: string;
    amount_paid_kopeks: number;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/renew',
      ...bodyWithSubId({ period_days: periodDays }, subscriptionId),
    );
    return response.data;
  },

  // ── Traffic ─────────────────────────────────────────────────────────

  getTrafficPackages: async (subscriptionId?: number): Promise<TrafficPackage[]> => {
    const response = await apiClient.get<TrafficPackage[]>(
      '/cabinet/subscription/traffic-packages',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  purchaseTraffic: async (
    gb: number,
    subscriptionId?: number,
  ): Promise<{
    message: string;
    gb_added: number;
    amount_paid_kopeks: number;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/traffic',
      ...bodyWithSubId({ gb }, subscriptionId),
    );
    return response.data;
  },

  switchTraffic: async (
    gb: number,
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    old_traffic_gb: number;
    new_traffic_gb: number;
    charged_kopeks: number;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.put(
      '/cabinet/subscription/traffic',
      ...bodyWithSubId({ gb }, subscriptionId),
    );
    return response.data;
  },

  saveTrafficCart: async (trafficGb: number, subscriptionId?: number): Promise<void> => {
    await apiClient.post(
      '/cabinet/subscription/traffic/save-cart',
      ...bodyWithSubId({ gb: trafficGb }, subscriptionId),
    );
  },

  refreshTraffic: async (
    subscriptionId?: number,
  ): Promise<{
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
    const response = await apiClient.post(
      '/cabinet/subscription/refresh-traffic',
      {},
      withSubId(subscriptionId),
    );
    return response.data;
  },

  // ── Devices ─────────────────────────────────────────────────────────

  purchaseDevices: async (
    devices: number,
    subscriptionId?: number,
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
    const response = await apiClient.post(
      '/cabinet/subscription/devices/purchase',
      ...bodyWithSubId({ devices }, subscriptionId),
    );
    return response.data;
  },

  getDevicePrice: async (
    devices: number = 1,
    subscriptionId?: number,
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
    original_price_per_device_kopeks?: number;
    base_total_price_kopeks?: number;
    discount_percent?: number;
    discount_kopeks?: number;
  }> => {
    const response = await apiClient.get('/cabinet/subscription/devices/price', {
      params: {
        devices,
        ...(subscriptionId != null && { subscription_id: subscriptionId }),
      },
    });
    return response.data;
  },

  saveDevicesCart: async (devices: number, subscriptionId?: number): Promise<void> => {
    await apiClient.post(
      '/cabinet/subscription/devices/save-cart',
      ...bodyWithSubId({ devices }, subscriptionId),
    );
  },

  getDeviceReductionInfo: async (
    subscriptionId?: number,
  ): Promise<{
    available: boolean;
    reason?: string;
    current_device_limit: number;
    min_device_limit: number;
    can_reduce: number;
    connected_devices_count: number;
  }> => {
    const response = await apiClient.get(
      '/cabinet/subscription/devices/reduction-info',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  reduceDevices: async (
    newDeviceLimit: number,
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    old_device_limit: number;
    new_device_limit: number;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/devices/reduce',
      ...bodyWithSubId({ new_device_limit: newDeviceLimit }, subscriptionId),
    );
    return response.data;
  },

  getDevices: async (
    subscriptionId?: number,
  ): Promise<{
    devices: Array<{
      hwid: string;
      platform: string;
      device_model: string;
      created_at: string | null;
    }>;
    total: number;
    device_limit: number;
  }> => {
    const response = await apiClient.get(
      '/cabinet/subscription/devices',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  deleteDevice: async (
    hwid: string,
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    deleted_hwid: string;
  }> => {
    const response = await apiClient.delete(
      `/cabinet/subscription/devices/${encodeURIComponent(hwid)}`,
      withSubId(subscriptionId),
    );
    return response.data;
  },

  deleteAllDevices: async (
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    deleted_count: number;
  }> => {
    const response = await apiClient.delete(
      '/cabinet/subscription/devices',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  // ── Autopay ─────────────────────────────────────────────────────────

  updateAutopay: async (
    enabled: boolean,
    daysBefore?: number,
    subscriptionId?: number,
  ): Promise<{
    message: string;
    autopay_enabled: boolean;
    autopay_days_before: number;
  }> => {
    const response = await apiClient.patch(
      '/cabinet/subscription/autopay',
      { enabled, days_before: daysBefore },
      withSubId(subscriptionId),
    );
    return response.data;
  },

  // ── Trial ───────────────────────────────────────────────────────────

  getTrialInfo: async (): Promise<TrialInfo> => {
    const response = await apiClient.get<TrialInfo>('/cabinet/subscription/trial');
    return response.data;
  },

  activateTrial: async (): Promise<Subscription> => {
    const response = await apiClient.post<Subscription>('/cabinet/subscription/trial');
    return response.data;
  },

  // ── Purchase ────────────────────────────────────────────────────────

  getPurchaseOptions: async (subscriptionId?: number): Promise<PurchaseOptions> => {
    const response = await apiClient.get<PurchaseOptions>(
      '/cabinet/subscription/purchase-options',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  previewPurchase: async (
    selection: PurchaseSelection,
    subscriptionId?: number,
  ): Promise<PurchasePreview> => {
    const response = await apiClient.post<PurchasePreview>(
      '/cabinet/subscription/purchase-preview',
      ...bodyWithSubId({ selection }, subscriptionId),
    );
    return response.data;
  },

  submitPurchase: async (
    selection: PurchaseSelection,
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    subscription: Subscription;
    was_trial_conversion: boolean;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/purchase',
      ...bodyWithSubId({ selection }, subscriptionId),
    );
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

  // ── Countries / Servers ─────────────────────────────────────────────

  getCountries: async (
    subscriptionId?: number,
  ): Promise<{
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
    const response = await apiClient.get(
      '/cabinet/subscription/countries',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  updateCountries: async (
    countries: string[],
    subscriptionId?: number,
  ): Promise<{
    message: string;
    added: string[];
    removed: string[];
    amount_paid_kopeks: number;
    connected_squads: string[];
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/countries',
      ...bodyWithSubId({ countries }, subscriptionId),
    );
    return response.data;
  },

  // ── Connection ──────────────────────────────────────────────────────

  getConnectionLink: async (
    subscriptionId?: number,
  ): Promise<{
    subscription_url: string | null;
    display_link: string | null;
    happ_redirect_link: string | null;
    happ_scheme_link: string | null;
    happ_cryptolink?: string | null;
    happ_crypto_link?: string | null;
    happ_link?: string | null;
    connect_mode: string;
    hide_link: boolean;
    instructions: {
      steps: string[];
    };
  }> => {
    const response = await apiClient.get(
      '/cabinet/subscription/connection-link',
      withSubId(subscriptionId),
    );
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

  getAppConfig: async (subscriptionId?: number): Promise<AppConfig> => {
    const response = await apiClient.get<AppConfig>(
      '/cabinet/subscription/app-config',
      withSubId(subscriptionId),
    );
    return response.data;
  },

  // ── Tariff switch ───────────────────────────────────────────────────

  previewTariffSwitch: async (
    tariffId: number,
    subscriptionId?: number,
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
    base_upgrade_cost_kopeks?: number;
    discount_percent?: number;
    discount_kopeks?: number;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/tariff/switch/preview',
      ...bodyWithSubId({ tariff_id: tariffId, period_days: 30 }, subscriptionId),
    );
    return response.data;
  },

  switchTariff: async (
    tariffId: number,
    subscriptionId?: number,
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
    const response = await apiClient.post(
      '/cabinet/subscription/tariff/switch',
      ...bodyWithSubId({ tariff_id: tariffId, period_days: 30 }, subscriptionId),
    );
    return response.data;
  },

  // ── Daily subscription ──────────────────────────────────────────────

  togglePause: async (
    subscriptionId?: number,
  ): Promise<{
    success: boolean;
    message: string;
    is_paused: boolean;
    balance_kopeks: number;
    balance_label: string;
  }> => {
    const response = await apiClient.post(
      '/cabinet/subscription/pause',
      undefined,
      withSubId(subscriptionId),
    );
    return response.data;
  },
};
