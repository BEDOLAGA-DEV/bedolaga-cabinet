import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminBroadcastsApi, type BroadcastChannel } from '../api/adminBroadcasts';
import { AdminBackButton } from '../components/admin';
import { StatCard } from '@/components/stats';
import {
  BanIcon,
  DocumentIcon,
  EmailIcon,
  PhotoIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
  TelegramIcon,
  UsersIcon,
  VideoIcon,
  XCircleIcon,
} from '@/components/icons';

// Channel badge component
function ChannelBadge({ channel }: { channel?: BroadcastChannel }) {
  if (!channel || channel === 'telegram') {
    return (
      <span className="flex items-center gap-1 rounded-full bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
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
    <span className="flex items-center gap-1 rounded-full bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
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

  // Fetch broadcast details
  const {
    data: broadcast,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'broadcasts', 'detail', broadcastId],
    queryFn: async () => {
      if (!broadcastId) throw new Error('Invalid broadcast ID');
      return adminBroadcastsApi.get(broadcastId);
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
          className="rounded-lg bg-accent-500 px-4 py-2 text-on-accent transition-colors hover:bg-accent-600"
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
          <RefreshIcon className="h-5 w-5" />
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label={t('admin.broadcasts.total')}
          value={broadcast.total_count}
          icon={<UsersIcon className="h-5 w-5" />}
          tone="neutral"
        />
        <StatCard
          label={t('admin.broadcasts.sent')}
          value={broadcast.sent_count}
          icon={<SendIcon className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('admin.broadcasts.blocked')}
          value={broadcast.blocked_count}
          icon={<BanIcon className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={t('admin.broadcasts.failed')}
          value={broadcast.failed_count}
          icon={<XCircleIcon className="h-5 w-5" />}
          tone="error"
        />
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
