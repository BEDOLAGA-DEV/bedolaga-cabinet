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
  connected_devices: number;
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
  available_statuses: string[];
}

export interface ExportCsvResponse {
  success: boolean;
  message: string;
}

export type TrafficParams = {
  period?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sort_by?: string;
  sort_desc?: boolean;
  tariffs?: string;
  nodes?: string;
  statuses?: string;
  start_date?: string;
  end_date?: string;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const trafficCache = new Map<string, { data: TrafficUsageResponse; timestamp: number }>();

function buildCacheKey(params: TrafficParams): string {
  return JSON.stringify({
    p: params.period ?? 30,
    l: params.limit ?? 50,
    o: params.offset ?? 0,
    s: params.search ?? '',
    sb: params.sort_by ?? 'total_bytes',
    sd: params.sort_desc ?? true,
    t: params.tariffs ?? '',
    n: params.nodes ?? '',
    st: params.statuses ?? '',
    sd2: params.start_date ?? '',
    ed: params.end_date ?? '',
  });
}

export const adminTrafficApi = {
  getTrafficUsage: async (
    params: TrafficParams,
    options?: { skipCache?: boolean },
  ): Promise<TrafficUsageResponse> => {
    const key = buildCacheKey(params);

    if (!options?.skipCache) {
      const cached = trafficCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    const response = await apiClient.get('/cabinet/admin/traffic', { params });
    const data: TrafficUsageResponse = response.data;

    trafficCache.set(key, { data, timestamp: Date.now() });

    return data;
  },

  getCached: (params: TrafficParams): TrafficUsageResponse | null => {
    const key = buildCacheKey(params);
    const cached = trafficCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  },

  invalidateCache: () => {
    trafficCache.clear();
  },

  exportCsv: async (data: {
    period: number;
    start_date?: string;
    end_date?: string;
    tariffs?: string;
    nodes?: string;
    statuses?: string;
    search?: string;
  }): Promise<ExportCsvResponse> => {
    const response = await apiClient.post('/cabinet/admin/traffic/export-csv', data);
    return response.data;
  },
};
