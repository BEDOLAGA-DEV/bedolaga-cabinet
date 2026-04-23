import {
  adminUsersApi,
  type UserDetailResponse,
  type UserListItem,
  type UserSubscriptionInfo,
} from './adminUsers';

export interface DeviceObservabilityRow {
  row_key: string;
  user_id: number;
  subscription_id: number;
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
const MAX_PAGE_FETCH_WORKERS = 4;
const MAX_USER_PROCESS_WORKERS = 4;

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

function buildCacheKey(period: number, pageSize: number): string {
  return JSON.stringify({ period, pageSize });
}

function getSubscriptions(detail: UserDetailResponse): UserSubscriptionInfo[] {
  if (Array.isArray(detail.subscriptions) && detail.subscriptions.length > 0) {
    return detail.subscriptions;
  }

  return detail.subscription ? [detail.subscription] : [];
}

function toRow(
  detail: Pick<UserDetailResponse, 'id' | 'telegram_id' | 'username' | 'full_name'>,
  subscription: UserSubscriptionInfo,
  devicesConnected: number,
): DeviceObservabilityRow {
  const deviceLimit = normalizeNonNegative(subscription.device_limit);
  const normalizedConnected = normalizeNonNegative(devicesConnected);
  const isUnlimitedLimit = deviceLimit === 0;
  const overLimitBy = !isUnlimitedLimit ? Math.max(0, normalizedConnected - deviceLimit) : 0;
  const devicesDelta = !isUnlimitedLimit ? normalizedConnected - deviceLimit : null;
  const utilizationPercent = !isUnlimitedLimit
    ? deviceLimit > 0
      ? Math.round((normalizedConnected / deviceLimit) * 100)
      : null
    : null;

  return {
    row_key: `${detail.id}:${subscription.id}`,
    user_id: detail.id,
    subscription_id: subscription.id,
    telegram_id: detail.telegram_id,
    username: detail.username,
    full_name: detail.full_name,
    tariff_name: subscription.tariff_name,
    subscription_status: subscription.status,
    device_limit: deviceLimit,
    devices_connected: normalizedConnected,
    over_limit_by: overLimitBy,
    devices_delta: devicesDelta,
    utilization_percent: utilizationPercent,
    is_unlimited_limit: isUnlimitedLimit,
  };
}

function summarizeRows(rows: DeviceObservabilityRow[]): DeviceObservabilitySummary {
  const uniqueUsers = new Set<number>();
  const usersWithDevices = new Set<number>();
  const usersOverLimit = new Set<number>();
  const usersAtLimit = new Set<number>();
  const usersWithUnlimitedLimit = new Set<number>();

  let totalConnectedDevices = 0;
  let maxConnectedDevices = 0;

  for (const row of rows) {
    uniqueUsers.add(row.user_id);
    totalConnectedDevices += row.devices_connected;

    if (row.devices_connected > 0) usersWithDevices.add(row.user_id);
    if (row.over_limit_by > 0) usersOverLimit.add(row.user_id);

    if (
      !row.is_unlimited_limit &&
      row.device_limit > 0 &&
      row.devices_connected === row.device_limit
    ) {
      usersAtLimit.add(row.user_id);
    }

    if (row.is_unlimited_limit) usersWithUnlimitedLimit.add(row.user_id);
    if (row.devices_connected > maxConnectedDevices) {
      maxConnectedDevices = row.devices_connected;
    }
  }

  return {
    total_users: uniqueUsers.size,
    total_connected_devices: totalConnectedDevices,
    users_with_devices: usersWithDevices.size,
    users_over_limit: usersOverLimit.size,
    users_at_limit: usersAtLimit.size,
    users_with_unlimited_limit: usersWithUnlimitedLimit.size,
    max_connected_devices: maxConnectedDevices,
    missing_from_traffic: 0,
  };
}

async function loadAllUsers(
  pageSize: number,
  onProgress?: (loadedPages: number, totalPages: number) => void,
): Promise<UserListItem[]> {
  const firstPage = await adminUsersApi.getUsers({ offset: 0, limit: pageSize });
  const totalPages = Math.max(1, Math.ceil(firstPage.total / pageSize));
  onProgress?.(1, totalPages);

  if (totalPages === 1) {
    return firstPage.users;
  }

  const offsets = Array.from({ length: totalPages - 1 }, (_, idx) => (idx + 1) * pageSize);
  const results: UserListItem[][] = new Array(offsets.length);
  let nextIndex = 0;
  let loadedPages = 1;

  const workerCount = Math.min(MAX_PAGE_FETCH_WORKERS, offsets.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= offsets.length) return;

        const response = await adminUsersApi.getUsers({
          offset: offsets[currentIndex],
          limit: pageSize,
        });
        results[currentIndex] = response.users;
        loadedPages += 1;
        onProgress?.(loadedPages, totalPages);
      }
    }),
  );

  return [...firstPage.users, ...results.flat()];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  workerCount: number,
  mapper: (item: T) => Promise<R>,
  onItemDone?: (completed: number, total: number) => void,
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  await Promise.all(
    Array.from({ length: Math.min(workerCount, items.length) }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= items.length) return;

        results[currentIndex] = await mapper(items[currentIndex]);
        completed += 1;
        onItemDone?.(completed, items.length);
      }
    }),
  );

  return results;
}

async function buildRowsForUser(user: UserListItem): Promise<DeviceObservabilityRow[]> {
  try {
    const detail = await adminUsersApi.getUser(user.id);
    const subscriptions = getSubscriptions(detail);

    if (subscriptions.length === 0) {
      return [];
    }

    const rows: DeviceObservabilityRow[] = [];

    for (const subscription of subscriptions) {
      try {
        const devices = await adminUsersApi.getUserDevices(detail.id, subscription.id);
        rows.push(toRow(detail, subscription, devices.total));
      } catch {
        rows.push(toRow(detail, subscription, 0));
      }
    }

    return rows;
  } catch {
    return [];
  }
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

    if (
      !skipCache &&
      snapshotCache &&
      snapshotCache.key === cacheKey &&
      Date.now() < snapshotCache.expiresAt
    ) {
      return snapshotCache.value;
    }

    const users = await loadAllUsers(pageSize);
    const usersWithSubscriptions = users.filter((user) => user.has_subscription);

    options.onProgress?.(0, usersWithSubscriptions.length);

    const rowBatches = await mapWithConcurrency(
      usersWithSubscriptions,
      MAX_USER_PROCESS_WORKERS,
      buildRowsForUser,
      options.onProgress,
    );

    const rows = rowBatches.flat();
    const snapshot: DeviceObservabilitySnapshot = {
      rows,
      summary: summarizeRows(rows),
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

  getUserDevices: async (userId: number, subscriptionId: number) => {
    return adminUsersApi.getUserDevices(userId, subscriptionId);
  },
};
