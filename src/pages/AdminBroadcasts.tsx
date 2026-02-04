import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminBroadcastsApi } from '../api/adminBroadcasts';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Icons

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

const BroadcastIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const PhotoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
    />
  </svg>
);

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

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch broadcasts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'broadcasts', 'list', page],
    queryFn: () => adminBroadcastsApi.list(limit, page * limit),
    refetchInterval: 5000, // Auto refresh every 5s
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
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
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
          <BroadcastIcon />
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
