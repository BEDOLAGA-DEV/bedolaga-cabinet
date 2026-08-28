import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminSystemErrorsApi,
  type DeliveryStatus,
  type SystemErrorListItem,
} from '../api/adminSystemErrors';
import { AdminBackButton } from '../components/admin';
import { ChevronDownIcon, ClockIcon, InfoIcon, XIcon } from '@/components/icons';
import { StatCard } from '@/components/stats';

type StatusFilter = 'all' | 'undelivered' | DeliveryStatus;

const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'undelivered',
  'failed',
  'pending',
  'sent',
  'suppressed',
  'skipped',
];

const PAGE_SIZE = 50;

/** Цвет бейджа статуса доставки: провал и ожидание — это то, чего админ не видел. */
const STATUS_BADGE: Record<DeliveryStatus, string> = {
  failed: 'bg-error-500/15 text-error-400',
  pending: 'bg-warning-500/15 text-warning-400',
  sent: 'bg-success-500/15 text-success-400',
  suppressed: 'bg-dark-700/60 text-dark-300',
  skipped: 'bg-dark-700/60 text-dark-300',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function AdminSystemErrors() {
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: summary } = useQuery({
    queryKey: ['admin-system-errors-summary'],
    queryFn: () => adminSystemErrorsApi.getSummary(),
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-system-errors', statusFilter, search, page],
    queryFn: () =>
      adminSystemErrorsApi.getAll({
        undelivered_only: statusFilter === 'undelivered' || undefined,
        delivery_status:
          statusFilter === 'all' || statusFilter === 'undelivered' ? undefined : statusFilter,
        search: search.trim() || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const { data: detail } = useQuery({
    queryKey: ['admin-system-error-detail', expandedId],
    queryFn: () => adminSystemErrorsApi.getOne(expandedId as number),
    enabled: expandedId !== null,
  });

  const items: SystemErrorListItem[] = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeFilter = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(0);
    setExpandedId(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin" />
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.systemErrors.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.systemErrors.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Overview */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label={t('admin.systemErrors.overview.undelivered')}
            value={summary.undelivered_total}
            icon={<XIcon className="h-5 w-5" />}
            tone={summary.undelivered_total > 0 ? 'error' : 'success'}
          />
          <StatCard
            label={t('admin.systemErrors.overview.last24h')}
            value={summary.last_24h}
            icon={<ClockIcon className="h-5 w-5" />}
            tone={summary.last_24h > 0 ? 'warning' : 'neutral'}
          />
          <StatCard
            label={t('admin.systemErrors.overview.last7d')}
            value={summary.last_7d}
            icon={<InfoIcon className="h-5 w-5" />}
            tone="neutral"
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => changeFilter(filter)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              statusFilter === filter
                ? 'bg-accent-500/15 text-accent-400'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
          >
            {t(`admin.systemErrors.filters.${filter}`)}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder={t('admin.systemErrors.searchPlaceholder')}
          className="w-full rounded-lg bg-dark-800 px-3 py-2 text-sm text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <p className="py-8 text-center text-sm text-dark-400">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-dark-400">{t('admin.systemErrors.empty')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <div key={item.id} className="rounded-lg bg-dark-800">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs ${
                      STATUS_BADGE[item.delivery_status] ?? STATUS_BADGE.skipped
                    }`}
                  >
                    {t(`admin.systemErrors.status.${item.delivery_status}`)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-dark-100">{item.event}</span>
                    <span className="block truncate text-xs text-dark-400">
                      {item.error_type ? `${item.error_type} · ` : ''}
                      {item.logger_name || '—'} · {formatDateTime(item.created_at)}
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 shrink-0 text-dark-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-dark-700 p-3 text-xs">
                    <dl className="mb-3 grid grid-cols-2 gap-2 text-dark-300 sm:grid-cols-4">
                      <div>
                        <dt className="text-dark-500">{t('admin.systemErrors.detail.level')}</dt>
                        <dd>{item.level}</dd>
                      </div>
                      <div>
                        <dt className="text-dark-500">{t('admin.systemErrors.detail.attempts')}</dt>
                        <dd>{item.delivery_attempts}</dd>
                      </div>
                      <div>
                        <dt className="text-dark-500">
                          {t('admin.systemErrors.detail.deliveredAt')}
                        </dt>
                        <dd>{formatDateTime(item.delivered_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-dark-500">{t('admin.systemErrors.detail.userId')}</dt>
                        <dd>{item.user_id ?? '—'}</dd>
                      </div>
                    </dl>

                    {detail?.id === item.id && detail.delivery_error && (
                      <p className="mb-3 rounded bg-error-500/10 p-2 text-error-400">
                        {detail.delivery_error}
                      </p>
                    )}

                    {detail?.id === item.id && detail.context && (
                      <div className="mb-3">
                        <p className="mb-1 text-dark-500">
                          {t('admin.systemErrors.detail.context')}
                        </p>
                        <pre className="overflow-x-auto rounded bg-dark-900 p-2 text-dark-300">
                          {JSON.stringify(detail.context, null, 2)}
                        </pre>
                      </div>
                    )}

                    {detail?.id === item.id && detail.traceback && (
                      <div>
                        <p className="mb-1 text-dark-500">
                          {t('admin.systemErrors.detail.traceback')}
                        </p>
                        <pre className="max-h-96 overflow-auto rounded bg-dark-900 p-2 text-dark-300">
                          {detail.traceback}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg bg-dark-800 px-3 py-1.5 text-dark-300 disabled:opacity-40"
          >
            {t('common.back')}
          </button>
          <span className="text-dark-400">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-dark-800 px-3 py-1.5 text-dark-300 disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  );
}
