import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowData,
} from '@tanstack/react-table';
import {
  adminTrafficApi,
  type UserTrafficItem,
  type TrafficNodeInfo,
  type TrafficParams,
} from '../api/adminTraffic';
import { usePlatform } from '../platform/hooks/usePlatform';

// ============ TanStack Table module augmentation ============

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    sticky?: boolean;
    align?: 'left' | 'center';
    bold?: boolean;
  }
}

// ============ Utils ============

const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const toBackendSortField = (columnId: string): string => {
  if (columnId === 'user') return 'full_name';
  return columnId;
};

const formatDateForInput = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ============ Icons ============

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const RefreshIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) => (
  <svg
    className="ml-1 inline h-3 w-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
      />
    )}
  </svg>
);

const FilterIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const ServerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
    />
  </svg>
);

const XIcon = () => (
  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============ Progress Bar ============

function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);
      // Fast initial progress, then slow down
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 8;
          if (prev < 60) return prev + 3;
          if (prev < 85) return prev + 1;
          if (prev < 95) return prev + 0.3;
          return prev;
        });
      }, 100);
    } else {
      if (visible) {
        setProgress(100);
        clearInterval(intervalRef.current);
        const timer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [loading, visible]);

  if (!visible) return null;

  return (
    <div className="absolute left-0 right-0 top-0 z-50 h-0.5 overflow-hidden rounded-full bg-dark-700/50">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============ Checkbox helper ============

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
        checked ? 'border-accent-500 bg-accent-500' : 'border-dark-600'
      }`}
    >
      {checked && (
        <svg
          className="h-3 w-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </span>
  );
}

// ============ Status dot helper ============

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  trial: 'bg-yellow-500',
  expired: 'bg-red-500',
  disabled: 'bg-gray-500',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[status] || 'bg-gray-500'}`}
    />
  );
}

// ============ Components ============

const PERIODS = [1, 3, 7, 14, 30] as const;

