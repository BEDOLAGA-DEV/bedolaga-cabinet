import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { rbacApi, AuditLogEntry, AuditLogFilters } from '@/api/rbac';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePlatform } from '@/platform/hooks/usePlatform';

// === Icons ===

const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const FilterIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
    />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className || 'h-4 w-4'}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
    />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

// === Constants ===

const RESOURCE_TYPES = [
  'users',
  'tickets',
  'roles',
  'policies',
  'settings',
  'broadcasts',
  'tariffs',
  'servers',
  'payments',
  'campaigns',
  'promocodes',
] as const;

const STATUS_OPTIONS = ['success', 'denied', 'error'] as const;

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

const AUTO_REFRESH_INTERVAL = 30_000;

interface FiltersState {
  action: string;
  resource: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FiltersState = {
  action: '',
  resource: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

// === Utility functions ===

function formatRelativeTime(
  dateString: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('admin.auditLog.time.justNow');
  if (diffMin < 60) return t('admin.auditLog.time.minutesAgo', { count: diffMin });
  if (diffHour < 24) return t('admin.auditLog.time.hoursAgo', { count: diffHour });
  if (diffDay < 30) return t('admin.auditLog.time.daysAgo', { count: diffDay });
  return date.toLocaleDateString();
}

function formatAbsoluteTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

// === Sub-components ===

interface StatusBadgeProps {
  status: string;
  label: string;
}

function StatusBadge({ status, label }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    success: 'bg-green-500/20 text-green-400',
    denied: 'bg-red-500/20 text-red-400',
    error: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorMap[status] || 'bg-dark-600 text-dark-300'}`}
    >
      {label}
    </span>
  );
}

interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: MethodBadgeProps) {
  const colorMap: Record<string, string> = {
    GET: 'bg-blue-500/20 text-blue-400',
    POST: 'bg-green-500/20 text-green-400',
    PUT: 'bg-amber-500/20 text-amber-400',
    PATCH: 'bg-amber-500/20 text-amber-400',
    DELETE: 'bg-red-500/20 text-red-400',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-medium ${colorMap[method] || 'bg-dark-600 text-dark-300'}`}
    >
      {method}
    </span>
  );
}

interface LogEntryCardProps {
  entry: AuditLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

function LogEntryCard({ entry, isExpanded, onToggle }: LogEntryCardProps) {
  const { t } = useTranslation();
  const status = entry.status;
  const method = entry.request_method?.toUpperCase() ?? null;
  const requestPath = entry.request_path;
  const userName = entry.user_first_name || entry.user_email || t('admin.auditLog.unknownUser');

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600">
      {/* Main row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:gap-4"
        aria-expanded={isExpanded}
      >
        {/* Timestamp */}
        <div
          className="shrink-0 text-sm text-dark-400"
          title={formatAbsoluteTime(entry.created_at)}
        >
          {formatRelativeTime(entry.created_at, t)}
        </div>

        {/* User */}
        <div className="min-w-0 shrink-0">
          <span className="text-sm font-medium text-dark-200">{userName}</span>
        </div>

        {/* Action + status */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <StatusBadge
            status={status}
            label={t(`admin.auditLog.status.${status}`, { defaultValue: status })}
          />
          <span className="truncate text-sm font-medium text-dark-100">{entry.action}</span>
        </div>

        {/* Resource */}
        <div className="flex shrink-0 items-center gap-2 text-sm text-dark-400">
          <span>{entry.resource_type}</span>
          {entry.resource_id && (
            <span className="rounded bg-dark-700 px-1.5 py-0.5 font-mono text-xs text-dark-300">
              #{entry.resource_id}
            </span>
          )}
        </div>

        {/* Method badge */}
        {method && (
          <div className="shrink-0">
            <MethodBadge method={method} />
          </div>
        )}

        {/* IP */}
        {entry.ip_address && (
          <div className="shrink-0 font-mono text-xs text-dark-500">{entry.ip_address}</div>
        )}

        {/* Expand indicator */}
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-dark-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-dark-700 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* User agent */}
            {entry.user_agent && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                  {t('admin.auditLog.details.userAgent')}
                </p>
                <p className="break-all text-sm text-dark-300">{entry.user_agent}</p>
              </div>
            )}

