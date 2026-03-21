import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  adminDeviceObservabilityApi,
  type DeviceObservabilityRow,
  type DeviceObservabilitySummary,
} from '../api/adminDeviceObservability';
import { usePlatform } from '../platform/hooks/usePlatform';

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const RefreshIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

interface StatCardProps {
  label: string;
  value: string | number;
  tone: 'blue' | 'green' | 'yellow' | 'red' | 'violet';
}

function StatCard({ label, value, tone }: StatCardProps) {
  const toneMap: Record<StatCardProps['tone'], string> = {
    blue: 'border-accent-500/30 bg-accent-500/15 text-accent-300',
    green: 'border-success-500/30 bg-success-500/15 text-success-300',
    yellow: 'border-warning-500/30 bg-warning-500/15 text-warning-300',
    red: 'border-error-500/30 bg-error-500/15 text-error-300',
    violet: 'border-violet-500/30 bg-violet-500/15 text-violet-300',
  };

  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs opacity-85">{label}</div>
    </div>
  );
}

type FilterMode =
  | 'all'
  | 'over_limit'
  | 'at_limit'
  | 'within_limit'
  | 'unlimited'
  | 'with_devices';
type SortField =
  | 'devices_connected'
  | 'over_limit_by'
  | 'utilization_percent'
  | 'device_limit'
  | 'full_name';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [25, 50, 100];

type UserDevice = {
  hwid: string;
  platform: string;
  device_model: string;
  created_at: string | null;
};

function normalizeString(value: string | null | undefined): string {
  return (value || '').toLowerCase();
}

function getSubscriptionTone(status: string | null): string {
  if (status === 'active') return 'bg-success-500/15 text-success-300 border-success-500/20';
  if (status === 'trial') return 'bg-accent-500/15 text-accent-300 border-accent-500/20';
  if (status === 'limited') return 'bg-warning-500/15 text-warning-300 border-warning-500/20';
  if (status === 'expired') return 'bg-error-500/15 text-error-300 border-error-500/20';
  if (status === 'disabled') return 'bg-dark-700 text-dark-400 border-dark-600';
  return 'bg-dark-700 text-dark-300 border-dark-600';
}

