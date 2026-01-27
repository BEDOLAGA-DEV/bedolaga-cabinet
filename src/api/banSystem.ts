import apiClient from './client';

// === Types ===

export interface BanSystemStatus {
  enabled: boolean;
  configured: boolean;
}

export interface BanSystemStats {
  total_users: number;
  active_users: number;
  users_over_limit: number;
  total_requests: number;
  total_punishments: number;
  active_punishments: number;
  nodes_online: number;
  nodes_total: number;
  agents_online: number;
  agents_total: number;
  panel_connected: boolean;
  uptime_seconds: number | null;
}

export interface BanUserIPInfo {
  ip: string;
  first_seen: string | null;
  last_seen: string | null;
  node: string | null;
  request_count: number;
  country_code: string | null;
  country_name: string | null;
  city: string | null;
}

export interface BanUserRequestLog {
  timestamp: string;
  source_ip: string;
  destination: string | null;
  dest_port: number | null;
  protocol: string | null;
  action: string | null;
  node: string | null;
}

export interface BanUserListItem {
  email: string;
  unique_ip_count: number;
  total_requests: number;
  limit: number | null;
  is_over_limit: boolean;
  blocked_count: number;
  last_seen: string | null;
}

export interface BanUsersListResponse {
  users: BanUserListItem[];
  total: number;
  offset: number;
  limit: number;
}

export interface BanUserDetailResponse {
  email: string;
  unique_ip_count: number;
  total_requests: number;
  limit: number | null;
  is_over_limit: boolean;
  blocked_count: number;
  ips: BanUserIPInfo[];
  recent_requests: BanUserRequestLog[];
  network_type: string | null;
}

export interface BanPunishmentItem {
  id: number | null;
  user_id: string;
  uuid: string | null;
  username: string;
  reason: string | null;
  punished_at: string;
  enable_at: string | null;
  ip_count: number;
  limit: number;
  enabled: boolean;
  enabled_at: string | null;
  node_name: string | null;
}

export interface BanPunishmentsListResponse {
  punishments: BanPunishmentItem[];
  total: number;
}

export interface BanHistoryResponse {
  items: BanPunishmentItem[];
  total: number;
}

export interface BanUserRequest {
  username: string;
  minutes: number;
  reason?: string;
}

export interface UnbanResponse {
  success: boolean;
  message: string;
}

export interface BanNodeItem {
  name: string;
  address: string | null;
  is_connected: boolean;
  last_seen: string | null;
  users_count: number;
  agent_stats: Record<string, unknown> | null;
}

export interface BanNodesListResponse {
  nodes: BanNodeItem[];
  total: number;
  online: number;
}

export interface BanAgentItem {
  node_name: string;
  sent_total: number;
  dropped_total: number;
  batches_total: number;
  reconnects: number;
  failures: number;
  queue_size: number;
  queue_max: number;
  dedup_checked: number;
  dedup_skipped: number;
  filter_checked: number;
  filter_filtered: number;
  health: string;
  is_online: boolean;
  last_report: string | null;
}

export interface BanAgentsSummary {
  total_agents: number;
  online_agents: number;
  total_sent: number;
  total_dropped: number;
  avg_queue_size: number;
  healthy_count: number;
  warning_count: number;
  critical_count: number;
}

export interface BanAgentsListResponse {
  agents: BanAgentItem[];
  summary: BanAgentsSummary | null;
  total: number;
  online: number;
}

export interface BanTrafficViolationItem {
  id: number | null;
  username: string;
  email: string | null;
  violation_type: string;
  description: string | null;
  bytes_used: number;
  bytes_limit: number;
  detected_at: string;
  resolved: boolean;
}

export interface BanTrafficViolationsResponse {
  violations: BanTrafficViolationItem[];
  total: number;
}

export interface BanTrafficTopItem {
  username: string;
  bytes_total: number;
  bytes_limit: number | null;
  over_limit: boolean;
}

export interface BanTrafficResponse {
  enabled: boolean;
  stats: Record<string, unknown> | null;
  top_users: BanTrafficTopItem[];
  recent_violations: BanTrafficViolationItem[];
}

// === Settings Types ===

export interface BanSettingDefinition {
  key: string;
  value: unknown;
  type: string;
  min_value: number | null;
  max_value: number | null;
  editable: boolean;
  description: string | null;
  category: string | null;
}

export interface BanSettingsResponse {
  settings: BanSettingDefinition[];
}

export interface BanWhitelistRequest {
  username: string;
}

// === Report Types ===

export interface BanReportTopViolator {
  username: string;
  count: number;
}

export interface BanReportResponse {
  period_hours: number;
  current_users: number;
  current_ips: number;
  punishment_stats: Record<string, unknown> | null;
  top_violators: BanReportTopViolator[];
}

// === Health Types ===

export interface BanHealthComponent {
  name: string;
  status: string;
  message: string | null;
  details: Record<string, unknown> | null;
}

export interface BanHealthResponse {
  status: string;
  uptime: number | null;
  components: BanHealthComponent[];
}

export interface BanHealthDetailedResponse {
  status: string;
  uptime: number | null;
  components: Record<string, unknown>;
}

// === Agent History Types ===

export interface BanAgentHistoryItem {
  timestamp: string;
  sent_total: number;
  dropped_total: number;
  queue_size: number;
  batches_total: number;
}

