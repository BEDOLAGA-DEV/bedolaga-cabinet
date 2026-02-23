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
  email: string | null;
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
  available_statuses: string[];
}

export interface ExportCsvResponse {
  success: boolean;
  message: string;
}

export interface TrafficEnrichmentData {
  devices_connected: number;
  total_spent_kopeks: number;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  last_node_name: string | null;
}

export interface TrafficEnrichmentResponse {
  data: Record<number, TrafficEnrichmentData>;
}

export type TrafficParams = {
  period?: number;
  limit?: number;
  offset?: number;
  search?: string;
  sort_by?: string;
  sort_desc?: boolean;
  tariffs?: string;
  statuses?: string;
  nodes?: string;
  start_date?: string;
  end_date?: string;
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 20;

const trafficCache = new Map<string, { data: TrafficUsageResponse; timestamp: number }>();

function buildCacheKey(params: TrafficParams): string {
  return JSON.stringify({
    period: params.period ?? 30,
    limit: params.limit ?? 50,
    offset: params.offset ?? 0,
    search: params.search ?? '',
    sort_by: params.sort_by ?? 'total_bytes',
    sort_desc: params.sort_desc ?? true,
    tariffs: params.tariffs ?? '',
    statuses: params.statuses ?? '',
    nodes: params.nodes ?? '',
    start_date: params.start_date ?? '',
    end_date: params.end_date ?? '',
  });
}

const enrichmentCache: { data: TrafficEnrichmentResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

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

    // Evict oldest entries to prevent unbounded memory growth
    if (trafficCache.size > MAX_CACHE_ENTRIES) {
      const iterator = trafficCache.keys();
      while (trafficCache.size > MAX_CACHE_ENTRIES) {
        const oldest = iterator.next();
        if (oldest.done) break;
        trafficCache.delete(oldest.value);
      }
    }

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

  getEnrichment: async (options?: { skipCache?: boolean }): Promise<TrafficEnrichmentResponse> => {
    if (
      !options?.skipCache &&
      enrichmentCache.data &&
      Date.now() - enrichmentCache.timestamp < CACHE_TTL
    ) {
      return enrichmentCache.data;
    }

    const response = await apiClient.get('/cabinet/admin/traffic/enrichment');
    const data: TrafficEnrichmentResponse = response.data;
    enrichmentCache.data = data;
    enrichmentCache.timestamp = Date.now();
    return data;
  },

  exportCsv: async (data: {
    period: number;
    start_date?: string;
    end_date?: string;
    tariffs?: string;
    statuses?: string;
    nodes?: string;
    total_threshold_gb?: number;
    node_threshold_gb?: number;
  }): Promise<ExportCsvResponse> => {
    const response = await apiClient.post('/cabinet/admin/traffic/export-csv', data);
    return response.data;
  },
};
