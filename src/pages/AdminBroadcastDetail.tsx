import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminBroadcastsApi, type BroadcastChannel } from '../api/adminBroadcasts';
import { AdminBackButton } from '../components/admin';
import { useBackButton } from '../platform/hooks/useBackButton';

// Icons

const StopIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
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

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const TelegramIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

// Channel badge component
function ChannelBadge({ channel }: { channel?: BroadcastChannel }) {
  if (!channel || channel === 'telegram') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
        <TelegramIcon />
        <span className="hidden sm:inline">Telegram</span>
      </span>
    );
  }

  if (channel === 'email') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-400">
        <EmailIcon />
        <span className="hidden sm:inline">Email</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
      <TelegramIcon />
      <span className="mx-0.5">+</span>
      <EmailIcon />
    </span>
  );
}

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
    <span className={`rounded-full px-3 py-1 text-sm font-medium ${config.bg} ${config.text}`}>
      {t(config.labelKey)}
    </span>
  );
}

export default function AdminBroadcastDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const broadcastId = id ? parseInt(id, 10) : null;

  useBackButton(() => navigate('/admin/broadcasts'));

  // Fetch broadcast details
  const {
    data: broadcast,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'broadcasts', 'detail', broadcastId],
    queryFn: async () => {
      if (!broadcastId) throw new Error('Invalid broadcast ID');
      const response = await adminBroadcastsApi.list(100, 0);
      const found = response.items.find((b) => b.id === broadcastId);
      if (!found) throw new Error('Broadcast not found');
      return found;
    },
    enabled: !!broadcastId && !isNaN(broadcastId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && ['queued', 'in_progress', 'cancelling'].includes(data.status)) {
        return 3000;
      }
      return false;
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: adminBroadcastsApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      refetch();
    },
  });

  const isRunning = broadcast && ['queued', 'in_progress', 'cancelling'].includes(broadcast.status);

  if (!broadcastId || isNaN(broadcastId)) {
    navigate('/admin/broadcasts');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-dark-400">{t('admin.broadcasts.notFound')}</p>
        <button
          onClick={() => navigate('/admin/broadcasts')}
          className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/broadcasts" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-dark-100">
                {t('admin.broadcasts.detail')} #{broadcast.id}
              </h1>
              <StatusBadge status={broadcast.status} />
              <ChannelBadge channel={broadcast.channel} />
            </div>
            <p className="text-sm text-dark-400">
              {new Date(broadcast.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="rounded-lg p-2 transition-colors hover:bg-dark-700"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-dark-400">{t('admin.broadcasts.progress')}</span>
            <span className="font-medium text-dark-100">
              {broadcast.progress_percent.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-dark-700">
            <div
              className="h-full bg-gradient-to-r from-accent-500 to-accent-400 transition-all duration-300"
              style={{ width: `${broadcast.progress_percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-center">
          <p className="text-3xl font-bold text-dark-100">{broadcast.total_count}</p>
          <p className="text-sm text-dark-400">{t('admin.broadcasts.total')}</p>
        </div>
        <div className="rounded-xl border border-success-500/30 bg-success-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-success-400">{broadcast.sent_count}</p>
          <p className="text-sm text-dark-400">{t('admin.broadcasts.sent')}</p>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-4 text-center">
          <p className="text-3xl font-bold text-error-400">{broadcast.failed_count}</p>
          <p className="text-sm text-dark-400">{t('admin.broadcasts.failed')}</p>
        </div>
      </div>

      {/* Target */}
      <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
        <p className="mb-1 text-sm text-dark-400">{t('admin.broadcasts.filter')}</p>
        <p className="font-medium text-dark-100">{broadcast.target_type}</p>
      </div>

      {/* Telegram Message */}
      {broadcast.message_text && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm text-dark-400">
            <TelegramIcon />
            {t('admin.broadcasts.message')}
          </p>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-dark-700/50 p-4 text-dark-100">
            {broadcast.message_text}
          </div>
        </div>
      )}

      {/* Email Subject */}
      {broadcast.email_subject && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm text-dark-400">
            <EmailIcon />
            {t('admin.broadcasts.emailSubject')}
          </p>
          <div className="rounded-lg bg-dark-700/50 p-4 text-dark-100">
            {broadcast.email_subject}
          </div>
        </div>
      )}

      {/* Email Content */}
      {broadcast.email_html_content && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 text-sm text-dark-400">{t('admin.broadcasts.emailContent')}</p>
          <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-dark-700/50 p-4 font-mono text-xs text-dark-100">
            {broadcast.email_html_content}
          </div>
        </div>
      )}

      {/* Media */}
      {broadcast.has_media && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <p className="mb-2 text-sm text-dark-400">{t('admin.broadcasts.media')}</p>
          <div className="flex items-center gap-3 text-dark-100">
            {broadcast.media_type === 'photo' && <PhotoIcon />}
            {broadcast.media_type === 'video' && <VideoIcon />}
            {broadcast.media_type === 'document' && <DocumentIcon />}
            <span className="capitalize">{broadcast.media_type}</span>
          </div>
        </div>
      )}

      {/* Admin info */}
      <div className="flex justify-between rounded-xl border border-dark-700 bg-dark-800/50 p-4 text-sm">
        <span className="text-dark-400">
          {t('admin.broadcasts.createdBy')}:{' '}
          <span className="text-dark-100">
            {broadcast.admin_name || t('admin.broadcasts.unknownAdmin')}
          </span>
        </span>
        <span className="text-dark-400">{new Date(broadcast.created_at).toLocaleString()}</span>
      </div>

      {/* Stop button */}
      {isRunning && broadcast.status !== 'cancelling' && (
        <button
          onClick={() => stopMutation.mutate(broadcast.id)}
          disabled={stopMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-error-500/30 bg-error-500/20 px-4 py-2 text-sm text-error-400 transition-colors hover:bg-error-500/30 disabled:opacity-50"
        >
          <StopIcon />
          {stopMutation.isPending ? t('admin.broadcasts.stopping') : t('admin.broadcasts.stop')}
        </button>
      )}
    </div>
  );
}