export interface BanAgentHistoryResponse {
  node: string;
  hours: number;
  records: number;
  delta: Record<string, unknown> | null;
  first: Record<string, unknown> | null;
  last: Record<string, unknown> | null;
  history: BanAgentHistoryItem[];
}

// === API ===

export const banSystemApi = {
  // Status
  getStatus: async (): Promise<BanSystemStatus> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/status');
    return response.data;
  },

  // Stats
  getStats: async (): Promise<BanSystemStats> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/stats');
    return response.data;
  },

  // Users
  getUsers: async (
    params: {
      offset?: number;
      limit?: number;
      status?: string;
    } = {},
  ): Promise<BanUsersListResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/users', { params });
    return response.data;
  },

  getUsersOverLimit: async (limit: number = 50): Promise<BanUsersListResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/users/over-limit', {
      params: { limit },
    });
    return response.data;
  },

  searchUsers: async (query: string): Promise<BanUsersListResponse> => {
    const response = await apiClient.get(
      `/cabinet/admin/ban-system/users/search/${encodeURIComponent(query)}`,
    );
    return response.data;
  },

  getUser: async (email: string): Promise<BanUserDetailResponse> => {
    const response = await apiClient.get(
      `/cabinet/admin/ban-system/users/${encodeURIComponent(email)}`,
    );
    return response.data;
  },

  // Punishments
  getPunishments: async (): Promise<BanPunishmentsListResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/punishments');
    return response.data;
  },

  unbanUser: async (userId: string): Promise<UnbanResponse> => {
    const response = await apiClient.post(`/cabinet/admin/ban-system/punishments/${userId}/unban`);
    return response.data;
  },

  banUser: async (data: BanUserRequest): Promise<UnbanResponse> => {
    const response = await apiClient.post('/cabinet/admin/ban-system/ban', data);
    return response.data;
  },

  getPunishmentHistory: async (query: string, limit: number = 20): Promise<BanHistoryResponse> => {
    const response = await apiClient.get(
      `/cabinet/admin/ban-system/history/${encodeURIComponent(query)}`,
      {
        params: { limit },
      },
    );
    return response.data;
  },

  // Nodes
  getNodes: async (): Promise<BanNodesListResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/nodes');
    return response.data;
  },

  // Agents
  getAgents: async (
    params: {
      search?: string;
      health?: string;
      status?: string;
    } = {},
  ): Promise<BanAgentsListResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/agents', { params });
    return response.data;
  },

  getAgentsSummary: async (): Promise<BanAgentsSummary> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/agents/summary');
    return response.data;
  },

  // Traffic violations
  getTrafficViolations: async (limit: number = 50): Promise<BanTrafficViolationsResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/traffic/violations', {
      params: { limit },
    });
    return response.data;
  },

  // Full Traffic
  getTraffic: async (): Promise<BanTrafficResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/traffic');
    return response.data;
  },

  getTrafficTop: async (limit: number = 20): Promise<BanTrafficTopItem[]> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/traffic/top', {
      params: { limit },
    });
    return response.data;
  },

  // Settings
  getSettings: async (): Promise<BanSettingsResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/settings');
    return response.data;
  },

  getSetting: async (key: string): Promise<BanSettingDefinition> => {
    const response = await apiClient.get(`/cabinet/admin/ban-system/settings/${key}`);
    return response.data;
  },

  setSetting: async (key: string, value: string): Promise<BanSettingDefinition> => {
    const response = await apiClient.post(`/cabinet/admin/ban-system/settings/${key}`, null, {
      params: { value },
    });
    return response.data;
  },

  toggleSetting: async (key: string): Promise<BanSettingDefinition> => {
    const response = await apiClient.post(`/cabinet/admin/ban-system/settings/${key}/toggle`);
    return response.data;
  },

  // Whitelist
  whitelistAdd: async (username: string): Promise<UnbanResponse> => {
    const response = await apiClient.post('/cabinet/admin/ban-system/settings/whitelist/add', {
      username,
    });
    return response.data;
  },

  whitelistRemove: async (username: string): Promise<UnbanResponse> => {
    const response = await apiClient.post('/cabinet/admin/ban-system/settings/whitelist/remove', {
      username,
    });
    return response.data;
  },

  // Reports
  getReport: async (hours: number = 24): Promise<BanReportResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/report', {
      params: { hours },
    });
    return response.data;
  },

  // Health
  getHealth: async (): Promise<BanHealthResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/health');
    return response.data;
  },

  getHealthDetailed: async (): Promise<BanHealthDetailedResponse> => {
    const response = await apiClient.get('/cabinet/admin/ban-system/health/detailed');
    return response.data;
  },

  // Agent History
  getAgentHistory: async (
    nodeName: string,
    hours: number = 24,
  ): Promise<BanAgentHistoryResponse> => {
    const response = await apiClient.get(
      `/cabinet/admin/ban-system/agents/${encodeURIComponent(nodeName)}/history`,
      {
        params: { hours },
      },
    );
    return response.data;
  },

  // User Punishment History
  getUserHistory: async (email: string, limit: number = 20): Promise<BanHistoryResponse> => {
    const response = await apiClient.get(
      `/cabinet/admin/ban-system/users/${encodeURIComponent(email)}/history`,
      {
        params: { limit },
      },
    );
    return response.data;
  },
};
