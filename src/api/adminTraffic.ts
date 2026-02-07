import apiClient from './client';

export interface TrafficNodeInfo {
  node_uuid: string;
  node_name: string;
  country_code: string;
}

export interface UserTrafficItem {
  user_id: number;
  telegram_id: number | null;
  username: string | null;
  full_name: string;
  tariff_name: string | null;
  subscription_status: string | null;
  traffic_limit_gb: number;
  device_limit: number;
  node_traffic: Record<string, number>;
  total_bytes: number;
}

export interface TrafficUsageResponse {
  items: UserTrafficItem[];
  nodes: TrafficNodeInfo[];
  total: number;
  offset: number;
  limit: number;
  period_days: number;
  available_tariffs: string[];
}

export interface ExportCsvResponse {
  success: boolean;
  message: string;
}

export const adminTrafficApi = {
  getTrafficUsage: async (params: {
    period?: number;
    limit?: number;
    offset?: number;
    search?: string;
    sort_by?: string;
    sort_desc?: boolean;
    tariffs?: string;
  }): Promise<TrafficUsageResponse> => {
    const response = await apiClient.get('/cabinet/admin/traffic', { params });
    return response.data;
  },

  exportCsv: async (data: { period: number }): Promise<ExportCsvResponse> => {
    const response = await apiClient.post('/cabinet/admin/traffic/export-csv', data);
    return response.data;
  },
};
