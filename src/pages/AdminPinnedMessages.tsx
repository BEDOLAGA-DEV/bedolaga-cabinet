import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminPinnedMessagesApi, PinnedMessageResponse } from '../api/adminPinnedMessages';
import { AdminBackButton } from '../components/admin';
import { useNativeDialog } from '../platform/hooks/useNativeDialog';
import {
  BroadcastIcon,
  CheckIcon,
  EditIcon,
  MenuIcon,
  PhotoIcon,
  PinIcon,
  PlusIcon,
  RefreshIcon,
  RepeatIcon,
  TrashIcon,
  UnpinIcon,
  VideoIcon,
  XIcon,
} from '@/components/icons';

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
                {message.media_type === 'photo' ? (
                  <PhotoIcon className="h-4 w-4" />
                ) : (
                  <VideoIcon className="h-4 w-4" />
                )}
              </span>
            )}
            {message.send_before_menu && (
              <span className="text-dark-500" title={t('admin.pinnedMessages.sendBeforeMenu')}>
                <MenuIcon className="h-4 w-4" />
              </span>
            )}
            {message.send_on_every_start && (
              <span className="text-dark-500" title={t('admin.pinnedMessages.sendOnEveryStart')}>
                <RepeatIcon className="h-4 w-4" />
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
              <UnpinIcon className="h-4 w-4" />
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
          <BroadcastIcon className="h-4 w-4" />
          {t('admin.pinnedMessages.broadcastToAll')}
        </button>

        {!message.is_active && (
          <button
            onClick={() => onDelete(message.id)}
            className="flex items-center gap-1.5 rounded-lg bg-error-500/20 px-3 py-1.5 text-xs text-error-400 transition-colors hover:bg-error-500/30"
          >
            <TrashIcon className="h-4 w-4" />
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
              <PinIcon className="h-6 w-6" />
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
            <PinIcon className="h-6 w-6" />
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
