import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table';
import { adminUsersApi, type UserListItem, type UserListItemSubscription } from '../api/adminUsers';
import { tariffsApi, type TariffListItem } from '../api/tariffs';
import { promocodesApi, type PromoGroup } from '../api/promocodes';
import { campaignsApi, type CampaignListItem } from '../api/campaigns';
import { partnerApi, type AdminPartnerItem } from '../api/partners';
import {
  adminBulkActionsApi,
  type BulkActionType,
  type BulkActionParams,
  type BulkActionResult,
  type BulkProgressEvent,
} from '../api/adminBulkActions';
import { usePlatform } from '../platform/hooks/usePlatform';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '@/lib/utils';

// ============ Types ============

type SubscriptionStatusFilter = '' | 'active' | 'expired' | 'trial' | 'limited' | 'disabled';

interface ActionConfig {
  type: BulkActionType;
  labelKey: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface ProgressState {
  current: number;
  total: number;
  successCount: number;
  errorCount: number;
  log: BulkProgressEvent[];
}

interface ModalState {
  open: boolean;
  action: BulkActionType | null;
  loading: boolean;
  result: BulkActionResult | null;
  progress: ProgressState | null;
}

// ============ Icons ============

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

const CheckIcon = () => (
  <svg
    className="h-3 w-3 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XCloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronExpandIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={cn('h-4 w-4 text-white transition-transform duration-200', expanded && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

// ============ Action target helpers ============

const SUBSCRIPTION_LEVEL_ACTIONS: Set<BulkActionType> = new Set([
  'extend_subscription',
  'add_days',
  'cancel_subscription',
  'activate_subscription',
  'change_tariff',
  'add_traffic',
  'set_devices',
  'delete_subscription',
]);

function isSubscriptionLevelAction(action: BulkActionType): boolean {
  return SUBSCRIPTION_LEVEL_ACTIONS.has(action);
}

// ============ Subscription sub-row ============

interface SubscriptionSubRowProps {
  subscription: UserListItemSubscription;
  isSelected: boolean;
  onToggleSelect: () => void;
  isMultiTariff: boolean;
}

function SubscriptionSubRow({
  subscription,
  isSelected,
  onToggleSelect,
  isMultiTariff,
}: SubscriptionSubRowProps) {
  const { t } = useTranslation();

  const days = subscription.days_remaining;
  const daysColor =
    days === 0 ? 'text-error-400' : days <= 7 ? 'text-amber-400' : 'text-success-400';

  const trafficPercent =
    subscription.traffic_limit_gb > 0
      ? Math.min(100, (subscription.traffic_used_gb / subscription.traffic_limit_gb) * 100)
      : 0;
  const trafficBarColor =
    trafficPercent >= 90 ? 'bg-error-400' : trafficPercent >= 70 ? 'bg-amber-400' : 'bg-accent-400';

  return (
    <tr
      className={cn(
        'border-b border-dark-700/30 transition-colors',
        isSelected ? 'bg-accent-500/8' : 'bg-dark-850/40 hover:bg-dark-800/60',
      )}
    >
      {/* Checkbox cell */}
      <td className="px-3 py-2">
        {isMultiTariff && (
          <div className="flex items-center justify-center">
            <button
              onClick={onToggleSelect}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                isSelected
                  ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                  : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
              )}
              aria-label={
                isSelected
                  ? t('admin.bulkActions.deselectUser', { name: subscription.tariff_name || '' })
                  : t('admin.bulkActions.selectUser', { name: subscription.tariff_name || '' })
              }
            >
              {isSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={4}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>
          </div>
        )}
      </td>

      {/* Subscription info — spans remaining columns */}
      <td colSpan={7} className="px-3 py-2">
        <div className="flex items-center gap-3 pl-9">
          {/* Tariff name */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-dark-500" aria-hidden="true">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
            </span>
            <span className="text-xs font-semibold text-dark-200">
              {subscription.tariff_name || '—'}
            </span>
          </div>

          {/* Status */}
          <StatusBadge status={subscription.status} />

          {/* Days remaining */}
          <span className={cn('text-xs font-medium tabular-nums', daysColor)}>
            {days}
            <span className="ml-0.5 text-[10px] font-normal text-dark-500">
              {t('admin.bulkActions.daysUnit')}
            </span>
          </span>

          {/* Traffic progress */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] tabular-nums text-dark-400">
              {subscription.traffic_used_gb.toFixed(1)} {t('admin.bulkActions.trafficOf')}{' '}
              {subscription.traffic_limit_gb} {t('admin.bulkActions.trafficGbUnit')}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-dark-700/60">
              <div
                className={cn('h-full rounded-full transition-all duration-300', trafficBarColor)}
                style={{ width: `${trafficPercent}%` }}
              />
            </div>
          </div>

          {/* Devices */}
          <span className="flex items-center gap-1 text-xs text-dark-400">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
              />
            </svg>
            {subscription.device_limit}
          </span>
        </div>
      </td>
    </tr>
  );
}

// ============ Status badge ============

function StatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation();

  const config: Record<string, { class: string; labelKey: string }> = {
    active: {
      class: 'border-success-500/30 bg-success-500/15 text-success-400',
      labelKey: 'admin.bulkActions.statuses.active',
    },
    expired: {
      class: 'border-error-500/30 bg-error-500/15 text-error-400',
      labelKey: 'admin.bulkActions.statuses.expired',
    },
    trial: {
      class: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
      labelKey: 'admin.bulkActions.statuses.trial',
    },
    limited: {
      class: 'border-amber-500/30 bg-amber-500/15 text-amber-400',
      labelKey: 'admin.bulkActions.statuses.limited',
    },
    disabled: {
      class: 'border-dark-500/30 bg-dark-500/15 text-dark-400',
      labelKey: 'admin.bulkActions.statuses.disabled',
    },
  };

  const c = config[status || ''] || config.disabled;

  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium leading-tight',
        c.class,
      )}
    >
      {t(c.labelKey, status || '')}
    </span>
  );
}

// ============ Progress Bar ============

