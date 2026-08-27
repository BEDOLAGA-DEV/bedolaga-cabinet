import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminBroadcastsApi } from '../api/adminBroadcasts';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  BackIcon,
  BroadcastIcon,
  DocumentIcon,
  PhotoIcon,
  PlusIcon,
  RefreshIcon,
  VideoIcon,
} from '@/components/icons';

// Status badge component
const statusConfig: Record<string, { bg: string; text: string; labelKey: string }> = {
  queued: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.queued',
  },
  in_progress: {
    bg: 'bg-accent-500/20',
    text: 'text-accent-400',
    labelKey: 'admin.broadcasts.status.inProgress',
  },
  completed: {
    bg: 'bg-success-500/20',
    text: 'text-success-400',
    labelKey: 'admin.broadcasts.status.completed',
  },
  partial: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.partial',
  },
  failed: {
    bg: 'bg-error-500/20',
    text: 'text-error-400',
    labelKey: 'admin.broadcasts.status.failed',
  },
  cancelled: {
    bg: 'bg-dark-500/20',
    text: 'text-dark-400',
    labelKey: 'admin.broadcasts.status.cancelled',
  },
  cancelling: {
    bg: 'bg-warning-500/20',
    text: 'text-warning-400',
    labelKey: 'admin.broadcasts.status.cancelling',
  },
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = statusConfig[status] || statusConfig.queued;
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${config.bg} ${config.text}`}>
      {t(config.labelKey)}
    </span>
  );
}

// Main component
export default function AdminBroadcasts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { capabilities } = usePlatform();

  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch broadcasts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'broadcasts', 'list', page],
    queryFn: () => adminBroadcastsApi.list(limit, page * limit),
    refetchInterval: (query) => {
      const items = query.state.data?.items;
      const hasActive = items?.some((b: { status: string }) =>
        ['queued', 'in_progress', 'cancelling'].includes(b.status),
      );
      return hasActive ? 5000 : false;
    },
  });

  const broadcasts = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-dark-100">{t('admin.broadcasts.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.broadcasts.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-lg bg-dark-800 p-2 text-dark-400 transition-colors hover:text-dark-100"
          >
            <RefreshIcon />
          </button>
          <button
            onClick={() => navigate('/admin/broadcasts/create')}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('admin.broadcasts.create')}</span>
          </button>
        </div>
      </div>

      {/* Broadcasts list */}
      {isLoading ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <RefreshIcon />
          <p className="mt-2">{t('common.loading')}</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <BroadcastIcon className="h-6 w-6" />
          <p className="mt-2">{t('admin.broadcasts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((broadcast) => (
            <button
              key={broadcast.id}
              onClick={() => navigate(`/admin/broadcasts/${broadcast.id}`)}
              className="w-full rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-left transition-all hover:border-dark-600 hover:bg-dark-800"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <StatusBadge status={broadcast.status} />
                    <span className="text-xs text-dark-400">#{broadcast.id}</span>
                    {broadcast.has_media && (
                      <span className="text-dark-400">
                        {broadcast.media_type === 'photo' && <PhotoIcon />}
                        {broadcast.media_type === 'video' && <VideoIcon />}
                        {broadcast.media_type === 'document' && <DocumentIcon />}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-dark-100">{broadcast.message_text}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-dark-400">
                    <span>{broadcast.target_type}</span>
                    <span>
                      {broadcast.sent_count}/{broadcast.total_count}
                      {broadcast.blocked_count > 0 && (
                        <span className="text-warning-400">
                          {' '}
                          ({broadcast.blocked_count} {t('admin.broadcasts.blockedShort')})
                        </span>
                      )}
                    </span>
                    <span>{new Date(broadcast.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {['queued', 'in_progress'].includes(broadcast.status) && (
                  <div className="w-16">
                    <div className="h-1.5 overflow-hidden rounded-full bg-dark-600">
                      <div
                        className="h-full bg-accent-500"
                        style={{ width: `${broadcast.progress_percent}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-xs text-dark-400">
                      {broadcast.progress_percent.toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg bg-dark-700 px-3 py-1 text-dark-300 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('admin.broadcasts.prev')}
          </button>
          <span className="text-dark-400">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg bg-dark-700 px-3 py-1 text-dark-300 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('admin.broadcasts.next')}
          </button>
        </div>
      )}
    </div>
  );
}