function PeriodSelector({
  value,
  onChange,
  label,
  dateMode,
  onToggleDateMode,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  dateMode: boolean;
  onToggleDateMode: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-dark-400">{label}</span>
      {!dateMode && (
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                value === p
                  ? 'bg-accent-500 text-white'
                  : 'bg-dark-800 text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              }`}
            >
              {p}
              {t('admin.trafficUsage.days')}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onToggleDateMode}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
          dateMode
            ? 'bg-accent-500 text-white'
            : 'bg-dark-800 text-dark-400 hover:bg-dark-700 hover:text-dark-200'
        }`}
      >
        <CalendarIcon />
        {t('admin.trafficUsage.customDates')}
      </button>
    </div>
  );
}

function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClose,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const today = formatDateForInput(new Date());
  const minDate = formatDateForInput(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000));

  return (
    <div className="flex items-center gap-2">
      <CalendarIcon />
      <label className="text-xs text-dark-400">{t('admin.trafficUsage.dateFrom')}</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        min={minDate}
        max={endDate || today}
        className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 text-xs text-dark-200 focus:border-dark-600 focus:outline-none"
      />
      <label className="text-xs text-dark-400">{t('admin.trafficUsage.dateTo')}</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        min={startDate || minDate}
        max={today}
        className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1 text-xs text-dark-200 focus:border-dark-600 focus:outline-none"
      />
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
      >
        <XIcon />
      </button>
    </div>
  );
}

function TariffFilter({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (tariff: string) => {
    const next = new Set(selected);
    if (next.has(tariff)) {
      next.delete(tariff);
    } else {
      next.add(tariff);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeCount > 0
            ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
            : 'border-dark-700 bg-dark-800 text-dark-200 hover:border-dark-600 hover:bg-dark-700'
        }`}
      >
        <FilterIcon />
        {t('admin.trafficUsage.tariff')}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
          <button
            onClick={selectAll}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-dark-700 ${
              allSelected ? 'text-accent-400' : 'text-dark-300'
            }`}
          >
            <Checkbox checked={allSelected} />
            {t('admin.trafficUsage.allTariffs')}
          </button>

          <div className="mx-2 border-t border-dark-700" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((tariff) => (
              <button
                key={tariff}
                onClick={() => toggle(tariff)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-dark-300 transition-colors hover:bg-dark-700"
              >
                <Checkbox checked={selected.has(tariff)} />
                {tariff}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NodeFilter({
  available,
  selected,
  onChange,
}: {
  available: TrafficNodeInfo[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (nodeUuid: string) => {
    const next = new Set(selected);
    if (next.has(nodeUuid)) {
      next.delete(nodeUuid);
    } else {
      next.add(nodeUuid);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeCount > 0
            ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
            : 'border-dark-700 bg-dark-800 text-dark-200 hover:border-dark-600 hover:bg-dark-700'
        }`}
      >
        <ServerIcon />
        {t('admin.trafficUsage.nodes')}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
          <button
            onClick={selectAll}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-dark-700 ${
              allSelected ? 'text-accent-400' : 'text-dark-300'
            }`}
          >
            <Checkbox checked={allSelected} />
            {t('admin.trafficUsage.allNodes')}
          </button>

          <div className="mx-2 border-t border-dark-700" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((node) => (
              <button
                key={node.node_uuid}
                onClick={() => toggle(node.node_uuid)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-dark-300 transition-colors hover:bg-dark-700"
              >
                <Checkbox checked={selected.has(node.node_uuid)} />
                {getFlagEmoji(node.country_code)} {node.node_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusFilter({
  available,
  selected,
  onChange,
}: {
  available: string[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const statusLabels: Record<string, string> = {
    active: t('admin.trafficUsage.statusActive'),
    trial: t('admin.trafficUsage.statusTrial'),
    expired: t('admin.trafficUsage.statusExpired'),
    disabled: t('admin.trafficUsage.statusDisabled'),
  };

  const toggle = (status: string) => {
    const next = new Set(selected);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeCount > 0
            ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
            : 'border-dark-700 bg-dark-800 text-dark-200 hover:border-dark-600 hover:bg-dark-700'
        }`}
      >
        <FilterIcon />
        {t('admin.trafficUsage.status')}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-56 rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
          <button
            onClick={selectAll}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-dark-700 ${
              allSelected ? 'text-accent-400' : 'text-dark-300'
            }`}
          >
            <Checkbox checked={allSelected} />
            {t('admin.trafficUsage.allStatuses')}
          </button>

          <div className="mx-2 border-t border-dark-700" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((status) => (
              <button
                key={status}
                onClick={() => toggle(status)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-dark-300 transition-colors hover:bg-dark-700"
              >
                <Checkbox checked={selected.has(status)} />
                <StatusDot status={status} />
                {statusLabels[status] || status}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Main Page ============

export default function AdminTrafficUsage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [items, setItems] = useState<UserTrafficItem[]>([]);
  const [nodes, setNodes] = useState<TrafficNodeInfo[]>([]);
  const [allNodes, setAllNodes] = useState<TrafficNodeInfo[]>([]);
  const [availableTariffs, setAvailableTariffs] = useState<string[]>([]);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedTariffs, setSelectedTariffs] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [dateMode, setDateMode] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_bytes', desc: true }]);
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>({});

  const limit = 50;
  const hasData = items.length > 0 || nodes.length > 0;

  const sortBy = sorting[0] ? toBackendSortField(sorting[0].id) : 'total_bytes';
  const sortDesc = sorting[0]?.desc ?? true;
  const tariffsParam = selectedTariffs.size > 0 ? [...selectedTariffs].join(',') : undefined;
  const nodesParam = selectedNodes.size > 0 ? [...selectedNodes].join(',') : undefined;
  const statusesParam = selectedStatuses.size > 0 ? [...selectedStatuses].join(',') : undefined;

  const buildParams = useCallback(
    (): TrafficParams => ({
      period: dateMode ? undefined : period,
      limit,
      offset,
      search: committedSearch || undefined,
      sort_by: sortBy,
      sort_desc: sortDesc,
      tariffs: tariffsParam,
      nodes: nodesParam,
      statuses: statusesParam,
      start_date: dateMode && customStart ? customStart : undefined,
      end_date: dateMode && customEnd ? customEnd : undefined,
    }),
    [
      period,
      offset,
      committedSearch,
      sortBy,
      sortDesc,
      tariffsParam,
      nodesParam,
      statusesParam,
      dateMode,
      customStart,
      customEnd,
    ],
  );

  const applyData = useCallback(
    (data: {
      items: UserTrafficItem[];
      nodes: TrafficNodeInfo[];
      total: number;
      available_tariffs: string[];
      available_statuses: string[];
    }) => {
      setItems(data.items);
      setNodes(data.nodes);
      setTotal(data.total);
      setAvailableTariffs(data.available_tariffs);
      setAvailableStatuses(data.available_statuses);
    },
    [],
  );

  const loadData = useCallback(
    async (skipCache = false) => {
      const params = buildParams();

      // In date mode, require both dates
      if (dateMode && (!customStart || !customEnd)) return;

      // Check cache first — apply instantly without any loading state
      if (!skipCache) {
        const cached = adminTrafficApi.getCached(params);
        if (cached) {
          applyData(cached);
          setInitialLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        const data = await adminTrafficApi.getTrafficUsage(params, { skipCache });
        applyData(data);
      } catch {
        // silently fail — keep stale data visible
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [buildParams, applyData, dateMode, customStart, customEnd],
  );

  // Load on param change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Track all available nodes (before node filtering) — fetch once on mount with default params
  useEffect(() => {
    const fetchAllNodes = async () => {
      const params: TrafficParams = {
        period: 30,
        limit: 1,
        offset: 0,
        sort_by: 'total_bytes',
        sort_desc: true,
      };
      try {
        const data = await adminTrafficApi.getTrafficUsage(params);
        setAllNodes(data.nodes);
      } catch {
        // ignore
      }
    };
    fetchAllNodes();
  }, []);

  // Update allNodes when we get unfiltered response
  useEffect(() => {
    if (selectedNodes.size === 0 && nodes.length > 0) {
      setAllNodes(nodes);
    }
  }, [nodes, selectedNodes.size]);

  // Prefetch adjacent periods in background (only in period mode)
  useEffect(() => {
    if (dateMode) return;
    const prefetchPeriods = PERIODS.filter((p) => p !== period);
    const timer = setTimeout(() => {
      prefetchPeriods.forEach((p) => {
        const params: TrafficParams = {
          period: p,
          limit,
          offset: 0,
          sort_by: 'total_bytes',
          sort_desc: true,
        };
        if (!adminTrafficApi.getCached(params)) {
          adminTrafficApi.getTrafficUsage(params).catch(() => {});
        }
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [period, dateMode]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setCommittedSearch(searchInput);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await adminTrafficApi.exportCsv({
        period,
        start_date: dateMode && customStart ? customStart : undefined,
        end_date: dateMode && customEnd ? customEnd : undefined,
        tariffs: tariffsParam,
        nodes: nodesParam,
        statuses: statusesParam,
        search: committedSearch || undefined,
      });
      setToast({ message: t('admin.trafficUsage.exportSuccess'), type: 'success' });
    } catch {
      setToast({ message: t('admin.trafficUsage.exportError'), type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handlePeriodChange = (p: number) => {
    setPeriod(p);
    setOffset(0);
  };

  const handleSortingChange = (updater: SortingState | ((old: SortingState) => SortingState)) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setSorting(next);
    setOffset(0);
  };

  const handleTariffChange = (next: Set<string>) => {
    setSelectedTariffs(next);
    setOffset(0);
  };

  const handleNodeChange = (next: Set<string>) => {
    setSelectedNodes(next);
    setOffset(0);
  };

  const handleStatusChange = (next: Set<string>) => {
    setSelectedStatuses(next);
    setOffset(0);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  const handleToggleDateMode = () => {
    if (!dateMode) {
      const today = new Date();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setCustomStart(formatDateForInput(weekAgo));
      setCustomEnd(formatDateForInput(today));
    }
    setDateMode(!dateMode);
    setOffset(0);
  };

  const handleCustomStartChange = (v: string) => {
    setCustomStart(v);
    setOffset(0);
  };

  const handleCustomEndChange = (v: string) => {
    setCustomEnd(v);
    setOffset(0);
  };

  const columns = useMemo<ColumnDef<UserTrafficItem>[]>(() => {
    const cols: ColumnDef<UserTrafficItem>[] = [
      {
        id: 'user',
        accessorFn: (row) => row.full_name,
        header: t('admin.trafficUsage.user'),
        enableSorting: true,
        size: 200,
        minSize: 140,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-medium text-white">
                {item.full_name?.[0] || '?'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-dark-100">{item.full_name}</div>
                {item.username && (
                  <div className="truncate text-xs text-dark-500">@{item.username}</div>
                )}
              </div>
            </div>
          );
        },
        meta: { sticky: true },
      },
      {
        accessorKey: 'tariff_name',
        header: t('admin.trafficUsage.tariff'),
        enableSorting: true,
        size: 120,
        minSize: 80,
        cell: ({ getValue }) => (
          <span className="text-xs text-dark-300">
            {(getValue() as string | null) || t('admin.trafficUsage.noTariff')}
          </span>
        ),
      },
      {
        id: 'device_limit',
        accessorFn: (row) => row.device_limit,
        header: t('admin.trafficUsage.devices'),
        enableSorting: true,
        size: 80,
        minSize: 60,
        meta: { align: 'center' as const },
        cell: ({ row }) => {
          const item = row.original;
          const connected = item.connected_devices;
          const limit = item.device_limit;
          return (
            <span className="text-xs">
              <span className={connected > 0 ? 'text-accent-400' : 'text-dark-500'}>
                {connected}
              </span>
              <span className="text-dark-500">/{limit}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'traffic_limit_gb',
        header: t('admin.trafficUsage.trafficLimit'),
        enableSorting: true,
        size: 80,
        minSize: 60,
        meta: { align: 'center' as const },
        cell: ({ getValue }) => {
          const gb = getValue() as number;
          return <span className="text-xs text-dark-300">{gb > 0 ? `${gb} GB` : '\u221E'}</span>;
        },
      },
      ...nodes.map(
        (node): ColumnDef<UserTrafficItem> => ({
          id: `node_${node.node_uuid}`,
          accessorFn: (row) => row.node_traffic[node.node_uuid] || 0,
          header: `${getFlagEmoji(node.country_code)} ${node.node_name}`,
          enableSorting: true,
          size: 110,
          minSize: 80,
          meta: { align: 'center' as const },
          cell: ({ getValue }) => {
            const bytes = getValue() as number;
            return (
              <span className="text-xs text-dark-300">
                {bytes > 0 ? formatBytes(bytes) : '\u2014'}
              </span>
            );
          },
        }),
      ),
      {
        accessorKey: 'total_bytes',
        header: t('admin.trafficUsage.total'),
        enableSorting: true,
        size: 110,
        minSize: 80,
        meta: { align: 'center' as const, bold: true },
        cell: ({ getValue }) => {
          const bytes = getValue() as number;
          return (
            <span className="text-xs font-semibold text-dark-100">
              {bytes > 0 ? formatBytes(bytes) : '\u2014'}
            </span>
          );
        },
      },
    ];
    return cols;
  }, [nodes, t]);

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnSizing },
    onSortingChange: handleSortingChange,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="relative animate-fade-in">
      {/* Progress bar — shown during background refresh */}
      <ProgressBar loading={loading} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border px-4 py-2 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-success-500/30 bg-success-500/20 text-success-400'
              : 'border-error-500/30 bg-error-500/20 text-error-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
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
            <h1 className="text-xl font-bold text-dark-100">{t('admin.trafficUsage.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.trafficUsage.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {dateMode ? (
            <DateRangePicker
              startDate={customStart}
              endDate={customEnd}
              onStartChange={handleCustomStartChange}
              onEndChange={handleCustomEndChange}
              onClose={handleToggleDateMode}
            />
          ) : (
            <PeriodSelector
              value={period}
              onChange={handlePeriodChange}
              label={t('admin.trafficUsage.period')}
              dateMode={dateMode}
              onToggleDateMode={handleToggleDateMode}
            />
          )}
          <TariffFilter
            available={availableTariffs}
            selected={selectedTariffs}
            onChange={handleTariffChange}
          />
          <NodeFilter available={allNodes} selected={selectedNodes} onChange={handleNodeChange} />
          <StatusFilter
            available={availableStatuses}
            selected={selectedStatuses}
            onChange={handleStatusChange}
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-xs font-medium text-dark-200 transition-colors hover:border-dark-600 hover:bg-dark-700 disabled:opacity-50"
          >
            <DownloadIcon />
            {t('admin.trafficUsage.exportCsv')}
          </button>
        </div>

        <form onSubmit={handleSearch}>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('admin.trafficUsage.search')}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2 pl-10 pr-4 text-dark-100 placeholder-dark-500 focus:border-dark-600 focus:outline-none"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
              <SearchIcon />
            </div>
          </div>
        </form>
      </div>

      {/* Table */}
      {initialLoading && !hasData ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : !hasData && !loading ? (
        <div className="py-12 text-center text-dark-400">{t('admin.trafficUsage.noData')}</div>
      ) : (
        <div
          className={`transition-opacity duration-200 ${loading && hasData ? 'opacity-70' : 'opacity-100'}`}
        >
          <div className="overflow-x-auto rounded-xl border border-dark-700">
            <table className="text-left text-sm" style={{ width: table.getCenterTotalSize() }}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-dark-700 bg-dark-800/80">
                    {headerGroup.headers.map((header) => {
                      const meta = header.column.columnDef.meta;
                      const isSticky = meta?.sticky;
                      const align = meta?.align === 'center' ? 'text-center' : 'text-left';
                      const isBold = meta?.bold;

                      return (
                        <th
                          key={header.id}
                          className={`relative px-3 py-2 text-xs font-medium ${
                            isBold ? 'font-semibold text-dark-200' : 'text-dark-400'
                          } ${align} ${
                            isSticky ? 'sticky left-0 z-10 bg-dark-800' : ''
                          } ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-dark-200' : ''}`}
                          style={{ width: header.getSize() }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <SortIcon direction={header.column.getIsSorted()} />
                          )}
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none ${
                              header.column.getIsResizing()
                                ? 'bg-accent-500'
                                : 'bg-transparent hover:bg-dark-500'
                            }`}
                          />
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-dark-700/50 transition-colors hover:bg-dark-800/50"
                    onClick={() => navigate(`/admin/users/${row.original.user_id}`)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta;
                      const isSticky = meta?.sticky;
                      const align = meta?.align === 'center' ? 'text-center' : 'text-left';

                      return (
                        <td
                          key={cell.id}
                          className={`px-3 py-2 ${align} ${
                            isSticky ? 'sticky left-0 z-10 bg-dark-900' : ''
                          }`}
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-dark-400">
            {offset + 1}
            {'\u2013'}
            {Math.min(offset + limit, total)} / {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              <ChevronLeftIcon />
            </button>
            <span className="px-3 py-2 text-dark-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
