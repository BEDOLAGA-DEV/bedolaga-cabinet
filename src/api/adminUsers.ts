import apiClient from './client';

// ============ Types ============

export interface UserSubscriptionInfo {
  id: number;
  status: string;
  is_trial: boolean;
  start_date: string | null;
  end_date: string | null;
  traffic_limit_gb: number;
  traffic_used_gb: number;
  device_limit: number;
  tariff_id: number | null;
  tariff_name: string | null;
  autopay_enabled: boolean;
  is_active: boolean;
  days_remaining: number;
}

export interface UserPromoGroupInfo {
  id: number;
  name: string;
  is_default: boolean;
}

export interface UserListItem {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  status: string;
  balance_kopeks: number;
  balance_rubles: number;
  created_at: string;
  last_activity: string | null;
  has_subscription: boolean;
  subscription_status: string | null;
  subscription_is_trial: boolean;
  subscription_end_date: string | null;
  promo_group_id: number | null;
  promo_group_name: string | null;
  total_spent_kopeks: number;
  purchase_count: number;
  has_restrictions: boolean;
  restriction_topup: boolean;
  restriction_subscription: boolean;
}

export interface UsersListResponse {
  users: UserListItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface UserTransactionItem {
  id: number;
  type: string;
  amount_kopeks: number;
  amount_rubles: number;
  description: string | null;
  payment_method: string | null;
  is_completed: boolean;
  created_at: string;
}

export interface UserReferralInfo {
  referral_code: string;
  referrals_count: number;
  total_earnings_kopeks: number;
  commission_percent: number | null;
  referred_by_id: number | null;
  referred_by_username: string | null;
}

export interface UserDetailResponse {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  status: string;
  language: string;
  balance_kopeks: number;
  balance_rubles: number;
  email: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string | null;
  last_activity: string | null;
  cabinet_last_login: string | null;
  subscription: UserSubscriptionInfo | null;
  promo_group: UserPromoGroupInfo | null;
  referral: UserReferralInfo;
  total_spent_kopeks: number;
  purchase_count: number;
  used_promocodes: number;
  has_had_paid_subscription: boolean;
  lifetime_used_traffic_bytes: number;
  restriction_topup: boolean;
  restriction_subscription: boolean;
  restriction_reason: string | null;
  promo_offer_discount_percent: number;
  promo_offer_discount_source: string | null;
  promo_offer_discount_expires_at: string | null;
  recent_transactions: UserTransactionItem[];
  remnawave_uuid: string | null;
}

export interface UsersStatsResponse {
  total_users: number;
  active_users: number;
  blocked_users: number;
  deleted_users: number;
  new_today: number;
  new_week: number;
  new_month: number;
  users_with_subscription: number;
  users_with_active_subscription: number;
  users_with_trial: number;
  users_with_expired_subscription: number;
  total_balance_kopeks: number;
  total_balance_rubles: number;
  avg_balance_kopeks: number;
  active_today: number;
  active_week: number;
  active_month: number;
}

// Available tariffs
export interface PeriodPriceInfo {
  days: number;
  price_kopeks: number;
  price_rubles: number;
}

export interface UserAvailableTariff {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_trial_available: boolean;
  traffic_limit_gb: number;
  device_limit: number;
  tier_level: number;
  display_order: number;
  period_prices: PeriodPriceInfo[];
  is_daily: boolean;
  daily_price_kopeks: number;
  custom_days_enabled: boolean;
  price_per_day_kopeks: number;
  min_days: number;
  max_days: number;
  is_available: boolean;
  requires_promo_group: boolean;
}

export interface UserAvailableTariffsResponse {
  user_id: number;
  promo_group_id: number | null;
  promo_group_name: string | null;
  tariffs: UserAvailableTariff[];
  total: number;
  current_tariff_id: number | null;
  current_tariff_name: string | null;
}

// Sync types
export interface PanelUserInfo {
  uuid: string | null;
  short_uuid: string | null;
  username: string | null;
  status: string | null;
  expire_at: string | null;
  traffic_limit_gb: number;
  traffic_used_gb: number;
  device_limit: number;
  subscription_url: string | null;
  active_squads: string[];
}

export interface SyncFromPanelResponse {
  success: boolean;
  message: string;
  panel_user: PanelUserInfo | null;
  changes: Record<string, unknown>;
  errors: string[];
}

export interface SyncToPanelResponse {
  success: boolean;
  message: string;
  action: string;
  panel_uuid: string | null;
  changes: Record<string, unknown>;
  errors: string[];
}

export interface PanelSyncStatusResponse {
  user_id: number;
  telegram_id: number;
  remnawave_uuid: string | null;
  last_sync: string | null;
  bot_subscription_status: string | null;
  bot_subscription_end_date: string | null;
  bot_traffic_limit_gb: number;
  bot_traffic_used_gb: number;
  bot_device_limit: number;
  bot_squads: string[];
  panel_found: boolean;
  panel_status: string | null;
  panel_expire_at: string | null;
  panel_traffic_limit_gb: number;
  panel_traffic_used_gb: number;
  panel_device_limit: number;
  panel_squads: string[];
  has_differences: boolean;
  differences: string[];
}

// Update types
export interface UpdateBalanceRequest {
  amount_kopeks: number;
  description?: string;
  create_transaction?: boolean;
}

export interface UpdateBalanceResponse {
  success: boolean;
  old_balance_kopeks: number;
  new_balance_kopeks: number;
  message: string;
}

export interface UpdateSubscriptionRequest {
  action:
    | 'extend'
    | 'set_end_date'
    | 'change_tariff'
    | 'set_traffic'
    | 'toggle_autopay'
    | 'cancel'
    | 'activate'
    | 'create';
  days?: number;
  end_date?: string;
  tariff_id?: number;
  traffic_limit_gb?: number;
  traffic_used_gb?: number;
  autopay_enabled?: boolean;
  is_trial?: boolean;
  device_limit?: number;
}

export interface UpdateSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: UserSubscriptionInfo | null;
}

