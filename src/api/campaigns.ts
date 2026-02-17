import apiClient from './client';

// Types
export type CampaignBonusType = 'balance' | 'subscription' | 'none' | 'tariff';

export interface TariffInfo {
  id: number;
  name: string;
}

export interface CampaignListItem {
  id: number;
  name: string;
  start_parameter: string;
  bonus_type: CampaignBonusType;
  is_active: boolean;
  registrations_count: number;
  total_revenue_kopeks: number;
  conversion_rate: number;
  created_at: string;
}

export interface CampaignListResponse {
  campaigns: CampaignListItem[];
  total: number;
}

export interface CampaignDetail {
  id: number;
  name: string;
  start_parameter: string;
  bonus_type: CampaignBonusType;
  is_active: boolean;
  balance_bonus_kopeks: number;
  balance_bonus_rubles: number;
  subscription_duration_days: number | null;
  subscription_traffic_gb: number | null;
  subscription_device_limit: number | null;
  subscription_squads: string[];
  tariff_id: number | null;
  tariff_duration_days: number | null;
  tariff: TariffInfo | null;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  deep_link: string | null;
  web_link: string | null;
}

export interface CampaignCreateRequest {
  name: string;
  start_parameter: string;
  bonus_type: CampaignBonusType;
  is_active?: boolean;
  balance_bonus_kopeks?: number;
  subscription_duration_days?: number;
  subscription_traffic_gb?: number;
  subscription_device_limit?: number;
  subscription_squads?: string[];
  tariff_id?: number;
  tariff_duration_days?: number;
}

export interface CampaignUpdateRequest {
  name?: string;
  start_parameter?: string;
  bonus_type?: CampaignBonusType;
  is_active?: boolean;
  balance_bonus_kopeks?: number;
  subscription_duration_days?: number;
  subscription_traffic_gb?: number;
  subscription_device_limit?: number;
  subscription_squads?: string[];
  tariff_id?: number;
  tariff_duration_days?: number;
}

export interface CampaignToggleResponse {
  id: number;
  is_active: boolean;
  message: string;
}

export interface CampaignStatistics {
  id: number;
  name: string;
  start_parameter: string;
  bonus_type: CampaignBonusType;
  is_active: boolean;
  registrations: number;
  balance_issued_kopeks: number;
  balance_issued_rubles: number;
  subscription_issued: number;
  last_registration: string | null;
  total_revenue_kopeks: number;
  total_revenue_rubles: number;
  avg_revenue_per_user_kopeks: number;
  avg_revenue_per_user_rubles: number;
  avg_first_payment_kopeks: number;
  avg_first_payment_rubles: number;
  trial_users_count: number;
  active_trials_count: number;
  conversion_count: number;
  paid_users_count: number;
  conversion_rate: number;
  trial_conversion_rate: number;
  deep_link: string | null;
  web_link: string | null;
}

export interface CampaignRegistrationItem {
  id: number;
  user_id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  bonus_type: string;
  balance_bonus_kopeks: number;
  subscription_duration_days: number | null;
  tariff_id: number | null;
  tariff_duration_days: number | null;
  created_at: string;
  user_balance_kopeks: number;
  has_subscription: boolean;
  has_paid: boolean;
}

export interface CampaignRegistrationsResponse {
  registrations: CampaignRegistrationItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface CampaignsOverview {
  total: number;
  active: number;
  inactive: number;
  total_registrations: number;
  total_balance_issued_kopeks: number;
  total_balance_issued_rubles: number;
  total_subscription_issued: number;
  total_tariff_issued: number;
}

export interface ServerSquadInfo {
  id: number;
  squad_uuid: string;
  display_name: string;
  country_code: string | null;
}

export interface TariffListItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  traffic_limit_gb: number;
  device_limit: number;
}

export const campaignsApi = {
  // Get campaigns overview
  getOverview: async (): Promise<CampaignsOverview> => {
    const response = await apiClient.get('/cabinet/admin/campaigns/overview');
    return response.data;
  },

  // Get all campaigns
  getCampaigns: async (
    includeInactive = true,
    offset = 0,
    limit = 50,
  ): Promise<CampaignListResponse> => {
    const response = await apiClient.get('/cabinet/admin/campaigns', {
      params: { include_inactive: includeInactive, offset, limit },
    });
    return response.data;
  },

  // Get single campaign
  getCampaign: async (campaignId: number): Promise<CampaignDetail> => {
    const response = await apiClient.get(`/cabinet/admin/campaigns/${campaignId}`);
    return response.data;
  },

  // Get campaign statistics
  getCampaignStats: async (campaignId: number): Promise<CampaignStatistics> => {
    const response = await apiClient.get(`/cabinet/admin/campaigns/${campaignId}/stats`);
    return response.data;
  },

  // Get campaign registrations
  getCampaignRegistrations: async (
    campaignId: number,
    page = 1,
    perPage = 50,
  ): Promise<CampaignRegistrationsResponse> => {
    const response = await apiClient.get(`/cabinet/admin/campaigns/${campaignId}/registrations`, {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  // Create campaign
  createCampaign: async (data: CampaignCreateRequest): Promise<CampaignDetail> => {
    const response = await apiClient.post('/cabinet/admin/campaigns', data);
    return response.data;
  },

  // Update campaign
  updateCampaign: async (
    campaignId: number,
    data: CampaignUpdateRequest,
  ): Promise<CampaignDetail> => {
    const response = await apiClient.put(`/cabinet/admin/campaigns/${campaignId}`, data);
    return response.data;
  },

  // Delete campaign
  deleteCampaign: async (campaignId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/cabinet/admin/campaigns/${campaignId}`);
    return response.data;
  },

  // Toggle campaign active status
  toggleCampaign: async (campaignId: number): Promise<CampaignToggleResponse> => {
    const response = await apiClient.post(`/cabinet/admin/campaigns/${campaignId}/toggle`);
    return response.data;
  },

  // Get available servers for subscription bonus
  getAvailableServers: async (): Promise<ServerSquadInfo[]> => {
    const response = await apiClient.get('/cabinet/admin/campaigns/available-servers');
    return response.data;
  },

  // Get available tariffs for tariff bonus
  getAvailableTariffs: async (): Promise<TariffListItem[]> => {
    const response = await apiClient.get('/cabinet/admin/campaigns/available-tariffs');
    return response.data;
  },
};
