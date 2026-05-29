import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPinnedMessagesApi, PinnedMessageResponse } from '../api/adminPinnedMessages';
import { AdminBackButton } from '../components/admin';
import { useNativeDialog } from '../platform/hooks/useNativeDialog';

// Icons
const PinIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
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
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const VideoIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const MenuIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
    />
  </svg>
);

const RepeatIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3"
    />
  </svg>
);

const BroadcastIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const UnpinIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Message card component
function PinnedMessageCard({
  message,
  onActivate,
  onDeactivate,
  onBroadcast,
  onDelete,
  onEdit,
  onUnpin,
}: {
  message: PinnedMessageResponse;
  onActivate: (id: number) => void;
  onDeactivate: () => void;
  onBroadcast: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (id: number) => void;
  onUnpin: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        message.is_active
          ? 'border-success-500/50 bg-success-500/5'
          : 'border-dark-700 bg-dark-800/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Status + ID + media indicator */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                message.is_active
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-dark-500/20 text-dark-400'
              }`}
            >
              {message.is_active
                ? t('admin.pinnedMessages.active')
                : t('admin.pinnedMessages.inactive')}
            </span>
            <span className="text-xs text-dark-400">#{message.id}</span>
            {message.media_type && (
              <span className="text-dark-400">
                {message.media_type === 'photo' ? <PhotoIcon /> : <VideoIcon />}
              </span>
            )}
            {message.send_before_menu && (
              <span className="text-dark-500" title={t('admin.pinnedMessages.sendBeforeMenu')}>
                <MenuIcon />
              </span>
            )}
            {message.send_on_every_start && (
              <span className="text-dark-500" title={t('admin.pinnedMessages.sendOnEveryStart')}>
                <RepeatIcon />
              </span>
            )}
          </div>

          {/* Content preview */}
          <p className="line-clamp-3 text-sm text-dark-100">
            {message.content || t('admin.pinnedMessages.noContent')}
          </p>

          {/* Date */}
          <div className="mt-2 text-xs text-dark-400">
            {new Date(message.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-dark-700/50 pt-3">
        <button
          onClick={() => onEdit(message.id)}
          className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
        >
          <EditIcon />
          {t('admin.pinnedMessages.editMessage')}
        </button>

        {message.is_active ? (
          <>
            <button
              onClick={onDeactivate}
              className="flex items-center gap-1.5 rounded-lg bg-warning-500/20 px-3 py-1.5 text-xs text-warning-400 transition-colors hover:bg-warning-500/30"
            >
              <XIcon />
              {t('admin.pinnedMessages.deactivate')}
            </button>
            <button
              onClick={onUnpin}
              className="flex items-center gap-1.5 rounded-lg bg-error-500/20 px-3 py-1.5 text-xs text-error-400 transition-colors hover:bg-error-500/30"
            >
              <UnpinIcon />
              {t('admin.pinnedMessages.unpinAll')}
            </button>
          </>
        ) : (
          <button
            onClick={() => onActivate(message.id)}
            className="flex items-center gap-1.5 rounded-lg bg-success-500/20 px-3 py-1.5 text-xs text-success-400 transition-colors hover:bg-success-500/30"
          >
            <CheckIcon />
            {t('admin.pinnedMessages.activate')}
          </button>
        )}

        <button
          onClick={() => onBroadcast(message.id)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500/20 px-3 py-1.5 text-xs text-accent-400 transition-colors hover:bg-accent-500/30"
        >
          <BroadcastIcon />
          {t('admin.pinnedMessages.broadcastToAll')}
        </button>

        {!message.is_active && (
          <button
            onClick={() => onDelete(message.id)}
            className="flex items-center gap-1.5 rounded-lg bg-error-500/20 px-3 py-1.5 text-xs text-error-400 transition-colors hover:bg-error-500/30"
          >
            <TrashIcon />
            {t('admin.pinnedMessages.delete')}
          </button>
        )}
      </div>
    </div>
  );
}

// Main component
export default function AdminPinnedMessages() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const limit = 20;

  // Fetch pinned messages
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'pinned-messages', 'list', page],
    queryFn: () => adminPinnedMessagesApi.list(limit, page * limit),
  });

  const messages = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (id: number) => adminPinnedMessagesApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => adminPinnedMessagesApi.deactivate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
    },
  });

  const unpinMutation = useMutation({
    mutationFn: () => adminPinnedMessagesApi.unpin(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
    },
  });

  const broadcastMutation = useMutation({
    mutationFn: (id: number) => adminPinnedMessagesApi.broadcast(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminPinnedMessagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pinned-messages'] });
    },
  });

  const handleActivate = (id: number) => {
    activateMutation.mutate(id);
  };

  const handleDeactivate = () => {
    deactivateMutation.mutate();
  };

  const { confirm: confirmDialog } = useNativeDialog();

  const handleUnpin = async () => {
    if (await confirmDialog(t('admin.pinnedMessages.unpinConfirm'))) {
      unpinMutation.mutate();
    }
  };

  const handleBroadcast = async (id: number) => {
    if (await confirmDialog(t('admin.pinnedMessages.broadcastConfirm'))) {
      broadcastMutation.mutate(id);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirmDialog(t('admin.pinnedMessages.deleteConfirm'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id: number) => {
    navigate(`/admin/pinned-messages/${id}/edit`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-error-500/20 p-2 text-error-400">
              <PinIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-100">{t('admin.pinnedMessages.title')}</h1>
              <p className="text-sm text-dark-400">{t('admin.pinnedMessages.subtitle')}</p>
            </div>
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
            onClick={() => navigate('/admin/pinned-messages/create')}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
          >
            <PlusIcon />
            <span className="hidden sm:inline">{t('admin.pinnedMessages.create')}</span>
          </button>
        </div>
      </div>

      {/* Messages list */}
      {isLoading ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <RefreshIcon />
          <p className="mt-2">{t('common.loading')}</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-8 text-center text-dark-400">
          <div className="mx-auto mb-2 w-fit">
            <PinIcon />
          </div>
          <p>{t('admin.pinnedMessages.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((message: PinnedMessageResponse) => (
            <PinnedMessageCard
              key={message.id}
              message={message}
              onActivate={handleActivate}
              onDeactivate={handleDeactivate}
              onBroadcast={handleBroadcast}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onUnpin={handleUnpin}
            />
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
            {t('admin.pinnedMessages.prev')}
          </button>
          <span className="text-dark-400">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg bg-dark-700 px-3 py-1 text-dark-300 hover:bg-dark-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('admin.pinnedMessages.next')}
          </button>
        </div>
      )}
    </div>
  );
}
