import apiClient from './client';

// ============== Types ==============

export type PromoCodeType =
  | 'balance'
  | 'subscription_days'
  | 'trial_subscription'
  | 'promo_group'
  | 'discount';

export interface PromoCode {
  id: number;
  code: string;
  type: PromoCodeType;
  balance_bonus_kopeks: number;
  balance_bonus_rubles: number;
  subscription_days: number;
  max_uses: number;
  current_uses: number;
  uses_left: number;
  is_active: boolean;
  is_valid: boolean;
  first_purchase_only: boolean;
  valid_from: string;
  valid_until: string | null;
  promo_group_id: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PromoCodeRecentUse {
  id: number;
  user_id: number;
  user_username: string | null;
  user_full_name: string | null;
  user_telegram_id: number | null;
  used_at: string;
}

export interface PromoCodeDetail extends PromoCode {
  total_uses: number;
  today_uses: number;
  recent_uses: PromoCodeRecentUse[];
}

export interface PromoCodeListResponse {
  items: PromoCode[];
  total: number;
  limit: number;
  offset: number;
}

export interface PromoCodeCreateRequest {
  code: string;
  type: PromoCodeType;
  balance_bonus_kopeks?: number;
  subscription_days?: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string | null;
  is_active?: boolean;
  first_purchase_only?: boolean;
  promo_group_id?: number | null;
}

export interface PromoCodeUpdateRequest {
  code?: string;
  type?: PromoCodeType;
  balance_bonus_kopeks?: number;
  subscription_days?: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string | null;
  is_active?: boolean;
  first_purchase_only?: boolean;
  promo_group_id?: number | null;
}

// ============== PromoGroup Types ==============

export interface PromoGroup {
  id: number;
  name: string;
  server_discount_percent: number;
  traffic_discount_percent: number;
  device_discount_percent: number;
  period_discounts: Record<number, number>;
  auto_assign_total_spent_kopeks: number | null;
  apply_discounts_to_addons: boolean;
  is_default: boolean;
  members_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PromoGroupListResponse {
  items: PromoGroup[];
  total: number;
  limit: number;
  offset: number;
}

export interface PromoGroupCreateRequest {
  name: string;
  server_discount_percent?: number;
  traffic_discount_percent?: number;
  device_discount_percent?: number;
  period_discounts?: Record<number, number>;
  auto_assign_total_spent_kopeks?: number | null;
  apply_discounts_to_addons?: boolean;
  is_default?: boolean;
}

export interface PromoGroupUpdateRequest {
  name?: string;
  server_discount_percent?: number;
  traffic_discount_percent?: number;
  device_discount_percent?: number;
  period_discounts?: Record<number, number>;
  auto_assign_total_spent_kopeks?: number | null;
  apply_discounts_to_addons?: boolean;
  is_default?: boolean;
}

// ============== API ==============

export const promocodesApi = {
  // Promocodes
  getPromocodes: async (params?: {
    limit?: number;
    offset?: number;
    is_active?: boolean;
  }): Promise<PromoCodeListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promocodes', { params });
    return response.data;
  },

  getPromocode: async (id: number): Promise<PromoCodeDetail> => {
    const response = await apiClient.get(`/cabinet/admin/promocodes/${id}`);
    return response.data;
  },

  createPromocode: async (data: PromoCodeCreateRequest): Promise<PromoCode> => {
    const response = await apiClient.post('/cabinet/admin/promocodes', data);
    return response.data;
  },

  updatePromocode: async (id: number, data: PromoCodeUpdateRequest): Promise<PromoCode> => {
    const response = await apiClient.patch(`/cabinet/admin/promocodes/${id}`, data);
    return response.data;
  },

  deletePromocode: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/promocodes/${id}`);
  },

  // Promo Groups
  getPromoGroups: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<PromoGroupListResponse> => {
    const response = await apiClient.get('/cabinet/admin/promo-groups', { params });
    return response.data;
  },

  getPromoGroup: async (id: number): Promise<PromoGroup> => {
    const response = await apiClient.get(`/cabinet/admin/promo-groups/${id}`);
    return response.data;
  },

  createPromoGroup: async (data: PromoGroupCreateRequest): Promise<PromoGroup> => {
    const response = await apiClient.post('/cabinet/admin/promo-groups', data);
    return response.data;
  },

  updatePromoGroup: async (id: number, data: PromoGroupUpdateRequest): Promise<PromoGroup> => {
    const response = await apiClient.patch(`/cabinet/admin/promo-groups/${id}`, data);
    return response.data;
  },

  deletePromoGroup: async (id: number): Promise<void> => {
    await apiClient.delete(`/cabinet/admin/promo-groups/${id}`);
  },

  // Deactivate user's active discount (admin)
  deactivateDiscount: async (userId: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(
      `/cabinet/admin/promocodes/deactivate-discount/${userId}`,
    );
    return response.data;
  },
};
