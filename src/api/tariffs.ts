import apiClient from './client';

// Types
export interface PeriodPrice {
  days: number;
  price_kopeks: number;
  price_rubles?: number;
}

export interface ServerTrafficLimit {
  traffic_limit_gb: number;
}

export interface ServerInfo {
  id: number;
  squad_uuid: string;
  display_name: string;
  country_code: string | null;
  is_selected: boolean;
  traffic_limit_gb?: number | null;
}

export interface PromoGroupInfo {
  id: number;
  name: string;
  is_selected: boolean;
}

export interface TariffListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_trial_available: boolean;
  is_daily: boolean;
  daily_price_kopeks: number;
  traffic_limit_gb: number;
  device_limit: number;
  tier_level: number;
  display_order: number;
  servers_count: number;
  subscriptions_count: number;
  created_at: string;
}

export interface TariffListResponse {
  tariffs: TariffListItem[];
  total: number;
}

export interface TariffDetail {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_trial_available: boolean;
  traffic_limit_gb: number;
  device_limit: number;
  device_price_kopeks: number | null;
  max_device_limit: number | null;
  tier_level: number;
  display_order: number;
  period_prices: PeriodPrice[];
  allowed_squads: string[];
  server_traffic_limits: Record<string, ServerTrafficLimit>;
  servers: ServerInfo[];
  promo_groups: PromoGroupInfo[];
  subscriptions_count: number;
  // Произвольное количество дней
  custom_days_enabled: boolean;
  price_per_day_kopeks: number;
  min_days: number;
  max_days: number;
  // Произвольный трафик при покупке
  custom_traffic_enabled: boolean;
  traffic_price_per_gb_kopeks: number;
  min_traffic_gb: number;
  max_traffic_gb: number;
  // Докупка трафика
  traffic_topup_enabled: boolean;
  traffic_topup_packages: Record<string, number>;
  max_topup_traffic_gb: number;
  // Дневной тариф
  is_daily: boolean;
  daily_price_kopeks: number;
  // Режим сброса трафика
  traffic_reset_mode: string | null; // 'DAY', 'WEEK', 'MONTH', 'NO_RESET', null = глобальная настройка
  created_at: string;
  updated_at: string | null;
}

export interface TariffCreateRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  traffic_limit_gb?: number;
  device_limit?: number;
  device_price_kopeks?: number;
  max_device_limit?: number;
  tier_level?: number;
  period_prices?: PeriodPrice[];
  allowed_squads?: string[];
  server_traffic_limits?: Record<string, ServerTrafficLimit>;
  promo_group_ids?: number[];
  // Произвольное количество дней
  custom_days_enabled?: boolean;
  price_per_day_kopeks?: number;
  min_days?: number;
  max_days?: number;
  // Произвольный трафик при покупке
  custom_traffic_enabled?: boolean;
  traffic_price_per_gb_kopeks?: number;
  min_traffic_gb?: number;
  max_traffic_gb?: number;
  // Докупка трафика
  traffic_topup_enabled?: boolean;
  traffic_topup_packages?: Record<string, number>;
  max_topup_traffic_gb?: number;
  // Дневной тариф
  is_daily?: boolean;
  daily_price_kopeks?: number;
  // Режим сброса трафика
  traffic_reset_mode?: string | null;
}

export interface TariffUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  traffic_limit_gb?: number;
  device_limit?: number;
  device_price_kopeks?: number;
  max_device_limit?: number;
  tier_level?: number;
  display_order?: number;
  period_prices?: PeriodPrice[];
  allowed_squads?: string[];
  server_traffic_limits?: Record<string, ServerTrafficLimit>;
  promo_group_ids?: number[];
  // Произвольное количество дней
  custom_days_enabled?: boolean;
  price_per_day_kopeks?: number;
  min_days?: number;
  max_days?: number;
  // Произвольный трафик при покупке
  custom_traffic_enabled?: boolean;
  traffic_price_per_gb_kopeks?: number;
  min_traffic_gb?: number;
  max_traffic_gb?: number;
  // Докупка трафика
  traffic_topup_enabled?: boolean;
  traffic_topup_packages?: Record<string, number>;
  max_topup_traffic_gb?: number;
  // Дневной тариф
  is_daily?: boolean;
  daily_price_kopeks?: number;
  // Режим сброса трафика
  traffic_reset_mode?: string | null;
}

export interface TariffToggleResponse {
  id: number;
  is_active: boolean;
  message: string;
}

export interface TariffTrialResponse {
  id: number;
  is_trial_available: boolean;
  message: string;
}

export interface TariffStats {
  id: number;
  name: string;
  subscriptions_count: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  revenue_kopeks: number;
  revenue_rubles: number;
}

export const tariffsApi = {
  // Get all tariffs
  getTariffs: async (includeInactive = true): Promise<TariffListResponse> => {
    const response = await apiClient.get('/cabinet/admin/tariffs', {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  // Get single tariff
  getTariff: async (tariffId: number): Promise<TariffDetail> => {
    const response = await apiClient.get(`/cabinet/admin/tariffs/${tariffId}`);
    return response.data;
  },

  // Create new tariff
  createTariff: async (data: TariffCreateRequest): Promise<TariffDetail> => {
    const response = await apiClient.post('/cabinet/admin/tariffs', data);
    return response.data;
  },

  // Update tariff
  updateTariff: async (tariffId: number, data: TariffUpdateRequest): Promise<TariffDetail> => {
    const response = await apiClient.put(`/cabinet/admin/tariffs/${tariffId}`, data);
    return response.data;
  },

  // Delete tariff
  deleteTariff: async (tariffId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/cabinet/admin/tariffs/${tariffId}`);
    return response.data;
  },

  // Toggle tariff active status
  toggleTariff: async (tariffId: number): Promise<TariffToggleResponse> => {
    const response = await apiClient.post(`/cabinet/admin/tariffs/${tariffId}/toggle`);
    return response.data;
  },

  // Toggle trial status
  toggleTrial: async (tariffId: number): Promise<TariffTrialResponse> => {
    const response = await apiClient.post(`/cabinet/admin/tariffs/${tariffId}/trial`);
    return response.data;
  },

  // Get tariff stats
  getTariffStats: async (tariffId: number): Promise<TariffStats> => {
    const response = await apiClient.get(`/cabinet/admin/tariffs/${tariffId}/stats`);
    return response.data;
  },

  // Get available servers for selection
  getAvailableServers: async (): Promise<ServerInfo[]> => {
    const response = await apiClient.get('/cabinet/admin/tariffs/available-servers');
    return response.data;
  },

  // Get available promo groups for selection
  getAvailablePromoGroups: async (): Promise<{ id: number; name: string }[]> => {
    const response = await apiClient.get('/cabinet/admin/payment-methods/promo-groups');
    return response.data;
  },
};