export default function AdminDeviceObservability() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [rows, setRows] = useState<DeviceObservabilityRow[]>([]);
  const [summary, setSummary] = useState<DeviceObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortField, setSortField] = useState<SortField>('devices_connected');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<DeviceObservabilityRow | null>(null);
  const [userDevices, setUserDevices] = useState<UserDevice[]>([]);
  const [userDevicesTotal, setUserDevicesTotal] = useState(0);
  const [userDevicesLimit, setUserDevicesLimit] = useState<number | null>(null);
  const [userDevicesLoading, setUserDevicesLoading] = useState(false);
  const [userDevicesError, setUserDevicesError] = useState<string | null>(null);

  const loadSnapshot = useCallback(
    async (skipCache: boolean) => {
      if (skipCache) {
        setRefreshing(true);
        adminDeviceObservabilityApi.invalidateCache();
      } else {
        setLoading(true);
      }

      setErrorMessage(null);
      setProgress({ loaded: 0, total: 0 });

      try {
        const data = await adminDeviceObservabilityApi.getSnapshot({
          period: 30,
          pageSize: 200,
          skipCache,
          onProgress: (loadedPages, totalPages) => {
            setProgress({ loaded: loadedPages, total: totalPages });
          },
        });
        setRows(data.rows);
        setSummary(data.summary);
        setFetchedAt(data.fetched_at);
      } catch {
        setErrorMessage(t('admin.deviceObservability.loadError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    loadSnapshot(false);
  }, [loadSnapshot]);

  const openUserDevices = useCallback(
    async (row: DeviceObservabilityRow) => {
      setSelectedUser(row);
      setUserDevices([]);
      setUserDevicesTotal(0);
      setUserDevicesLimit(null);
      setUserDevicesError(null);
      setUserDevicesLoading(true);

      try {
        const data = await adminDeviceObservabilityApi.getUserDevices(row.user_id);
        setUserDevices(data.devices);
        setUserDevicesTotal(data.total);
        setUserDevicesLimit(data.device_limit);
      } catch {
        setUserDevicesError(t('admin.deviceObservability.deviceModal.loadError'));
      } finally {
        setUserDevicesLoading(false);
      }
    },
    [t],
  );

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (searchValue) {
        const userFields = [
          normalizeString(row.full_name),
          normalizeString(row.username),
          row.telegram_id ? String(row.telegram_id) : '',
          String(row.user_id),
        ];
        const matchesSearch = userFields.some((field) => field.includes(searchValue));
        if (!matchesSearch) return false;
      }

      if (filterMode === 'over_limit') return row.over_limit_by > 0;
      if (filterMode === 'at_limit')
        return !row.is_unlimited_limit && row.device_limit > 0 && row.devices_connected === row.device_limit;
      if (filterMode === 'within_limit')
        return !row.is_unlimited_limit && row.devices_connected < row.device_limit;
      if (filterMode === 'unlimited') return row.is_unlimited_limit;
      if (filterMode === 'with_devices') return row.devices_connected > 0;
      return true;
    });
  }, [rows, search, filterMode]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];

    sorted.sort((a, b) => {
      if (sortField === 'full_name') {
        const order = a.full_name.localeCompare(b.full_name);
        return sortDirection === 'asc' ? order : -order;
      }

      const valueA =
        sortField === 'utilization_percent'
          ? a.utilization_percent ?? Number.NEGATIVE_INFINITY
          : a[sortField];
      const valueB =
        sortField === 'utilization_percent'
          ? b.utilization_percent ?? Number.NEGATIVE_INFINITY
          : b[sortField];

      const order = Number(valueA) - Number(valueB);
      return sortDirection === 'asc' ? order : -order;
    });

    return sorted;
  }, [filteredRows, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMode, sortField, sortDirection, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const filterOptions: Array<{ value: FilterMode; label: string }> = [
    { value: 'all', label: t('admin.deviceObservability.filters.all') },
    { value: 'over_limit', label: t('admin.deviceObservability.filters.overLimit') },
    { value: 'at_limit', label: t('admin.deviceObservability.filters.atLimit') },
    { value: 'within_limit', label: t('admin.deviceObservability.filters.withinLimit') },
    { value: 'unlimited', label: t('admin.deviceObservability.filters.unlimited') },
    { value: 'with_devices', label: t('admin.deviceObservability.filters.withDevices') },
  ];

  const sortOptions: Array<{ value: SortField; label: string }> = [
    { value: 'devices_connected', label: t('admin.deviceObservability.filters.sortConnected') },
    { value: 'over_limit_by', label: t('admin.deviceObservability.filters.sortOverLimit') },
    { value: 'utilization_percent', label: t('admin.deviceObservability.filters.sortUsage') },
    { value: 'device_limit', label: t('admin.deviceObservability.filters.sortLimit') },
    { value: 'full_name', label: t('admin.deviceObservability.filters.sortName') },
  ];

  const formatFetchedAt = (value: string | null): string => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US');
  };

  const statusLabel = (status: string | null): string => {
    if (!status) return t('admin.deviceObservability.subscriptionStatuses.unknown');
    const key = `admin.deviceObservability.subscriptionStatuses.${status}`;
    const translated = t(key);
    return translated === key ? status : translated;
  };

  const pageStartIndex = (currentPage - 1) * pageSize;

  return (
    <div className="animate-fade-in space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <ChevronLeftIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('admin.deviceObservability.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.deviceObservability.subtitle')}</p>
            {fetchedAt && (
              <p className="mt-0.5 text-xs text-dark-500">
                {t('admin.deviceObservability.lastUpdated', {
                  date: formatFetchedAt(fetchedAt),
                })}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => loadSnapshot(true)}
          disabled={loading || refreshing}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
          title={t('common.refresh')}
        >
          <RefreshIcon className={refreshing ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
        </button>
      </div>

      {(loading || refreshing) && progress.total > 1 && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/60 px-3 py-2 text-xs text-dark-300">
          {t('admin.deviceObservability.loadingProgress', {
            loaded: progress.loaded,
            total: progress.total,
          })}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-300">
          {errorMessage}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label={t('admin.deviceObservability.stats.totalUsers')}
            value={summary.total_users}
            tone="blue"
          />
          <StatCard
            label={t('admin.deviceObservability.stats.connectedDevices')}
            value={summary.total_connected_devices}
            tone="green"
          />
          <StatCard
            label={t('admin.deviceObservability.stats.overLimit')}
            value={summary.users_over_limit}
            tone="red"
          />
          <StatCard
            label={t('admin.deviceObservability.stats.atLimit')}
            value={summary.users_at_limit}
            tone="yellow"
          />
          <StatCard
            label={t('admin.deviceObservability.stats.unlimited')}
            value={summary.users_with_unlimited_limit}
            tone="violet"
          />
        </div>
      )}

      {summary && summary.missing_from_traffic > 0 && (
        <div className="rounded-xl border border-warning-500/25 bg-warning-500/10 px-3 py-2 text-xs text-warning-200">
          {t('admin.deviceObservability.stats.missingFromTraffic', {
            count: summary.missing_from_traffic,
          })}
        </div>
      )}

      <div className="rounded-xl border border-dark-700 bg-dark-900/40 p-3">
        <div className="mb-3 grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.deviceObservability.filters.searchPlaceholder')}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2 pl-10 pr-4 text-sm text-dark-100 placeholder-dark-500 focus:border-dark-600 focus:outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
              <SearchIcon />
            </div>
          </div>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as FilterMode)}
            className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 focus:border-dark-600 focus:outline-none"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="flex-1 rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-100 focus:border-dark-600 focus:outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
              className="rounded-xl border border-dark-700 bg-dark-800 px-3 py-2 text-xs text-dark-200 transition-colors hover:border-dark-600 hover:bg-dark-700"
              title={t('admin.deviceObservability.filters.direction')}
            >
              {sortDirection === 'desc'
                ? t('admin.deviceObservability.filters.desc')
                : t('admin.deviceObservability.filters.asc')}
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-dark-400">
          <span>
            {t('admin.deviceObservability.table.totalRows', {
              count: sortedRows.length,
            })}
          </span>
          <div className="flex items-center gap-2">
            <span>{t('admin.deviceObservability.filters.pageSize')}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 text-xs text-dark-200"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : pagedRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-dark-400">
            {t('admin.deviceObservability.table.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-dark-700">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-dark-700 bg-dark-800/70">
                  <th className="px-3 py-2 text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.rank')}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.user')}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.subscriptionStatus')}
                  </th>
                  <th className="px-3 py-2 text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.tariff')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.limit')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.connected')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.delta')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-dark-400">
                    {t('admin.deviceObservability.table.usage')}
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-dark-400">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, index) => {
                  const rank = pageStartIndex + index + 1;
                  const rowClass =
                    row.over_limit_by > 0
                      ? 'bg-error-500/5 hover:bg-error-500/10'
                      : row.is_unlimited_limit
                        ? 'bg-violet-500/5 hover:bg-violet-500/10'
                        : 'hover:bg-dark-800/40';

                  return (
                    <tr
                      key={row.user_id}
                      className={`cursor-pointer border-b border-dark-700/60 transition-colors ${rowClass}`}
                      onClick={() => navigate(`/admin/users/${row.user_id}`)}
                    >
                      <td className="px-3 py-2 text-xs text-dark-400">{rank}</td>
                      <td className="px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-dark-100">{row.full_name}</div>
                          <div className="truncate text-xs text-dark-500">
                            {row.username ? `@${row.username}` : `#${row.user_id}`}
                            {row.telegram_id ? ` · ${row.telegram_id}` : ''}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${getSubscriptionTone(row.subscription_status)}`}>
                          {statusLabel(row.subscription_status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-dark-300">
                        {row.tariff_name || t('admin.trafficUsage.noTariff')}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-dark-200">
                        {row.is_unlimited_limit ? '∞' : row.device_limit}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-semibold text-dark-100">
                        {row.devices_connected}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.devices_delta === null ? (
                          <span className="text-dark-500">∞</span>
                        ) : row.devices_delta > 0 ? (
                          <span className="font-semibold text-error-300">+{row.devices_delta}</span>
                        ) : row.devices_delta === 0 ? (
                          <span className="text-warning-300">0</span>
                        ) : (
                          <span className="text-success-300">{row.devices_delta}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">
                        {row.utilization_percent === null ? (
                          <span className="text-dark-500">∞</span>
                        ) : row.utilization_percent >= 100 ? (
                          <span className="font-semibold text-error-300">{row.utilization_percent}%</span>
                        ) : row.utilization_percent >= 80 ? (
                          <span className="text-warning-300">{row.utilization_percent}%</span>
                        ) : (
                          <span className="text-success-300">{row.utilization_percent}%</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              openUserDevices(row);
                            }}
                            className="rounded-lg border border-dark-600 bg-dark-800 px-2 py-1 text-xs text-dark-200 transition-colors hover:border-dark-500 hover:bg-dark-700"
                          >
                            {t('admin.deviceObservability.table.viewDevices')}
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/admin/users/${row.user_id}`);
                            }}
                            className="rounded-lg border border-accent-500/40 bg-accent-500/10 px-2 py-1 text-xs text-accent-300 transition-colors hover:bg-accent-500/20"
                          >
                            {t('admin.deviceObservability.table.openProfile')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {sortedRows.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs text-dark-400">
            <span>
              {(currentPage - 1) * pageSize + 1}
              {'\u2013'}
              {Math.min(currentPage * pageSize, sortedRows.length)} / {sortedRows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 transition-colors hover:bg-dark-700 disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <span>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 transition-colors hover:bg-dark-700 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
          <div className="w-full max-w-2xl rounded-2xl border border-dark-700 bg-dark-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-dark-700 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-dark-100">
                  {t('admin.deviceObservability.deviceModal.title', { name: selectedUser.full_name })}
                </h2>
                <p className="text-xs text-dark-400">
                  {t('admin.deviceObservability.deviceModal.subtitle', {
                    connected: selectedUser.devices_connected,
                    limit: userDevicesLimit === null ? '—' : userDevicesLimit === 0 ? '∞' : userDevicesLimit,
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg px-2 py-1 text-xs text-dark-300 transition-colors hover:bg-dark-800 hover:text-dark-100"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
              {userDevicesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : userDevicesError ? (
                <div className="rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2 text-sm text-error-300">
                  {userDevicesError}
                </div>
              ) : userDevices.length === 0 ? (
                <div className="py-8 text-center text-sm text-dark-400">
                  {t('admin.deviceObservability.deviceModal.empty')}
                </div>
              ) : (
                <div className="space-y-2">
                  {userDevices.map((device) => (
                    <div
                      key={device.hwid}
                      className="rounded-xl border border-dark-700 bg-dark-800/60 px-3 py-2"
                    >
                      <div className="text-sm text-dark-100">
                        {device.platform || device.device_model || t('admin.deviceObservability.deviceModal.unknownDevice')}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-dark-500">
                        {device.device_model && <span>{device.device_model}</span>}
                        <span className="font-mono">{device.hwid}</span>
                        {device.created_at && (
                          <span>
                            {new Date(device.created_at).toLocaleString(
                              i18n.language === 'ru' ? 'ru-RU' : 'en-US',
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-dark-700 px-4 py-3">
              <span className="text-xs text-dark-400">
                {t('admin.deviceObservability.deviceModal.total', { count: userDevicesTotal })}
              </span>
              <button
                onClick={() => navigate(`/admin/users/${selectedUser.user_id}`)}
                className="rounded-lg border border-accent-500/40 bg-accent-500/10 px-3 py-1.5 text-xs text-accent-300 transition-colors hover:bg-accent-500/20"
              >
                {t('admin.deviceObservability.deviceModal.openProfile')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
