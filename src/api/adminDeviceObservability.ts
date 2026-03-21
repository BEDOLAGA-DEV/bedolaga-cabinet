import {
  adminTrafficApi,
  type TrafficEnrichmentData,
  type TrafficParams,
  type UserTrafficItem,
} from './adminTraffic';
import { adminUsersApi } from './adminUsers';

export interface DeviceObservabilityRow {
  user_id: number;
  telegram_id: number | null;
  username: string | null;
  full_name: string;
  tariff_name: string | null;
  subscription_status: string | null;
  device_limit: number;
  devices_connected: number;
  over_limit_by: number;
  devices_delta: number | null;
  utilization_percent: number | null;
  is_unlimited_limit: boolean;
  total_bytes: number;
}

export interface DeviceObservabilitySummary {
  total_users: number;
  total_connected_devices: number;
  users_with_devices: number;
  users_over_limit: number;
  users_at_limit: number;
  users_with_unlimited_limit: number;
  max_connected_devices: number;
  missing_from_traffic: number;
}

export interface DeviceObservabilitySnapshot {
  rows: DeviceObservabilityRow[];
  summary: DeviceObservabilitySummary;
  fetched_at: string;
  period_days: number;
}

export interface DeviceObservabilityOptions {
  period?: number;
  pageSize?: number;
  skipCache?: boolean;
  onProgress?: (loadedPages: number, totalPages: number) => void;
}

const SNAPSHOT_TTL_MS = 60 * 1000;
const DEFAULT_PERIOD = 30;
const DEFAULT_PAGE_SIZE = 200;
const MAX_PAGE_SIZE = 500;
const MAX_CONCURRENT_REQUESTS = 4;

let snapshotCache: { key: string; expiresAt: number; value: DeviceObservabilitySnapshot } | null =
  null;

function normalizeNonNegative(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function clampPageSize(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(value)));
}

function toRow(item: UserTrafficItem, enrichment?: TrafficEnrichmentData): DeviceObservabilityRow {
  const deviceLimit = normalizeNonNegative(item.device_limit);
  const devicesConnected = normalizeNonNegative(enrichment?.devices_connected);
  const isUnlimitedLimit = deviceLimit === 0;
  const overLimitBy = !isUnlimitedLimit ? Math.max(0, devicesConnected - deviceLimit) : 0;
  const devicesDelta = !isUnlimitedLimit ? devicesConnected - deviceLimit : null;
  const utilizationPercent = !isUnlimitedLimit
    ? deviceLimit > 0
      ? Math.round((devicesConnected / deviceLimit) * 100)
      : null
    : null;

  return {
    user_id: item.user_id,
    telegram_id: item.telegram_id,
    username: item.username,
    full_name: item.full_name,
    tariff_name: item.tariff_name,
    subscription_status: item.subscription_status,
    device_limit: deviceLimit,
    devices_connected: devicesConnected,
    over_limit_by: overLimitBy,
    devices_delta: devicesDelta,
    utilization_percent: utilizationPercent,
    is_unlimited_limit: isUnlimitedLimit,
    total_bytes: normalizeNonNegative(item.total_bytes),
  };
}

function summarizeRows(rows: DeviceObservabilityRow[], missingFromTraffic: number): DeviceObservabilitySummary {
  let totalConnectedDevices = 0;
  let usersWithDevices = 0;
  let usersOverLimit = 0;
  let usersAtLimit = 0;
  let usersWithUnlimitedLimit = 0;
  let maxConnectedDevices = 0;

  for (const row of rows) {
    totalConnectedDevices += row.devices_connected;
    if (row.devices_connected > 0) usersWithDevices += 1;
    if (row.over_limit_by > 0) usersOverLimit += 1;
    if (!row.is_unlimited_limit && row.device_limit > 0 && row.devices_connected === row.device_limit) {
      usersAtLimit += 1;
    }
    if (row.is_unlimited_limit) usersWithUnlimitedLimit += 1;
    if (row.devices_connected > maxConnectedDevices) {
      maxConnectedDevices = row.devices_connected;
    }
  }

  return {
    total_users: rows.length,
    total_connected_devices: totalConnectedDevices,
    users_with_devices: usersWithDevices,
    users_over_limit: usersOverLimit,
    users_at_limit: usersAtLimit,
    users_with_unlimited_limit: usersWithUnlimitedLimit,
    max_connected_devices: maxConnectedDevices,
    missing_from_traffic: missingFromTraffic,
  };
}