export interface UpdateUserStatusResponse {
  success: boolean;
  old_status: string;
  new_status: string;
  message: string;
}

export interface UpdateRestrictionsRequest {
  restriction_topup?: boolean;
  restriction_subscription?: boolean;
  restriction_reason?: string;
}

export interface UpdateRestrictionsResponse {
  success: boolean;
  restriction_topup: boolean;
  restriction_subscription: boolean;
  restriction_reason: string | null;
  message: string;
}

export interface SyncFromPanelRequest {
  update_subscription?: boolean;
  update_traffic?: boolean;
  create_if_missing?: boolean;
}

export interface SyncToPanelRequest {
  create_if_missing?: boolean;
  update_status?: boolean;
  update_traffic_limit?: boolean;
  update_expire_date?: boolean;
  update_squads?: boolean;
}

// ============ API ============

export const adminUsersApi = {
  // List users
  getUsers: async (
    params: {
      offset?: number;
      limit?: number;
      search?: string;
      email?: string;
      status?: 'active' | 'blocked' | 'deleted';
      sort_by?:
        | 'created_at'
        | 'balance'
        | 'traffic'
        | 'last_activity'
        | 'total_spent'
        | 'purchase_count';
    } = {},
  ): Promise<UsersListResponse> => {
    const response = await apiClient.get('/cabinet/admin/users', { params });
    return response.data;
  },

  // Get users stats
  getStats: async (): Promise<UsersStatsResponse> => {
    const response = await apiClient.get('/cabinet/admin/users/stats');
    return response.data;
  },

  // Get user detail
  getUser: async (userId: number): Promise<UserDetailResponse> => {
    const response = await apiClient.get(`/cabinet/admin/users/${userId}`);
    return response.data;
  },

  // Get user by telegram ID
  getUserByTelegram: async (telegramId: number): Promise<UserDetailResponse> => {
    const response = await apiClient.get(`/cabinet/admin/users/by-telegram/${telegramId}`);
    return response.data;
  },

  // Get available tariffs for user
  getAvailableTariffs: async (
    userId: number,
    includeInactive = false,
  ): Promise<UserAvailableTariffsResponse> => {
    const response = await apiClient.get(`/cabinet/admin/users/${userId}/available-tariffs`, {
      params: { include_inactive: includeInactive },
    });
    return response.data;
  },

  // Update balance
  updateBalance: async (
    userId: number,
    data: UpdateBalanceRequest,
  ): Promise<UpdateBalanceResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/balance`, data);
    return response.data;
  },

  // Update subscription
  updateSubscription: async (
    userId: number,
    data: UpdateSubscriptionRequest,
  ): Promise<UpdateSubscriptionResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/subscription`, data);
    return response.data;
  },

  // Update status
  updateStatus: async (
    userId: number,
    status: 'active' | 'blocked' | 'deleted',
    reason?: string,
  ): Promise<UpdateUserStatusResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/status`, {
      status,
      reason,
    });
    return response.data;
  },

  // Block user
  blockUser: async (userId: number, reason?: string): Promise<UpdateUserStatusResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/block`, null, {
      params: { reason },
    });
    return response.data;
  },

  // Unblock user
  unblockUser: async (userId: number): Promise<UpdateUserStatusResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/unblock`);
    return response.data;
  },

  // Update restrictions
  updateRestrictions: async (
    userId: number,
    data: UpdateRestrictionsRequest,
  ): Promise<UpdateRestrictionsResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/restrictions`, data);
    return response.data;
  },

  // Update promo group
  updatePromoGroup: async (
    userId: number,
    promoGroupId: number | null,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/promo-group`, {
      promo_group_id: promoGroupId,
    });
    return response.data;
  },

  // Delete user
  deleteUser: async (
    userId: number,
    softDelete = true,
    reason?: string,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/cabinet/admin/users/${userId}`, {
      data: { soft_delete: softDelete, reason },
    });
    return response.data;
  },

  // Get referrals
  getReferrals: async (userId: number, offset = 0, limit = 50): Promise<UsersListResponse> => {
    const response = await apiClient.get(`/cabinet/admin/users/${userId}/referrals`, {
      params: { offset, limit },
    });
    return response.data;
  },

  // Get transactions
  getTransactions: async (
    userId: number,
    params: {
      offset?: number;
      limit?: number;
      transaction_type?: string;
    } = {},
  ): Promise<{
    transactions: UserTransactionItem[];
    total: number;
    offset: number;
    limit: number;
  }> => {
    const response = await apiClient.get(`/cabinet/admin/users/${userId}/transactions`, { params });
    return response.data;
  },

  // Sync status
  getSyncStatus: async (userId: number): Promise<PanelSyncStatusResponse> => {
    const response = await apiClient.get(`/cabinet/admin/users/${userId}/sync/status`);
    return response.data;
  },

  // Sync from panel
  syncFromPanel: async (
    userId: number,
    data: SyncFromPanelRequest = {},
  ): Promise<SyncFromPanelResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/sync/from-panel`, data);
    return response.data;
  },

  // Sync to panel
  syncToPanel: async (
    userId: number,
    data: SyncToPanelRequest = {},
  ): Promise<SyncToPanelResponse> => {
    const response = await apiClient.post(`/cabinet/admin/users/${userId}/sync/to-panel`, data);
    return response.data;
  },
};