function ProgressBar({ loading }: { loading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setVisible(true);
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

// ============ Dropdown Select ============

interface DropdownOption {
  value: string;
  label: string;
}

function DropdownSelect({
  value,
  options,
  onChange,
  className,
}: {
  value: string;
  options: DropdownOption[];
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 pr-8 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-dark-500">
        <ChevronDownIcon />
      </div>
    </div>
  );
}

// ============ Multi-Select Dropdown ============

interface MultiSelectOption {
  value: number;
  label: string;
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  placeholder: string;
  className?: string;
}

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: MultiSelectDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const buttonLabel = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length <= 2) {
      return selected
        .map((id) => options.find((o) => o.value === id)?.label)
        .filter(Boolean)
        .join(', ');
    }
    return t('admin.bulkActions.filters.tariffsSelected', { count: selected.length });
  }, [selected, options, placeholder, t]);

  const handleToggle = (value: number) => {
    if (selected.includes(value)) {
      onChange(selected.filter((id) => id !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between rounded-xl border bg-dark-800 px-3 py-2.5 text-left text-sm outline-none transition-colors',
          open
            ? 'border-accent-500/40 shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)]'
            : 'border-dark-700',
          selected.length > 0 ? 'text-dark-100' : 'text-dark-500',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{buttonLabel}</span>
        <div
          className={cn('ml-2 shrink-0 text-dark-500 transition-transform', open && 'rotate-180')}
        >
          <ChevronDownIcon />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-2xl">
          {/* Select all / Deselect all */}
          <div className="flex items-center gap-1 border-b border-dark-700/50 px-3 py-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-medium text-accent-400 transition-colors hover:text-accent-300"
            >
              {t('admin.bulkActions.filters.selectAll')}
            </button>
            <span className="text-dark-600">/</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-xs font-medium text-dark-400 transition-colors hover:text-dark-300"
            >
              {t('admin.bulkActions.filters.deselectAll')}
            </button>
          </div>

          {/* Options */}
          {options.map((option) => {
            const isChecked = selected.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-dark-700/50"
                role="option"
                aria-selected={isChecked}
              >
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150',
                    isChecked
                      ? 'border-accent-500 bg-accent-500'
                      : 'border-dark-500 bg-dark-700/60',
                  )}
                >
                  {isChecked && (
                    <svg
                      className="h-2.5 w-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={4}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </div>
                <span className={cn('text-sm', isChecked ? 'text-dark-100' : 'text-dark-300')}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============ Progress View ============

function ProgressView({ progress }: { progress: ProgressState }) {
  const { t } = useTranslation();
  const logEndRef = useRef<HTMLDivElement>(null);
  const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progress.log.length]);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-dark-200">
            {t('admin.bulkActions.progress.processed', {
              current: progress.current,
              total: progress.total,
            })}
          </span>
          <span className="font-bold tabular-nums text-accent-400">{percentage}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-dark-700/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Counters */}
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-success-400" />
          <span className="text-sm tabular-nums text-success-400">{progress.successCount}</span>
          <span className="text-xs text-dark-500">{t('admin.bulkActions.progress.succeeded')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-error-400" />
          <span className="text-sm tabular-nums text-error-400">{progress.errorCount}</span>
          <span className="text-xs text-dark-500">{t('admin.bulkActions.progress.failed')}</span>
        </div>
      </div>

      {/* Live log */}
      {progress.log.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-dark-700 bg-dark-800/50 p-3">
          <div className="space-y-1">
            {progress.log.slice(-10).map((entry, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                {entry.success ? (
                  <span className="mt-0.5 shrink-0 text-success-400" aria-hidden="true">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </span>
                ) : (
                  <span className="mt-0.5 shrink-0 text-error-400" aria-hidden="true">
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
                <span className="font-mono text-dark-400">
                  {entry.username ? `@${entry.username}` : `#${entry.user_id}`}
                </span>
                <span className={entry.success ? 'text-dark-300' : 'text-error-300'}>
                  {entry.success
                    ? entry.message || t('admin.bulkActions.progress.ok')
                    : entry.message || entry.error || t('admin.bulkActions.progress.errorGeneric')}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Error Details ============

function ErrorDetails({ result }: { result: BulkActionResult }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (result.error_count === 0 || result.errors.length === 0) return null;

  return (
    <div className="rounded-xl border border-error-500/20 bg-error-500/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-medium text-error-400">
          {t('admin.bulkActions.errors.title', { count: result.error_count })}
        </span>
        <svg
          className={cn(
            'h-4 w-4 text-error-400 transition-transform duration-200',
            expanded && 'rotate-180',
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="max-h-48 overflow-y-auto border-t border-error-500/20 px-4 py-3">
          <div className="space-y-2">
            {result.errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 shrink-0 text-error-400" aria-hidden="true">
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="shrink-0 font-mono text-dark-400">
                  {err.username ? `@${err.username}` : `#${err.user_id}`}
                </span>
                <span className="text-error-300">{err.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Action Modal ============

interface ActionModalProps {
  modal: ModalState;
  selectedCount: number;
  tariffs: TariffListItem[];
  promoGroups: PromoGroup[];
  users: UserListItem[];
  selectedSubscriptionIds: number[];
  onClose: () => void;
  onExecute: (params: BulkActionParams) => void;
}

function ActionModal({
  modal,
  selectedCount,
  tariffs,
  promoGroups,
  users,
  selectedSubscriptionIds,
  onClose,
  onExecute,
}: ActionModalProps) {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const [tariffId, setTariffId] = useState<number>(tariffs[0]?.id ?? 0);
  const [trafficGb, setTrafficGb] = useState(10);
  const [balanceRub, setBalanceRub] = useState(100);
  const [promoGroupId, setPromoGroupId] = useState<number | null>(promoGroups[0]?.id ?? null);
  const [grantTariffId, setGrantTariffId] = useState<number>(tariffs[0]?.id ?? 0);
  const [grantDays, setGrantDays] = useState(30);
  const [deviceLimit, setDeviceLimit] = useState(1);
  const [deleteFromPanel, setDeleteFromPanel] = useState(true);
  const [forceDeleteActivePaid, setForceDeleteActivePaid] = useState(false);

  useEffect(() => {
    if (tariffs.length > 0 && tariffId === 0) {
      setTariffId(tariffs[0].id);
    }
    if (tariffs.length > 0 && grantTariffId === 0) {
      setGrantTariffId(tariffs[0].id);
    }
  }, [tariffs, tariffId, grantTariffId]);

  useEffect(() => {
    if (promoGroups.length > 0 && promoGroupId === null) {
      setPromoGroupId(promoGroups[0].id);
    }
  }, [promoGroups, promoGroupId]);

  // Reset modal-specific state when modal opens
  useEffect(() => {
    if (modal.open) {
      if (modal.action === 'delete_user') {
        setDeleteFromPanel(true);
      }
      if (modal.action === 'delete_subscription') {
        setForceDeleteActivePaid(false);
      }
    }
  }, [modal.open, modal.action]);

  // Escape key handler — only when not loading
  useEffect(() => {
    if (!modal.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modal.loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [modal.open, modal.loading, onClose]);

  // Count active paid subscriptions among selected ones
  const activePaidCount = useMemo(() => {
    if (modal.action !== 'delete_subscription') return 0;
    const selectedSubIdSet = new Set(selectedSubscriptionIds);
    let count = 0;
    for (const user of users) {
      for (const sub of user.subscriptions ?? []) {
        if (selectedSubIdSet.has(sub.id) && sub.status === 'active' && !sub.is_trial) {
          count++;
        }
      }
    }
    return count;
  }, [modal.action, selectedSubscriptionIds, users]);

  const isConfirmDisabled =
    modal.loading ||
    (modal.action === 'delete_subscription' && activePaidCount > 0 && !forceDeleteActivePaid);

  if (!modal.open || !modal.action) return null;

  const actionLabelKeys: Record<BulkActionType, string> = {
    extend_subscription: 'admin.bulkActions.actions.extend',
    add_days: 'admin.bulkActions.actions.extend',
    cancel_subscription: 'admin.bulkActions.actions.cancel',
    activate_subscription: 'admin.bulkActions.actions.activate',
    change_tariff: 'admin.bulkActions.actions.changeTariff',
    add_traffic: 'admin.bulkActions.actions.addTraffic',
    add_balance: 'admin.bulkActions.actions.addBalance',
    assign_promo_group: 'admin.bulkActions.actions.assignPromoGroup',
    grant_subscription: 'admin.bulkActions.actions.grantSubscription',
    set_devices: 'admin.bulkActions.actions.setDevices',
    delete_subscription: 'admin.bulkActions.actions.deleteSubscription',
    delete_user: 'admin.bulkActions.actions.deleteUser',
  };

  const handleSubmit = () => {
    const params: BulkActionParams = {};
    switch (modal.action) {
      case 'extend_subscription':
        params.days = days;
        break;
      case 'change_tariff':
        params.tariff_id = tariffId;
        break;
      case 'add_traffic':
        params.traffic_gb = trafficGb;
        break;
      case 'add_balance':
        params.amount_kopeks = Math.round(balanceRub * 100);
        break;
      case 'assign_promo_group':
        params.promo_group_id = promoGroupId;
        break;
      case 'grant_subscription':
        params.tariff_id = grantTariffId;
        params.days = grantDays;
        break;
      case 'set_devices':
        params.device_limit = deviceLimit;
        break;
      case 'delete_subscription':
        params.force_delete_active_paid = forceDeleteActivePaid;
        break;
      case 'delete_user':
        params.delete_from_panel = deleteFromPanel;
        break;
    }
    onExecute(params);
  };

  const handleBackdropClick = () => {
    if (!modal.loading) {
      onClose();
    }
  };

  const renderInputs = () => {
    switch (modal.action) {
      case 'extend_subscription':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.days')}
            </label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'change_tariff':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.tariff')}
            </label>
            <DropdownSelect
              value={String(tariffId)}
              options={tariffs.map((tt) => ({ value: String(tt.id), label: tt.name }))}
              onChange={(v) => setTariffId(Number(v))}
            />
          </div>
        );
      case 'add_traffic':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.trafficGb')}
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              value={trafficGb}
              onChange={(e) => setTrafficGb(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'add_balance':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.balanceRub')}
            </label>
            <input
              type="number"
              min={1}
              max={100000}
              value={balanceRub}
              onChange={(e) => setBalanceRub(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'assign_promo_group':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.promoGroup')}
            </label>
            <DropdownSelect
              value={promoGroupId !== null ? String(promoGroupId) : 'null'}
              options={[
                { value: 'null', label: t('admin.bulkActions.params.removePromoGroup') },
                ...promoGroups.map((pg) => ({ value: String(pg.id), label: pg.name })),
              ]}
              onChange={(v) => setPromoGroupId(v === 'null' ? null : Number(v))}
            />
          </div>
        );
      case 'set_devices':
        return (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.bulkActions.params.deviceLimit')}
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={deviceLimit}
              onChange={(e) => setDeviceLimit(Number(e.target.value))}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
            />
          </div>
        );
      case 'grant_subscription':
        return (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-300">
                {t('admin.bulkActions.params.tariff')}
              </label>
              <DropdownSelect
                value={String(grantTariffId)}
                options={tariffs.map((tt) => ({ value: String(tt.id), label: tt.name }))}
                onChange={(v) => setGrantTariffId(Number(v))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark-300">
                {t('admin.bulkActions.params.days')}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-full rounded-xl border border-dark-700 bg-dark-800 px-3 py-2.5 text-sm text-dark-100 outline-none transition-colors focus:border-accent-500/40"
              />
            </div>
            {/* Warning about users with existing subscriptions */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
              <p className="text-xs text-amber-400">
                {t('admin.bulkActions.grantSubscription.warning')}
              </p>
            </div>
          </div>
        );
      case 'delete_subscription': {
        const totalSelected = selectedSubscriptionIds.length;

        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-3 py-2.5">
              <p className="text-sm font-medium text-error-400">
                {t('admin.bulkActions.deleteSubscription.warning')}
              </p>
              <p className="mt-1 text-xs text-error-300/70">
                {t('admin.bulkActions.deleteSubscription.hint')}
              </p>
            </div>
            {activePaidCount > 0 && (
              <>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <p className="text-sm font-medium text-amber-400">
                    {t('admin.bulkActions.deleteSubscription.activePaidWarning', {
                      count: activePaidCount,
                      total: totalSelected,
                    })}
                  </p>
                </div>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
                  <button
                    onClick={() => setForceDeleteActivePaid((prev) => !prev)}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-150',
                      forceDeleteActivePaid
                        ? 'border-error-500 bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                        : 'border-dark-500 bg-dark-700/60 hover:border-error-500/50 hover:bg-dark-600/60',
                    )}
                    aria-pressed={forceDeleteActivePaid}
                  >
                    {forceDeleteActivePaid && <CheckIcon />}
                  </button>
                  <span
                    className={cn(
                      'text-sm',
                      forceDeleteActivePaid ? 'font-medium text-error-400' : 'text-dark-400',
                    )}
                  >
                    {t('admin.bulkActions.deleteSubscription.forceDeleteConfirm')}
                  </span>
                </label>
              </>
            )}
          </div>
        );
      }
      case 'delete_user':
        return (
          <div className="space-y-4">
            <div className="rounded-xl border border-error-500/20 bg-error-500/5 px-3 py-2.5">
              <p className="text-sm font-medium text-error-400">
                {t('admin.bulkActions.deleteUser.warning')}
              </p>
              <p className="mt-1 text-xs text-error-300/70">
                {t('admin.bulkActions.deleteUser.hint')}
              </p>
            </div>
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2">
              <button
                onClick={() => setDeleteFromPanel((prev) => !prev)}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all duration-150',
                  deleteFromPanel
                    ? 'border-error-500 bg-error-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                    : 'border-dark-500 bg-dark-700/60 hover:border-error-500/50 hover:bg-dark-600/60',
                )}
                aria-pressed={deleteFromPanel}
              >
                {deleteFromPanel && <CheckIcon />}
              </button>
              <span
                className={cn(
                  'text-sm',
                  deleteFromPanel ? 'font-medium text-error-400' : 'text-dark-400',
                )}
              >
                {t('admin.bulkActions.deleteUser.deleteFromPanel')}
              </span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — no close on click during loading */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* Modal */}
      <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark-100">{t(actionLabelKeys[modal.action])}</h3>
          {!modal.loading && (
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
              aria-label={t('common.close')}
            >
              <XCloseIcon />
            </button>
          )}
        </div>

        {/* Progress view during execution */}
        {modal.loading && modal.progress ? (
          <div className="space-y-4">
            <ProgressView progress={modal.progress} />
            <p className="text-center text-xs text-dark-500">
              {t('admin.bulkActions.progress.doNotClose')}
            </p>
          </div>
        ) : modal.result ? (
          /* Result view */
          <div className="space-y-4">
            {/* Summary line */}
            <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
              <div className="mb-3 text-center text-sm font-semibold text-dark-100">
                {t('admin.bulkActions.complete')}
              </div>
              {/* Colored summary */}
              <div className="mb-3 text-center text-sm">
                <span className="font-medium text-success-400">
                  {t('admin.bulkActions.progress.summarySuccess', {
                    count: modal.result.success_count,
                  })}
                </span>
                {modal.result.error_count > 0 && (
                  <>
                    <span className="mx-1.5 text-dark-600" aria-hidden="true">
                      /
                    </span>
                    <span className="font-medium text-error-400">
                      {t('admin.bulkActions.progress.summaryErrors', {
                        count: modal.result.error_count,
                      })}
                    </span>
                  </>
                )}
              </div>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-400">
                    {modal.result.success_count}
                  </div>
                  <div className="text-xs text-dark-400">
                    {t('admin.bulkActions.successCount', { count: modal.result.success_count })}
                  </div>
                </div>
                {modal.result.error_count > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-error-400">
                      {modal.result.error_count}
                    </div>
                    <div className="text-xs text-dark-400">
                      {t('admin.bulkActions.errorCount', { count: modal.result.error_count })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible error details */}
            <ErrorDetails result={modal.result} />

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <>
            {/* Affected count */}
            <div className="mb-4 rounded-xl border border-accent-500/20 bg-accent-500/5 px-4 py-3">
              <p className="text-sm text-dark-200">
                {t('admin.bulkActions.selectedCount', { count: selectedCount })}
              </p>
            </div>

            {/* Action-specific inputs */}
            <div className="mb-6">{renderInputs()}</div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={modal.loading}
                className="min-h-[44px] flex-1 rounded-xl border border-dark-700 bg-dark-800 px-4 py-2.5 text-sm font-medium text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
              >
                {t('admin.bulkActions.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isConfirmDisabled}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                {t('admin.bulkActions.confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// ============ Floating Action Bar ============

interface FloatingActionBarProps {
  selectedUserCount: number;
  selectedSubscriptionCount: number;
  isMultiTariff: boolean;
  totalVisibleSubscriptionCount: number;
  onAction: (type: BulkActionType) => void;
  onToggleAllSubscriptions: () => void;
}

function FloatingActionBar({
  selectedUserCount,
  selectedSubscriptionCount,
  isMultiTariff,
  totalVisibleSubscriptionCount,
  onAction,
  onToggleAllSubscriptions,
}: FloatingActionBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasAnySelection = selectedUserCount > 0 || selectedSubscriptionCount > 0;
  if (!hasAnySelection) return null;

  const actions: ActionConfig[] = [
    {
      type: 'extend_subscription',
      labelKey: 'admin.bulkActions.actions.extend',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'activate_subscription',
      labelKey: 'admin.bulkActions.actions.activate',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'cancel_subscription',
      labelKey: 'admin.bulkActions.actions.cancel',
      icon: <span aria-hidden="true">-</span>,
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
    {
      type: 'change_tariff',
      labelKey: 'admin.bulkActions.actions.changeTariff',
      icon: <span aria-hidden="true">~</span>,
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'add_traffic',
      labelKey: 'admin.bulkActions.actions.addTraffic',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'set_devices',
      labelKey: 'admin.bulkActions.actions.setDevices',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
          />
        </svg>
      ),
      colorClass: 'text-accent-400 hover:bg-accent-500/10',
    },
    {
      type: 'delete_subscription',
      labelKey: 'admin.bulkActions.actions.deleteSubscription',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      ),
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
    {
      type: 'add_balance',
      labelKey: 'admin.bulkActions.actions.addBalance',
      icon: <span aria-hidden="true">$</span>,
      colorClass: 'text-warning-400 hover:bg-warning-500/10',
    },
    {
      type: 'grant_subscription',
      labelKey: 'admin.bulkActions.actions.grantSubscription',
      icon: <span aria-hidden="true">+</span>,
      colorClass: 'text-success-400 hover:bg-success-500/10',
    },
    {
      type: 'assign_promo_group',
      labelKey: 'admin.bulkActions.actions.assignPromoGroup',
      icon: <span aria-hidden="true">%</span>,
      colorClass: 'text-accent-300 hover:bg-accent-300/10',
    },
    {
      type: 'delete_user',
      labelKey: 'admin.bulkActions.actions.deleteUser',
      icon: (
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M22 10.5h-6m-8.25-4.5a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM1.5 21a8.25 8.25 0 0115 0"
          />
        </svg>
      ),
      colorClass: 'text-error-400 hover:bg-error-500/10',
    },
  ];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] flex justify-center px-4 pb-[max(5rem,calc(4.5rem+env(safe-area-inset-bottom)))]">
      <div
        ref={menuRef}
        className="relative flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-dark-700/60 bg-dark-800/80 px-5 py-3 shadow-2xl backdrop-blur-xl"
      >
        {/* Selection counts */}
        <div className="flex items-center gap-2">
          {selectedUserCount > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20 text-sm font-bold text-accent-400">
                {selectedUserCount}
              </div>
              <span className="hidden text-xs font-medium text-dark-300 sm:inline">
                {t('admin.bulkActions.usersSelected', { count: selectedUserCount })}
              </span>
            </div>
          )}
          {isMultiTariff && selectedSubscriptionCount > 0 && (
            <div className="flex items-center gap-1.5">
              {selectedUserCount > 0 && <div className="mx-1 h-4 w-px bg-dark-700" />}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/20 text-sm font-bold text-success-400">
                {selectedSubscriptionCount}
              </div>
              <span className="hidden text-xs font-medium text-dark-300 sm:inline">
                {t('admin.bulkActions.subscriptionsSelected', {
                  count: selectedSubscriptionCount,
                })}
              </span>
            </div>
          )}
        </div>

        {/* Toggle all subscriptions button */}
        {isMultiTariff && totalVisibleSubscriptionCount > 0 && (
          <>
            <div className="mx-1 h-6 w-px bg-dark-700" />
            <button
              onClick={onToggleAllSubscriptions}
              className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-200"
            >
              {selectedSubscriptionCount === totalVisibleSubscriptionCount &&
              selectedSubscriptionCount > 0
                ? t('admin.bulkActions.deselectAllSubs')
                : t('admin.bulkActions.selectAllSubs')}
            </button>
          </>
        )}

        <div className="mx-2 h-6 w-px bg-dark-700" />

        {/* Actions dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-600"
          >
            {t('common.actions')}
            <ChevronDownIcon />
          </button>

          {open && (
            <div className="absolute bottom-full right-0 mb-2 w-64 overflow-hidden rounded-xl border border-dark-700 bg-dark-800 py-1.5 shadow-2xl">
              {/* Subscription-level actions */}
              {isMultiTariff && (
                <div className="border-b border-dark-700/50 px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                    {t('admin.bulkActions.subscriptionTarget')}
                  </span>
                </div>
              )}
              {actions
                .filter((a) => isSubscriptionLevelAction(a.type))
                .map((a) => {
                  const count = isMultiTariff ? selectedSubscriptionCount : selectedUserCount;
                  const disabled = count === 0;
                  return (
                    <button
                      key={a.type}
                      onClick={() => {
                        if (disabled) return;
                        setOpen(false);
                        onAction(a.type);
                      }}
                      disabled={disabled}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                        disabled ? 'cursor-not-allowed opacity-40' : a.colorClass,
                      )}
                    >
                      <span className="border-current/20 bg-current/5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold">
                        {a.icon}
                      </span>
                      {t(a.labelKey)}
                    </button>
                  );
                })}

              {/* User-level actions */}
              {isMultiTariff && (
                <div className="border-b border-t border-dark-700/50 px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-dark-500">
                    {t('admin.bulkActions.userTarget')}
                  </span>
                </div>
              )}
              {actions
                .filter((a) => !isSubscriptionLevelAction(a.type))
                .map((a) => {
                  const disabled = selectedUserCount === 0;
                  return (
                    <button
                      key={a.type}
                      onClick={() => {
                        if (disabled) return;
                        setOpen(false);
                        onAction(a.type);
                      }}
                      disabled={disabled}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                        disabled ? 'cursor-not-allowed opacity-40' : a.colorClass,
                      )}
                    >
                      <span className="border-current/20 bg-current/5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-bold">
                        {a.icon}
                      </span>
                      {t(a.labelKey)}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Helpers ============

// ============ Main Page ============

export default function AdminBulkActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();
  const { formatWithCurrency } = useCurrency();

  // Data
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [tariffs, setTariffs] = useState<TariffListItem[]>([]);
  const [promoGroups, setPromoGroups] = useState<PromoGroup[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [partners, setPartners] = useState<AdminPartnerItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>('');
  const [trialOnly, setTrialOnly] = useState(false);
  const [tariffFilter, setTariffFilter] = useState<number[]>([]);
  const [promoGroupFilter, setPromoGroupFilter] = useState('');
  const [campaignFilter, setCampaignFilter] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('');

  // Pagination
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);

  // Selection
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [subscriptionSelection, setSubscriptionSelection] = useState<Record<number, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Modal
  const [modal, setModal] = useState<ModalState>({
    open: false,
    action: null,
    loading: false,
    result: null,
    progress: null,
  });

  // Debounce timer ref
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // ---- Multi-tariff detection ----
  const isMultiTariff = useMemo(
    () => users.some((u) => (u.subscriptions?.length ?? 0) > 1),
    [users],
  );

  // ---- Data loading ----

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        offset,
        limit,
      };
      if (committedSearch) params.search = committedSearch;
      if (statusFilter) params.subscription_status = statusFilter;
      if (tariffFilter.length > 0) params.tariff_id = tariffFilter.join(',');
      if (promoGroupFilter) params.promo_group_id = Number(promoGroupFilter);
      if (campaignFilter) params.campaign_id = Number(campaignFilter);
      if (partnerFilter) params.partner_id = Number(partnerFilter);

      const data = await adminUsersApi.getUsers(
        params as Parameters<typeof adminUsersApi.getUsers>[0],
      );
      setUsers(data.users);
      setTotal(data.total);
      // Auto-expand all users who have subscriptions
      const autoExpand: Record<number, boolean> = {};
      for (const u of data.users) {
        if ((u.subscriptions?.length ?? 0) > 0) {
          autoExpand[u.id] = true;
        }
      }
      setExpandedRows(autoExpand);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [
    offset,
    limit,
    committedSearch,
    statusFilter,
    tariffFilter,
    promoGroupFilter,
    campaignFilter,
    partnerFilter,
  ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Load tariffs, promo groups, campaigns, and partners once (independent — one failure won't block others)
  useEffect(() => {
    tariffsApi
      .getTariffs(true)
      .then((d) => setTariffs(d.tariffs))
      .catch(() => {});
    promocodesApi
      .getPromoGroups({ limit: 200 })
      .then((d) => setPromoGroups(d.items))
      .catch(() => {});
    campaignsApi
      .getCampaigns(true, 0, 100)
      .then((d) => setCampaigns(d.campaigns))
      .catch(() => {});
    partnerApi
      .getPartners({ limit: 100 })
      .then((d) => setPartners(d.items))
      .catch(() => {});
  }, []);

  // ---- Handlers ----

  const clearAllSelections = useCallback(() => {
    setRowSelection({});
    setSubscriptionSelection({});
    setExpandedRows({});
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setOffset(0);
      setCommittedSearch(value);
    }, 400);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => clearTimeout(searchTimerRef.current);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearTimeout(searchTimerRef.current);
    setOffset(0);
    setCommittedSearch(searchInput);
  };

  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v as SubscriptionStatusFilter);
    setOffset(0);
  };

  const handleTariffFilterChange = (ids: number[]) => {
    setTariffFilter(ids);
    setOffset(0);
  };

  const handlePromoGroupFilterChange = (v: string) => {
    setPromoGroupFilter(v);
    setOffset(0);
  };

  const handleCampaignFilterChange = (v: string) => {
    setCampaignFilter(v);
    setOffset(0);
  };

  const handlePartnerFilterChange = (v: string) => {
    setPartnerFilter(v);
    setOffset(0);
  };

  const handleRefresh = () => {
    loadUsers();
  };

  const selectedUserIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map(Number)
      .filter((id) => id > 0);
  }, [rowSelection]);

  const selectedSubscriptionIds = useMemo(() => {
    return Object.keys(subscriptionSelection)
      .filter((k) => subscriptionSelection[Number(k)])
      .map(Number);
  }, [subscriptionSelection]);

  const toggleExpandRow = useCallback((userId: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  }, []);

  const toggleSubscriptionSelection = useCallback((subscriptionId: number) => {
    setSubscriptionSelection((prev) => ({
      ...prev,
      [subscriptionId]: !prev[subscriptionId],
    }));
  }, []);

  const getFilteredSubs = useCallback(
    (subs: UserListItemSubscription[]): UserListItemSubscription[] => {
      let result = subs;
      if (tariffFilter.length > 0) {
        result = result.filter((s) => s.tariff_id !== null && tariffFilter.includes(s.tariff_id));
      }
      if (trialOnly) {
        result = result.filter((s) => s.is_trial);
      }
      return result;
    },
    [tariffFilter, trialOnly],
  );

  const handleOpenAction = (type: BulkActionType) => {
    setModal({ open: true, action: type, loading: false, result: null, progress: null });
  };

  const handleExecuteAction = async (params: BulkActionParams) => {
    if (!modal.action) return;

    const isSubAction = isMultiTariff && isSubscriptionLevelAction(modal.action);
    const targetIds = isSubAction ? selectedSubscriptionIds : selectedUserIds;
    if (targetIds.length === 0) return;

    const totalCount = targetIds.length;
    setModal((prev) => ({
      ...prev,
      loading: true,
      progress: {
        current: 0,
        total: totalCount,
        successCount: 0,
        errorCount: 0,
        log: [],
      },
    }));

    const requestPayload = isSubAction
      ? { action: modal.action, subscription_ids: targetIds, params }
      : { action: modal.action, user_ids: targetIds, params };

    try {
      await adminBulkActionsApi.executeWithStream(requestPayload, (event) => {
        if (event.type === 'progress') {
          setModal((prev) => ({
            ...prev,
            progress: prev.progress
              ? {
                  current: event.current,
                  total: event.total,
                  successCount: prev.progress.successCount + (event.success ? 1 : 0),
                  errorCount: prev.progress.errorCount + (event.success ? 0 : 1),
                  log: [...prev.progress.log, event],
                }
              : prev.progress,
          }));
        } else if (event.type === 'complete') {
          setModal((prev) => {
            // Build errors from accumulated progress log
            const errors = (prev.progress?.log ?? [])
              .filter((e) => !e.success)
              .map((e) => ({
                user_id: e.user_id,
                username: e.username,
                error: e.message || e.error || '',
              }));
            return {
              ...prev,
              loading: false,
              progress: null,
              result: {
                success: event.error_count === 0,
                total: event.total,
                success_count: event.success_count,
                error_count: event.error_count,
                skipped_count: event.skipped_count || 0,
                errors,
              },
            };
          });
          loadUsers();
        }
      });

      // If stream ended without a complete event, finalize from progress
      setModal((prev) => {
        if (prev.loading && prev.progress) {
          return {
            ...prev,
            loading: false,
            result: {
              success: prev.progress.errorCount === 0,
              total: prev.progress.total,
              success_count: prev.progress.successCount,
              error_count: prev.progress.errorCount,
              skipped_count: 0,
              errors: prev.progress.log
                .filter((e) => !e.success)
                .map((e) => ({
                  user_id: e.user_id,
                  username: e.username,
                  error: e.error || '',
                })),
            },
            progress: null,
          };
        }
        return prev;
      });

      loadUsers();
    } catch {
      setModal((prev) => ({
        ...prev,
        loading: false,
        progress: null,
        result: {
          success: false,
          total: totalCount,
          success_count: prev.progress?.successCount ?? 0,
          error_count: totalCount - (prev.progress?.successCount ?? 0),
          skipped_count: 0,
          errors: [],
        },
      }));
    }
  };

  const handleCloseModal = () => {
    if (modal.loading) return;
    if (modal.result) {
      clearAllSelections();
    }
    setModal({ open: false, action: null, loading: false, result: null, progress: null });
  };

  // ---- TanStack Table ----

  const columns = useMemo<ColumnDef<UserListItem>[]>(
    () => [
      {
        id: 'select',
        size: 56,
        header: ({ table }) => {
          const allSubsSelected =
            allVisibleSubscriptionIds.length > 0 &&
            allVisibleSubscriptionIds.every((id) => subscriptionSelection[id]);
          const someSubsSelected =
            !allSubsSelected && allVisibleSubscriptionIds.some((id) => subscriptionSelection[id]);
          return (
            <div className="flex items-center justify-center gap-1.5">
              {/* Select all users */}
              <button
                onClick={table.getToggleAllRowsSelectedHandler()}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                  table.getIsAllRowsSelected()
                    ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                    : table.getIsSomeRowsSelected()
                      ? 'border-accent-500 bg-accent-500/30'
                      : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
                )}
                aria-label={t('admin.bulkActions.selectAll')}
                title={t('admin.bulkActions.selectAll')}
              >
                {table.getIsAllRowsSelected() && <CheckIcon />}
                {table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected() && (
                  <div className="h-0.5 w-2 rounded-full bg-white" />
                )}
              </button>
              {/* Select all subscriptions */}
              {isMultiTariff && allVisibleSubscriptionIds.length > 0 && (
                <button
                  onClick={toggleAllSubscriptions}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                    allSubsSelected
                      ? 'border-success-500 bg-success-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'
                      : someSubsSelected
                        ? 'border-success-500 bg-success-500/30'
                        : 'border-dark-500 bg-dark-700/60 hover:border-success-500/50 hover:bg-dark-600/60',
                  )}
                  aria-label={t('admin.bulkActions.selectAllSubs')}
                  title={t('admin.bulkActions.selectAllSubs')}
                >
                  {allSubsSelected && <CheckIcon />}
                  {someSubsSelected && <div className="h-0.5 w-2 rounded-full bg-white" />}
                </button>
              )}
            </div>
          );
        },
        cell: ({ row }) => {
          const userName =
            row.original.full_name || row.original.username || String(row.original.telegram_id);
          return (
            <div className="flex items-center justify-center">
              <button
                onClick={row.getToggleSelectedHandler()}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
                  row.getIsSelected()
                    ? 'border-accent-500 bg-accent-500 shadow-[0_0_8px_rgba(var(--color-accent-500),0.4)]'
                    : 'border-dark-500 bg-dark-700/60 hover:border-accent-500/50 hover:bg-dark-600/60',
                )}
                aria-label={
                  row.getIsSelected()
                    ? t('admin.bulkActions.deselectUser', { name: userName })
                    : t('admin.bulkActions.selectUser', { name: userName })
                }
              >
                {row.getIsSelected() && <CheckIcon />}
              </button>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'user',
        accessorFn: (row) => row.full_name,
        header: t('admin.bulkActions.columns.user'),
        size: 200,
        cell: ({ row }) => {
          const user = row.original;
          const filteredSubs = getFilteredSubs(user.subscriptions ?? []);
          const subCount = filteredSubs.length;
          const canExpand = isMultiTariff && subCount > 0;
          const isExpanded = expandedRows[user.id] ?? false;
          return (
            <div className="flex items-center gap-2.5">
              {canExpand ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpandRow(user.id);
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 transition-transform"
                  aria-label={
                    isExpanded
                      ? t('admin.bulkActions.collapseSubscriptions')
                      : t('admin.bulkActions.expandSubscriptions')
                  }
                  aria-expanded={isExpanded}
                >
                  <ChevronExpandIcon expanded={isExpanded} />
                </button>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-[10px] font-medium text-white">
                  {user.first_name?.[0] || user.username?.[0] || '?'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-dark-100">
                    {user.full_name}
                  </span>
                  {canExpand && (
                    <span className="shrink-0 rounded-md bg-dark-700/60 px-1.5 py-0.5 text-[9px] font-medium tabular-nums text-dark-400">
                      {subCount}
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] leading-tight text-dark-500">
                  {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'subscription_status',
        accessorFn: (row) => row.subscription_status,
        header: t('admin.bulkActions.columns.status'),
        size: 100,
        cell: ({ row }) => {
          const user = row.original;
          if (!user.has_subscription) {
            return <span className="text-xs text-dark-500">-</span>;
          }
          return <StatusBadge status={user.subscription_status} />;
        },
      },
      {
        id: 'tariff',
        accessorFn: (row) => row.tariff_name,
        header: t('admin.bulkActions.columns.tariff'),
        size: 160,
        cell: ({ row }) => {
          const user = row.original;
          const subs = user.subscriptions ?? [];
          const tariffNames = subs
            .map((s) => s.tariff_name)
            .filter((name): name is string => !!name);
          const uniqueNames = [...new Set(tariffNames)];

          if (uniqueNames.length === 0) {
            if (!user.tariff_name) {
              return <span className="text-xs text-dark-500">—</span>;
            }
            return <span className="text-xs text-dark-200">{user.tariff_name}</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {uniqueNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex rounded-md border border-dark-600/40 bg-dark-700/40 px-1.5 py-0.5 text-[10px] font-medium text-dark-200"
                >
                  {name}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        id: 'balance',
        accessorKey: 'balance_rubles',
        header: t('admin.bulkActions.columns.balance'),
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-xs font-medium text-dark-200">
            {formatWithCurrency(getValue() as number)}
          </span>
        ),
      },
      {
        id: 'promo_group',
        accessorFn: (row) => row.promo_group_name,
        header: t('admin.bulkActions.columns.promoGroup'),
        size: 120,
        cell: ({ getValue }) => {
          const name = getValue() as string | null;
          return name ? (
            <span className="inline-flex rounded-lg border border-accent-500/20 bg-accent-500/5 px-2 py-0.5 text-[10px] font-medium text-accent-400">
              {name}
            </span>
          ) : (
            <span className="text-xs text-dark-500">-</span>
          );
        },
      },
      {
        id: 'total_spent',
        accessorKey: 'total_spent_kopeks',
        header: t('admin.bulkActions.columns.spent'),
        size: 100,
        cell: ({ getValue }) => {
          const kopeks = getValue() as number;
          return (
            <span className="text-xs text-dark-300">
              {kopeks > 0 ? formatWithCurrency(kopeks / 100) : '-'}
            </span>
          );
        },
      },
    ],
    [t, formatWithCurrency, expandedRows, toggleExpandRow, getFilteredSubs],
  );

  // When multiple tariffs are selected, filter users client-side
  // (server only supports single tariff_id filter)
  const filteredUsers = useMemo(() => {
    let result = users;

    // Trial-only filter: show users with trial subscription
    if (trialOnly) {
      result = result.filter(
        (u) => u.subscription_is_trial || (u.subscriptions ?? []).some((s) => s.status === 'trial'),
      );
    }

    return result;
  }, [users, trialOnly]);

  const allVisibleSubscriptionIds = useMemo(() => {
    const ids: number[] = [];
    for (const user of filteredUsers) {
      const subs = user.subscriptions ?? [];
      const filtered = getFilteredSubs(subs);
      for (const sub of filtered) {
        ids.push(sub.id);
      }
    }
    return ids;
  }, [filteredUsers, getFilteredSubs]);

  const toggleAllSubscriptions = useCallback(() => {
    const allSelected =
      allVisibleSubscriptionIds.length > 0 &&
      allVisibleSubscriptionIds.every((id) => subscriptionSelection[id]);

    if (allSelected) {
      // Deselect all
      const next: Record<number, boolean> = {};
      for (const key of Object.keys(subscriptionSelection)) {
        const id = Number(key);
        if (!allVisibleSubscriptionIds.includes(id)) {
          next[id] = subscriptionSelection[id];
        }
      }
      setSubscriptionSelection(next);
    } else {
      // Select all visible
      const next = { ...subscriptionSelection };
      for (const id of allVisibleSubscriptionIds) {
        next[id] = true;
      }
      setSubscriptionSelection(next);
    }

    // Auto-expand rows that have filtered subs
    const expanded: Record<number, boolean> = { ...expandedRows };
    for (const user of users) {
      const subs = user.subscriptions ?? [];
      const filtered = getFilteredSubs(subs);
      if (filtered.length > 1) {
        expanded[user.id] = true;
      }
    }
    setExpandedRows(expanded);
  }, [allVisibleSubscriptionIds, subscriptionSelection, expandedRows, users, getFilteredSubs]);

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    getRowId: (row) => String(row.id),
  });

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  // ---- Status filter options ----
  const statusOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allStatuses') },
    { value: 'active', label: t('admin.bulkActions.statuses.active') },
    { value: 'expired', label: t('admin.bulkActions.statuses.expired') },
    { value: 'limited', label: t('admin.bulkActions.statuses.limited') },
    { value: 'disabled', label: t('admin.bulkActions.statuses.disabled') },
  ];

  const tariffMultiOptions: MultiSelectOption[] = tariffs.map((tt) => ({
    value: tt.id,
    label: tt.name,
  }));

  const promoGroupOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allGroups') },
    ...promoGroups.map((pg) => ({ value: String(pg.id), label: pg.name })),
  ];

  const campaignOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allCampaigns') },
    ...campaigns.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const partnerOptions: DropdownOption[] = [
    { value: '', label: t('admin.bulkActions.filters.allPartners') },
    ...partners.map((p) => ({
      value: String(p.user_id),
      label: p.username ? `@${p.username}` : p.first_name || String(p.telegram_id),
    })),
  ];

  return (
    <div className="relative animate-fade-in">
      <ProgressBar loading={loading} />

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
              aria-label={t('common.back')}
            >
              <BackIcon />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-dark-100">{t('admin.bulkActions.title')}</h1>
              <span className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-0.5 text-xs font-medium tabular-nums text-dark-400">
                {total.toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-dark-400">{t('admin.bulkActions.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200 disabled:opacity-50"
          aria-label={t('common.refresh')}
        >
          <RefreshIcon className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit}>
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('admin.bulkActions.filters.search')}
              className="w-full rounded-xl border border-dark-700 bg-dark-800 py-2.5 pl-10 pr-4 text-sm text-dark-100 outline-none transition-colors placeholder:text-dark-500 focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)]"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500">
              <SearchIcon />
            </div>
          </div>
        </form>

        {/* Filter dropdowns + trial toggle */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DropdownSelect
            value={statusFilter}
            options={statusOptions}
            onChange={handleStatusFilterChange}
          />
          <MultiSelectDropdown
            options={tariffMultiOptions}
            selected={tariffFilter}
            onChange={handleTariffFilterChange}
            placeholder={t('admin.bulkActions.filters.allTariffs')}
          />
          <DropdownSelect
            value={promoGroupFilter}
            options={promoGroupOptions}
            onChange={handlePromoGroupFilterChange}
          />
        </div>

        {/* Campaign & Partner filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DropdownSelect
            value={campaignFilter}
            options={campaignOptions}
            onChange={handleCampaignFilterChange}
          />
          <DropdownSelect
            value={partnerFilter}
            options={partnerOptions}
            onChange={handlePartnerFilterChange}
          />
        </div>

        {/* Trial filter checkbox */}
        <label className="inline-flex cursor-pointer items-center gap-2">
          <button
            onClick={() => {
              setTrialOnly((prev) => !prev);
              setOffset(0);
            }}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-150',
              trialOnly
                ? 'border-amber-500 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                : 'border-dark-500 bg-dark-700/60 hover:border-amber-500/50 hover:bg-dark-600/60',
            )}
            aria-pressed={trialOnly}
          >
            {trialOnly && <CheckIcon />}
          </button>
          <span
            className={cn('text-sm', trialOnly ? 'font-medium text-amber-400' : 'text-dark-400')}
          >
            {t('admin.bulkActions.filters.trialOnly')}
          </span>
        </label>
      </div>

      {/* Table */}
      {loading && users.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-700/50 bg-dark-800/40 text-dark-500">
            <SearchIcon />
          </div>
          <p className="text-sm font-medium text-dark-300">{t('admin.bulkActions.noResults')}</p>
        </div>
      ) : (
        <div
          className={cn(
            'transition-opacity duration-200',
            loading && users.length > 0 && 'opacity-60',
          )}
        >
          <div className="overflow-x-auto rounded-xl border border-dark-700">
            <table className="w-full text-left text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-dark-700 bg-dark-800/80">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="whitespace-nowrap px-3 py-2.5 text-xs font-medium text-dark-400"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => {
                  const user = row.original;
                  const filteredSubs = getFilteredSubs(user.subscriptions ?? []);
                  const canExpand = isMultiTariff && filteredSubs.length > 0;
                  const isExpanded = expandedRows[user.id] ?? false;

                  return (
                    <React.Fragment key={row.id}>
                      {/* User row */}
                      <tr
                        className={cn(
                          'border-b transition-colors',
                          canExpand && isExpanded ? 'border-dark-700/30' : 'border-dark-700/50',
                          row.getIsSelected() ? 'bg-accent-500/5' : 'hover:bg-dark-800/50',
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-3 py-2.5"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>

                      {/* Subscription sub-rows (only when expanded and multi-sub) */}
                      {canExpand &&
                        isExpanded &&
                        filteredSubs.map((sub) => (
                          <SubscriptionSubRow
                            key={`sub-${sub.id}`}
                            subscription={sub}
                            isSelected={subscriptionSelection[sub.id] ?? false}
                            onToggleSelect={() => toggleSubscriptionSelection(sub.id)}
                            isMultiTariff={isMultiTariff}
                          />
                        ))}

                      {/* Single subscription — auto-select with user (no separate sub-row) */}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination + per-page selector */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-dark-400">
            {offset + 1}&ndash;{Math.min(offset + limit, total)} / {total}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-dark-500">{t('admin.bulkActions.perPage')}</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setOffset(0);
              }}
              className="rounded-lg border border-dark-700 bg-dark-800 px-2 py-1.5 text-xs text-dark-200 outline-none transition-colors focus:border-accent-500/40"
            >
              {[25, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setOffset(Math.max(0, offset - limit));
              }}
              disabled={offset === 0}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
              aria-label={t('common.back')}
            >
              <ChevronLeftIcon />
            </button>
            <span className="px-3 py-2 text-sm text-dark-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => {
                setOffset(offset + limit);
              }}
              disabled={offset + limit >= total}
              className="rounded-lg border border-dark-700 bg-dark-800 p-2 transition-colors hover:bg-dark-700 disabled:opacity-50"
              aria-label={t('common.next')}
            >
              <ChevronRightIcon />
            </button>
          </div>
        )}
      </div>

      {/* Bottom spacer to prevent floating bar from covering pagination */}
      {(selectedUserIds.length > 0 || selectedSubscriptionIds.length > 0) && (
        <div className="h-24" />
      )}

      {/* Floating action bar — portal to body for correct fixed positioning */}
      {createPortal(
        <FloatingActionBar
          selectedUserCount={selectedUserIds.length}
          selectedSubscriptionCount={selectedSubscriptionIds.length}
          isMultiTariff={isMultiTariff}
          totalVisibleSubscriptionCount={allVisibleSubscriptionIds.length}
          onAction={handleOpenAction}
          onToggleAllSubscriptions={toggleAllSubscriptions}
        />,
        document.body,
      )}

      {/* Action modal */}
      <ActionModal
        modal={modal}
        selectedCount={
          modal.action && isMultiTariff && isSubscriptionLevelAction(modal.action)
            ? selectedSubscriptionIds.length
            : selectedUserIds.length
        }
        tariffs={tariffs}
        promoGroups={promoGroups}
        users={users}
        selectedSubscriptionIds={selectedSubscriptionIds}
        onClose={handleCloseModal}
        onExecute={handleExecuteAction}
      />
    </div>
  );
}