function buildCacheKey(period: number, pageSize: number): string {
  return JSON.stringify({ period, pageSize });
}

async function loadAllTrafficRows(
  params: Omit<TrafficParams, 'offset' | 'limit'>,
  pageSize: number,
  skipCache: boolean,
  onProgress?: (loadedPages: number, totalPages: number) => void,
): Promise<UserTrafficItem[]> {
  const firstPage = await adminTrafficApi.getTrafficUsage(
    { ...params, offset: 0, limit: pageSize },
    { skipCache },
  );

  const totalPages = Math.max(1, Math.ceil(firstPage.total / pageSize));
  onProgress?.(1, totalPages);

  if (totalPages === 1) {
    return firstPage.items;
  }

  const offsets = Array.from({ length: totalPages - 1 }, (_, idx) => (idx + 1) * pageSize);
  const results: UserTrafficItem[][] = new Array(offsets.length);
  let nextIndex = 0;
  let loadedPages = 1;

  const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, offsets.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= offsets.length) return;

        const data = await adminTrafficApi.getTrafficUsage(
          { ...params, offset: offsets[currentIndex], limit: pageSize },
          { skipCache },
        );
        results[currentIndex] = data.items;
        loadedPages += 1;
        onProgress?.(loadedPages, totalPages);
      }
    }),
  );

  return [...firstPage.items, ...results.flat()];
}

export const adminDeviceObservabilityApi = {
  getSnapshot: async (
    options: DeviceObservabilityOptions = {},
  ): Promise<DeviceObservabilitySnapshot> => {
    const period =
      typeof options.period === 'number' && Number.isFinite(options.period)
        ? Math.max(1, Math.floor(options.period))
        : DEFAULT_PERIOD;
    const pageSize = clampPageSize(options.pageSize);
    const skipCache = options.skipCache === true;
    const cacheKey = buildCacheKey(period, pageSize);

    if (!skipCache && snapshotCache && snapshotCache.key === cacheKey && Date.now() < snapshotCache.expiresAt) {
      return snapshotCache.value;
    }

    const baseParams: Omit<TrafficParams, 'offset' | 'limit'> = {
      period,
      sort_by: 'total_bytes',
      sort_desc: true,
    };

    const enrichmentPromise = adminTrafficApi.getEnrichment({ skipCache });
    const trafficRows = await loadAllTrafficRows(baseParams, pageSize, skipCache, options.onProgress);
    const enrichmentResponse = await enrichmentPromise;
    const enrichmentMap = enrichmentResponse.data;

    const rowsMap = new Map<number, DeviceObservabilityRow>();
    for (const item of trafficRows) {
      rowsMap.set(item.user_id, toRow(item, enrichmentMap[item.user_id]));
    }

    const rows = Array.from(rowsMap.values());
    const missingFromTraffic = Object.keys(enrichmentMap).reduce((acc, key) => {
      const userId = Number(key);
      if (!Number.isFinite(userId)) return acc;
      return rowsMap.has(userId) ? acc : acc + 1;
    }, 0);

    const snapshot: DeviceObservabilitySnapshot = {
      rows,
      summary: summarizeRows(rows, missingFromTraffic),
      fetched_at: new Date().toISOString(),
      period_days: period,
    };

    snapshotCache = {
      key: cacheKey,
      value: snapshot,
      expiresAt: Date.now() + SNAPSHOT_TTL_MS,
    };

    return snapshot;
  },

  invalidateCache: () => {
    snapshotCache = null;
  },

  getUserDevices: async (userId: number) => {
    return adminUsersApi.getUserDevices(userId);
  },
};
