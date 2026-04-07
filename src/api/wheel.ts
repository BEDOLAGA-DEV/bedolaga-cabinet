import apiClient from './client';

export interface WheelPrize {
  id: number;
  display_name: string;
  emoji: string;
  color: string;
  prize_type: string;
}

export interface EligibleSubscription {
  id: number;
  tariff_name: string | null;
  days_left: number;
}

export interface WheelConfig {
  is_enabled: boolean;
  name: string;
  spin_cost_stars: number | null;
  spin_cost_days: number | null;
  spin_cost_stars_enabled: boolean;
  spin_cost_days_enabled: boolean;
  prizes: WheelPrize[];
  daily_limit: number;
  user_spins_today: number;
  can_spin: boolean;
  can_spin_reason: string | null;
  can_pay_stars: boolean;
  can_pay_days: boolean;
  user_balance_kopeks: number;
  required_balance_kopeks: number;
  has_subscription: boolean;
  eligible_subscriptions: EligibleSubscription[] | null;
}

export interface SpinAvailability {
  can_spin: boolean;
  reason: string | null;
  spins_remaining_today: number;
  can_pay_stars: boolean;
  can_pay_days: boolean;
  min_subscription_days: number;
  user_subscription_days: number;
}

export interface SpinResult {
  success: boolean;
  prize_id: number | null;
  prize_type: string | null;
  prize_value: number;
  prize_display_name: string;
  emoji: string;
  color: string;
  rotation_degrees: number;
  message: string;
  promocode: string | null;
  error: string | null;
}

export interface SpinHistoryItem {
  id: number;
  payment_type: string;
  payment_amount: number;
  prize_type: string;
  prize_value: number;
  prize_display_name: string;
  emoji: string;
  color: string;
  prize_value_kopeks: number;
  created_at: string;
}

export interface SpinHistoryResponse {
  items: SpinHistoryItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface StarsInvoiceResponse {
  invoice_url: string;
  stars_amount: number;
}

export interface WheelPrizeAdmin {
  id: number;
  config_id: number;
  prize_type: string;
  prize_value: number;
  display_name: string;
  emoji: string;
  color: string;
  prize_value_kopeks: number;
  sort_order: number;
  manual_probability: number | null;
  is_active: boolean;
  promo_balance_bonus_kopeks: number;
  promo_subscription_days: number;
  promo_traffic_gb: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateWheelPrizeData {
  prize_type: string;
  prize_value: number;
  display_name: string;
  emoji?: string;
  color?: string;
  prize_value_kopeks: number;
  sort_order?: number;
  manual_probability?: number | null;
  is_active?: boolean;
  promo_balance_bonus_kopeks?: number;
  promo_subscription_days?: number;
  promo_traffic_gb?: number;
}

export interface AdminWheelConfig {
  id: number;
  is_enabled: boolean;
  name: string;
  spin_cost_stars: number;
  spin_cost_days: number;
  spin_cost_stars_enabled: boolean;
  spin_cost_days_enabled: boolean;
  rtp_percent: number;
  daily_spin_limit: number;
  min_subscription_days_for_day_payment: number;
  promo_prefix: string;
  promo_validity_days: number;
  prizes: WheelPrizeAdmin[];
  created_at: string | null;
  updated_at: string | null;
}

export interface WheelStatistics {
  total_spins: number;
  total_revenue_kopeks: number;
  total_payout_kopeks: number;
  actual_rtp_percent: number;
  configured_rtp_percent: number;
  spins_by_payment_type: Record<string, { count: number; total_kopeks: number }>;
  prizes_distribution: Array<{
    prize_type: string;
    display_name: string;
    count: number;
    total_kopeks: number;
  }>;
  top_wins: Array<{
    user_id: number;
    username: string | null;
    prize_display_name: string;
    prize_value_kopeks: number;
    created_at: string | null;
  }>;
  period_from: string | null;
  period_to: string | null;
}

export interface AdminSpinItem {
  id: number;
  user_id: number;
  username: string | null;
  payment_type: string;
  payment_amount: number;
  payment_value_kopeks: number;
  prize_type: string;
  prize_value: number;
  prize_display_name: string;
  prize_value_kopeks: number;
  is_applied: boolean;
  created_at: string;
}

export interface AdminSpinsResponse {
  items: AdminSpinItem[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const wheelApi = {
  getConfig: async (): Promise<WheelConfig> => {
    const response = await apiClient.get<WheelConfig>('/cabinet/wheel/config');
    return response.data;
  },

  checkAvailability: async (): Promise<SpinAvailability> => {
    const response = await apiClient.get<SpinAvailability>('/cabinet/wheel/availability');
    return response.data;
  },

  spin: async (
    paymentType: 'telegram_stars' | 'subscription_days',
    subscriptionId?: number,
  ): Promise<SpinResult> => {
    const response = await apiClient.post<SpinResult>('/cabinet/wheel/spin', {
      payment_type: paymentType,
      ...(subscriptionId != null && { subscription_id: subscriptionId }),
    });
    return response.data;
  },

  getHistory: async (page = 1, perPage = 20): Promise<SpinHistoryResponse> => {
    const response = await apiClient.get<SpinHistoryResponse>('/cabinet/wheel/history', {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  createStarsInvoice: async (): Promise<StarsInvoiceResponse> => {
    const response = await apiClient.post<StarsInvoiceResponse>('/cabinet/wheel/stars-invoice');
    return response.data;
  },
};

export const adminWheelApi = {
  getConfig: async (): Promise<AdminWheelConfig> => {
    const response = await apiClient.get<AdminWheelConfig>('/cabinet/admin/wheel/config');
    return response.data;
  },

  updateConfig: async (data: Partial<AdminWheelConfig>): Promise<AdminWheelConfig> => {
    const response = await apiClient.put<AdminWheelConfig>('/cabinet/admin/wheel/config', data);
    return response.data;
  },

  getPrizes: async (): Promise<WheelPrizeAdmin[]> => {
    const response = await apiClient.get<WheelPrizeAdmin[]>('/cabinet/admin/wheel/prizes');
    return response.data;
  },

  createPrize: async (data: CreateWheelPrizeData): Promise<WheelPrizeAdmin> => {
    const response = await apiClient.post<WheelPrizeAdmin>('/cabinet/admin/wheel/prizes', data);
    return response.data;
  },

  updatePrize: async (
    prizeId: number,
    data: Partial<WheelPrizeAdmin>,
  ): Promise<WheelPrizeAdmin> => {
    const response = await apiClient.put<WheelPrizeAdmin>(
      `/cabinet/admin/wheel/prizes/${prizeId}`,
      data,
    );
    return response.data;
  },

  deletePrize: async (prizeId: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/wheel/prizes/${prizeId}`);
  },

  reorderPrizes: async (prizeIds: number[]): Promise<void> => {
    await apiClient.post('/cabinet/admin/wheel/prizes/reorder', { prize_ids: prizeIds });
  },

  getStatistics: async (dateFrom?: string, dateTo?: string): Promise<WheelStatistics> => {
    const response = await apiClient.get<WheelStatistics>('/cabinet/admin/wheel/statistics', {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return response.data;
  },

  getSpins: async (params?: {
    user_id?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }): Promise<AdminSpinsResponse> => {
    const response = await apiClient.get<AdminSpinsResponse>('/cabinet/admin/wheel/spins', {
      params,
    });
    return response.data;
  },
};