            {/* Request path */}
            {requestPath && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                  {t('admin.auditLog.details.requestPath')}
                </p>
                <p className="break-all font-mono text-sm text-dark-300">{requestPath}</p>
              </div>
            )}

            {/* IP Address */}
            {entry.ip_address && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                  {t('admin.auditLog.details.ipAddress')}
                </p>
                <p className="font-mono text-sm text-dark-300">{entry.ip_address}</p>
              </div>
            )}

            {/* Timestamp */}
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                {t('admin.auditLog.details.timestamp')}
              </p>
              <p className="text-sm text-dark-300">{formatAbsoluteTime(entry.created_at)}</p>
            </div>

            {/* Before/after diff */}
            {entry.details && 'before' in entry.details && entry.details.before != null && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                  {t('admin.auditLog.details.before')}
                </p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-dark-900 p-2 text-xs text-dark-300">
                  {JSON.stringify(entry.details.before, null, 2)}
                </pre>
              </div>
            )}

            {entry.details && 'after' in entry.details && entry.details.after != null && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                  {t('admin.auditLog.details.after')}
                </p>
                <pre className="max-h-40 overflow-auto rounded-lg bg-dark-900 p-2 text-xs text-dark-300">
                  {JSON.stringify(entry.details.after, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Full details JSON */}
          {entry.details && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium uppercase text-dark-500">
                {t('admin.auditLog.details.fullDetails')}
              </p>
              <pre className="max-h-60 overflow-auto rounded-lg bg-dark-900 p-3 text-xs text-dark-300">
                {JSON.stringify(entry.details, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Main Page ===

export default function AdminAuditLog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  // Filter state
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Auto-refresh interval ref
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build query params
  const queryParams = useMemo((): AuditLogFilters => {
    const params: AuditLogFilters = {
      limit: pageSize,
      offset: page * pageSize,
    };

    if (appliedFilters.action.trim()) {
      params.action = appliedFilters.action.trim();
    }
    if (appliedFilters.resource) {
      params.resource_type = appliedFilters.resource;
    }
    if (appliedFilters.status) {
      params.status = appliedFilters.status;
    }
    if (appliedFilters.dateFrom) {
      params.date_from = appliedFilters.dateFrom;
    }
    if (appliedFilters.dateTo) {
      params.date_to = appliedFilters.dateTo;
    }

    return params;
  }, [appliedFilters, page, pageSize]);

  // Main query
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-audit-log', queryParams],
    queryFn: () => rbacApi.getAuditLog(queryParams),
    refetchInterval: autoRefresh ? AUTO_REFRESH_INTERVAL : false,
  });

  // Auto-refresh visual indicator
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        // The visual indicator updates are driven by isFetching from react-query
      }, AUTO_REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh]);

  const entries = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handlers
  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(0);
    setExpandedIds(new Set());
  }, [filters]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPage(0);
    setExpandedIds(new Set());
  }, []);

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const exportParams: AuditLogFilters = {};
      if (appliedFilters.action.trim()) exportParams.action = appliedFilters.action.trim();
      if (appliedFilters.resource) exportParams.resource_type = appliedFilters.resource;
      if (appliedFilters.dateFrom) exportParams.date_from = appliedFilters.dateFrom;
      if (appliedFilters.dateTo) exportParams.date_to = appliedFilters.dateTo;

      const blob = await rbacApi.exportAuditLog(exportParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t('admin.auditLog.exportError'));
    } finally {
      setExporting(false);
    }
  }, [appliedFilters, t]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  // Status is filtered server-side via query params
  const filteredEntries = entries;

  const hasActiveFilters = useMemo(() => {
    return (
      appliedFilters.action.trim() !== '' ||
      appliedFilters.resource !== '' ||
      appliedFilters.status !== '' ||
      appliedFilters.dateFrom !== '' ||
      appliedFilters.dateTo !== ''
    );
  }, [appliedFilters]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
              aria-label={t('admin.auditLog.back')}
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.auditLog.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.auditLog.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              autoRefresh
                ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
                : 'border-dark-700 bg-dark-800 text-dark-400 hover:border-dark-600 hover:text-dark-300'
            }`}
            title={t('admin.auditLog.autoRefresh.tooltip')}
          >
            <RefreshIcon className={`h-4 w-4 ${isFetching && autoRefresh ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('admin.auditLog.autoRefresh.label')}</span>
          </button>

          {/* Manual refresh */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dark-700 bg-dark-800 text-dark-400 transition-colors hover:border-dark-600 hover:text-dark-300 disabled:opacity-50"
            title={t('admin.auditLog.refresh')}
          >
            <RefreshIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {/* Export */}
          <PermissionGate permission="audit_log:export">
            <div className="flex items-center gap-2">
              {exportError && <p className="text-sm text-error-400">{exportError}</p>}
              <button
                onClick={() => {
                  setExportError(null);
                  handleExport();
                }}
                disabled={exporting}
                className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                <DownloadIcon />
                <span className="hidden sm:inline">
                  {exporting ? t('admin.auditLog.exporting') : t('admin.auditLog.exportCsv')}
                </span>
              </button>
            </div>
          </PermissionGate>
        </div>
      </div>

      {/* Filters bar */}
      <div className="mb-4 rounded-xl border border-dark-700 bg-dark-800">
        <button
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}
          className="flex w-full items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <FilterIcon />
            <span className="text-sm font-medium text-dark-200">
              {t('admin.auditLog.filters.title')}
            </span>
            {hasActiveFilters && (
              <span className="rounded-full bg-accent-500/20 px-2 py-0.5 text-xs font-medium text-accent-400">
                {t('admin.auditLog.filters.active')}
              </span>
            )}
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 text-dark-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {filtersOpen && (
          <div className="border-t border-dark-700 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Action search */}
              <div>
                <label
                  htmlFor="filter-action"
                  className="mb-1 block text-sm font-medium text-dark-300"
                >
                  {t('admin.auditLog.filters.action')}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
                    <SearchIcon />
                  </span>
                  <input
                    id="filter-action"
                    type="text"
                    value={filters.action}
                    onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                    className="w-full rounded-lg border border-dark-600 bg-dark-900 py-2 pl-9 pr-3 text-sm text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500"
                    placeholder={t('admin.auditLog.filters.actionPlaceholder')}
                  />
                </div>
              </div>

              {/* Resource type */}
              <div>
                <label
                  htmlFor="filter-resource"
                  className="mb-1 block text-sm font-medium text-dark-300"
                >
                  {t('admin.auditLog.filters.resource')}
                </label>
                <select
                  id="filter-resource"
                  value={filters.resource}
                  onChange={(e) => setFilters((prev) => ({ ...prev, resource: e.target.value }))}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500"
                >
                  <option value="">{t('admin.auditLog.filters.allResources')}</option>
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`admin.auditLog.resourceTypes.${type}`, { defaultValue: type })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="filter-status"
                  className="mb-1 block text-sm font-medium text-dark-300"
                >
                  {t('admin.auditLog.filters.status')}
                </label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500"
                >
                  <option value="">{t('admin.auditLog.filters.allStatuses')}</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {t(`admin.auditLog.status.${status}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label
                  htmlFor="filter-date-from"
                  className="mb-1 block text-sm font-medium text-dark-300"
                >
                  {t('admin.auditLog.filters.dateFrom')}
                </label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500"
                />
              </div>

              {/* Date to */}
              <div>
                <label
                  htmlFor="filter-date-to"
                  className="mb-1 block text-sm font-medium text-dark-300"
                >
                  {t('admin.auditLog.filters.dateTo')}
                </label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500"
                />
              </div>
            </div>

            {/* Filter actions */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleApplyFilters}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
              >
                {t('admin.auditLog.filters.apply')}
              </button>
              <button
                onClick={handleClearFilters}
                className="rounded-lg border border-dark-600 px-4 py-2 text-sm font-medium text-dark-300 transition-colors hover:border-dark-500 hover:text-dark-200"
              >
                {t('admin.auditLog.filters.clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results summary */}
      {!isLoading && !error && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-dark-400">
            {t('admin.auditLog.totalEntries', { count: total })}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-dark-500">
              {t('admin.auditLog.pagination.pageSize')}
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-dark-600 bg-dark-800 px-2 py-1 text-sm text-dark-200 outline-none focus:border-accent-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-error-400">{t('admin.auditLog.errors.loadFailed')}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm text-accent-400 transition-colors hover:text-accent-300"
          >
            {t('admin.auditLog.errors.retry')}
          </button>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.auditLog.noEntries')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <LogEntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedIds.has(entry.id)}
              onToggle={() => handleToggleExpand(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(0)}
            disabled={page === 0}
            className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('admin.auditLog.pagination.first')}
          >
            &laquo;
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('admin.auditLog.pagination.previous')}
          >
            &lsaquo;
          </button>

          <span className="px-3 py-2 text-sm text-dark-300">
            {t('admin.auditLog.pagination.pageOf', {
              current: page + 1,
              total: totalPages,
            })}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('admin.auditLog.pagination.next')}
          >
            &rsaquo;
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-dark-700 bg-dark-800 px-3 py-2 text-sm text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={t('admin.auditLog.pagination.last')}
          >
            &raquo;
          </button>
        </div>
      )}
    </div>
  );
}
