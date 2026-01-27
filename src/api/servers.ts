import apiClient from './client';

// Types
export interface PromoGroupInfo {
  id: number;
  name: string;
  is_selected: boolean;
}

export interface ServerListItem {
  id: number;
  squad_uuid: string;
  display_name: string;
  original_name: string | null;
  country_code: string | null;
  is_available: boolean;
  is_trial_eligible: boolean;
  price_kopeks: number;
  price_rubles: number;
  max_users: number | null;
  current_users: number;
  sort_order: number;
  is_full: boolean;
  availability_status: string;
  created_at: string;
}

export interface ServerListResponse {
  servers: ServerListItem[];
  total: number;
}

export interface ServerDetail {
  id: number;
  squad_uuid: string;
  display_name: string;
  original_name: string | null;
  country_code: string | null;
  description: string | null;
  is_available: boolean;
  is_trial_eligible: boolean;
  price_kopeks: number;
  price_rubles: number;
  max_users: number | null;
  current_users: number;
  sort_order: number;
  is_full: boolean;
  availability_status: string;
  promo_groups: PromoGroupInfo[];
  active_subscriptions: number;
  tariffs_using: string[];
  created_at: string;
  updated_at: string | null;
}

export interface ServerUpdateRequest {
  display_name?: string;
  description?: string;
  country_code?: string;
  is_available?: boolean;
  is_trial_eligible?: boolean;
  price_kopeks?: number;
  max_users?: number;
  sort_order?: number;
  promo_group_ids?: number[];
}

export interface ServerToggleResponse {
  id: number;
  is_available: boolean;
  message: string;
}

export interface ServerTrialToggleResponse {
  id: number;
  is_trial_eligible: boolean;
  message: string;
}

export interface ServerStats {
  id: number;
  display_name: string;
  squad_uuid: string;
  current_users: number;
  max_users: number | null;
  active_subscriptions: number;
  trial_subscriptions: number;
  usage_percent: number | null;
}

export interface ServerSyncResponse {
  created: number;
  updated: number;
  removed: number;
  message: string;
}

export const serversApi = {
  // Get all servers
  getServers: async (includeUnavailable = true): Promise<ServerListResponse> => {
    const response = await apiClient.get('/cabinet/admin/servers', {
      params: { include_unavailable: includeUnavailable },
    });
    return response.data;
  },

  // Get single server
  getServer: async (serverId: number): Promise<ServerDetail> => {
    const response = await apiClient.get(`/cabinet/admin/servers/${serverId}`);
    return response.data;
  },

  // Update server
  updateServer: async (serverId: number, data: ServerUpdateRequest): Promise<ServerDetail> => {
    const response = await apiClient.put(`/cabinet/admin/servers/${serverId}`, data);
    return response.data;
  },

  // Toggle server availability
  toggleServer: async (serverId: number): Promise<ServerToggleResponse> => {
    const response = await apiClient.post(`/cabinet/admin/servers/${serverId}/toggle`);
    return response.data;
  },

  // Toggle trial eligibility
  toggleTrial: async (serverId: number): Promise<ServerTrialToggleResponse> => {
    const response = await apiClient.post(`/cabinet/admin/servers/${serverId}/trial`);
    return response.data;
  },

  // Get server stats
  getServerStats: async (serverId: number): Promise<ServerStats> => {
    const response = await apiClient.get(`/cabinet/admin/servers/${serverId}/stats`);
    return response.data;
  },

  // Sync servers with RemnaWave
  syncServers: async (): Promise<ServerSyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/servers/sync');
    return response.data;
  },
};
