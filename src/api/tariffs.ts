import apiClient from './client';

// Types
export interface PeriodPrice {
  days: number;
  price_kopeks: number;
  price_rubles?: number;
}

// Премиум-лимит по одному серверу тарифа: свой лимит трафика и своя докупка.
// Ноль в traffic_limit_gb означает «брать общий лимит тарифа», то есть премиума
// на этом сервере нет.
export interface ServerTrafficLimit {
  traffic_limit_gb: number;
  /** Своё название лимита; пусто — берётся имя сервера. */
  name?: string | null;
  /** Порядок показа: и в админке, и в карточке пользователя. */
  sort_order?: number;
  topup_enabled?: boolean;
  /** {ГБ: цена в копейках} */
  topup_packages?: Record<string, number>;
  /** Потолок докупки за период, 0 = без ограничения. */
  max_topup_gb?: number;
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
  show_in_gift: boolean;
  is_daily: boolean;
  daily_price_kopeks: number;
  /** UUID продукта Lava для рекуррентных подписок (цена/период заданы в кабинете Lava) */
  lava_product_id?: string | null;
  /** Свой тег панельного пользователя Remnawave; null — общий тег из настроек */
  panel_tag?: string | null;
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
  show_in_gift: boolean;
  traffic_limit_gb: number;
  device_limit: number;
  device_price_kopeks: number | null;
  max_device_limit: number | null;
  tier_level: number;
  display_order: number;
  period_prices: PeriodPrice[];
  /** Период, отмеченный как самый выгодный (дни). null — не выделен. */
  highlight_period_days?: number | null;
  /** Тариф отмечен как выгодный — выделяется в списке. */
  is_highlighted?: boolean;
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
  /** UUID продукта Lava для рекуррентных подписок (цена/период заданы в кабинете Lava) */
  lava_product_id?: string | null;
  /** Свой тег панельного пользователя Remnawave; null — общий тег из настроек */
  panel_tag?: string | null;
  // Режим сброса трафика
  traffic_reset_mode: string | null; // 'DAY', 'WEEK', 'MONTH', 'MONTH_ROLLING', 'NO_RESET', null = глобальная настройка
  // Внешний сквад Remnawave
  external_squad_uuid: string | null;
  /** Дни триала на этом тарифе; null — глобальная настройка */
  trial_duration_days?: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface TariffCreateRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  show_in_gift?: boolean;
  traffic_limit_gb?: number;
  device_limit?: number;
  device_price_kopeks?: number;
  max_device_limit?: number;
  tier_level?: number;
  period_prices?: PeriodPrice[];
  /** Дни выделенного периода; 0 снимает выделение. */
  highlight_period_days?: number | null;
  /** Тариф отмечен как выгодный — выделяется в списке. */
  is_highlighted?: boolean;
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
  // Автопродление Lava: продукт из кабинета Lava
  lava_product_id?: string | null;
  /** Свой тег панельного пользователя Remnawave; null — общий тег из настроек */
  panel_tag?: string | null;
  // Режим сброса трафика
  traffic_reset_mode?: string | null;
  // Внешний сквад Remnawave
  external_squad_uuid?: string | null;
  /** Дни триала на этом тарифе; null — глобальная настройка */
  trial_duration_days?: number | null;
}

export interface ExternalSquadInfo {
  uuid: string;
  name: string;
  members_count: number;
}

export interface TariffUpdateRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  show_in_gift?: boolean;
  traffic_limit_gb?: number;
  device_limit?: number;
  device_price_kopeks?: number;
  max_device_limit?: number;
  tier_level?: number;
  display_order?: number;
  period_prices?: PeriodPrice[];
  /** Дни выделенного периода; 0 снимает выделение. */
  highlight_period_days?: number | null;
  /** Тариф отмечен как выгодный — выделяется в списке. */
  is_highlighted?: boolean;
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
  // Автопродление Lava: продукт из кабинета Lava
  lava_product_id?: string | null;
  /** Свой тег панельного пользователя Remnawave; null — общий тег из настроек */
  panel_tag?: string | null;
  // Режим сброса трафика
  traffic_reset_mode?: string | null;
  // Внешний сквад Remnawave
  external_squad_uuid?: string | null;
  /** Дни триала на этом тарифе; null — глобальная настройка */
  trial_duration_days?: number | null;
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
  deleteTariff: async (
    tariffId: number,
  ): Promise<{ message: string; affected_subscriptions: number }> => {
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

  // Update tariff display order
  updateOrder: async (tariffIds: number[]): Promise<void> => {
    await apiClient.put('/cabinet/admin/tariffs/order', { tariff_ids: tariffIds });
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

  // Get available external squads from Remnawave
  getAvailableExternalSquads: async (): Promise<ExternalSquadInfo[]> => {
    const response = await apiClient.get('/cabinet/admin/tariffs/available-external-squads');
    return response.data;
  },
};
