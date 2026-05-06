import { useState, useRef, useEffect } from 'react';
import logger from '../utils/logger';
import { linkifyText } from '../utils/linkify';
import { MessageMediaGrid } from '../components/tickets/MessageMediaGrid';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, AdminTicket, AdminTicketDetail } from '../api/admin';
import { ticketsApi } from '../api/tickets';
import { usePlatform } from '../platform/hooks/usePlatform';

interface MediaAttachment {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  fileId?: string;
  mediaType: string;
  error?: string;
}

const ALLOWED_FILE_TYPES: Record<string, string> = {
  'image/jpeg': 'photo',
  'image/png': 'photo',
  'image/gif': 'photo',
  'image/webp': 'photo',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'text/plain': 'document',
  'application/zip': 'document',
  'application/x-rar-compressed': 'document',
};

const ACCEPT_STRING = Object.keys(ALLOWED_FILE_TYPES).join(',');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// BackIcon
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

export default function AdminTickets() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIdRef = useRef(0);

  // Track all created blob URLs for cleanup on unmount
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uploadRef = uploadIdRef;
    const urls = blobUrlsRef;
    return () => {
      uploadRef.current++;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const { data: stats } = useQuery({
    queryKey: ['admin-ticket-stats'],
    queryFn: adminApi.getTicketStats,
  });

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-tickets', page, statusFilter],
    queryFn: () =>
      adminApi.getTickets({
        page,
        per_page: 20,
        status: statusFilter || undefined,
      }),
  });

  const { data: selectedTicket, isLoading: ticketLoading } = useQuery({
    queryKey: ['admin-ticket', selectedTicketId],
    queryFn: () => adminApi.getTicket(selectedTicketId!),
    enabled: !!selectedTicketId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      adminApi.updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-stats'] });
    },
  });

  const clearAttachments = () => {
    uploadIdRef.current++;
    setAttachments((prev) => {
      prev.forEach((a) => {
        if (a.preview) {
          URL.revokeObjectURL(a.preview);
          blobUrlsRef.current.delete(a.preview);
        }
      });
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const remaining = 10 - attachments.length;
    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      const mediaType = ALLOWED_FILE_TYPES[file.type];
      if (!mediaType) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const preview = mediaType === 'photo' ? URL.createObjectURL(file) : '';
      if (preview) blobUrlsRef.current.add(preview);
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `att_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const entry: MediaAttachment = { id, file, preview, uploading: true, mediaType };
      const uploadToken = uploadIdRef.current;

      setAttachments((prev) => [...prev, entry]);

      // Upload in background; ignore the result if user cleared/unmounted in the meantime.
      (async () => {
        try {
          const result = await ticketsApi.uploadMedia(file, mediaType);
          if (uploadIdRef.current !== uploadToken) return;
          setAttachments((prev) =>
            prev.map((a) => (a.id === id ? { ...a, uploading: false, fileId: result.file_id } : a)),
          );
        } catch {
          if (uploadIdRef.current !== uploadToken) return;
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === id ? { ...a, uploading: false, error: t('admin.tickets.uploadFailed') } : a,
            ),
          );
        }
      })();
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    if (attachments.some((a) => a.uploading || a.error)) return;

    const readyAttachments = attachments.filter((a) => a.fileId) as Array<{
      fileId: string;
      mediaType: string;
    }>;

    const hasText = replyText.trim().length > 0;
    const hasMedia = readyAttachments.length > 0;
    if (!hasText && !hasMedia) return;

    const media = hasMedia
      ? {
          media_type: readyAttachments[0].mediaType,
          media_file_id: readyAttachments[0].fileId,
          media_items: readyAttachments.map((a) => ({
            type: a.mediaType as 'photo' | 'video' | 'document',
            file_id: a.fileId,
          })),
        }
      : undefined;

    setIsReplying(true);
    setReplyError(null);
    try {
      await adminApi.replyToTicket(selectedTicketId, replyText, media);
    } catch (err) {
      logger.error('Ticket reply failed:', err);
      const msg =
        err instanceof Error ? err.message : t('admin.tickets.replyFailed', 'Failed to send reply');
      setReplyError(msg);
      setIsReplying(false);
      return;
    }

    setReplyText('');
    clearAttachments();
    setIsReplying(false);
    queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] });
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['admin-ticket-stats'] });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-info';
      case 'pending':
        return 'badge-warning';
      case 'answered':
        return 'badge-success';
      case 'closed':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'badge-error';
      case 'high':
        return 'badge-warning';
      default:
        return 'badge-neutral';
    }
  };

  const formatUser = (ticket: AdminTicket | AdminTicketDetail) => {
    if (!ticket.user) return 'Unknown';
    const { first_name, last_name, username } = ticket.user;
    if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
    if (username) return `@${username}`;
    return 'User';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  };

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
            {t('admin.tickets.title')}
          </h1>
        </div>
        <button
          onClick={() => navigate('/admin/tickets/settings')}
          className="btn-secondary flex items-center gap-2"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {t('admin.tickets.settings')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="card text-center">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('admin.tickets.total')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-accent-400">{stats.open}</div>
            <div className="stat-label">{t('admin.tickets.statusOpen')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-warning-400">{stats.pending}</div>
            <div className="stat-label">{t('admin.tickets.statusPending')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-success-400">{stats.answered}</div>
            <div className="stat-label">{t('admin.tickets.statusAnswered')}</div>
          </div>
          <div className="card col-span-2 text-center sm:col-span-1">
            <div className="stat-value text-dark-400">{stats.closed}</div>
            <div className="stat-label">{t('admin.tickets.statusClosed')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ticket List */}
        <div className="card lg:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark-100">{t('admin.tickets.list')}</h2>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto px-3 py-1.5 text-sm"
            >
              <option value="">{t('admin.tickets.allStatuses')}</option>
              <option value="open">{t('admin.tickets.statusOpen')}</option>
              <option value="pending">{t('admin.tickets.statusPending')}</option>
              <option value="answered">{t('admin.tickets.statusAnswered')}</option>
              <option value="closed">{t('admin.tickets.statusClosed')}</option>
            </select>
          </div>

          {ticketsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : ticketsData?.items.length === 0 ? (
            <div className="py-12 text-center text-dark-500">{t('admin.tickets.noTickets')}</div>
          ) : (
            <div className="scrollbar-hide max-h-[500px] space-y-2 overflow-y-auto">
              {ticketsData?.items.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setReplyText('');
                    clearAttachments();
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selectedTicketId === ticket.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="truncate font-medium text-dark-100">
                      #{ticket.id} {ticket.title}
                    </span>
                    <span className={getStatusBadge(ticket.status)}>
                      {t(
                        `admin.tickets.status${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`,
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500">
                    {formatUser(ticket)}
                    {ticket.user?.telegram_id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(String(ticket.user!.telegram_id));
                        }}
                        className="ml-1 text-dark-600 transition-colors hover:text-accent-400"
                        title={t('admin.tickets.copyTelegramId')}
                      >
                        (TG: {ticket.user!.telegram_id})
                      </button>
                    )}{' '}
                    | {new Date(ticket.updated_at).toLocaleDateString()}
                  </div>
                  {ticket.last_message && (
                    <div className="mt-1 truncate text-xs text-dark-600">
                      {ticket.last_message.is_from_admin
                        ? t('admin.tickets.you')
                        : t('admin.tickets.user')}
                      :{' '}
                      {ticket.last_message.message_text
                        ? `${ticket.last_message.message_text.substring(0, 50)}${ticket.last_message.message_text.length > 50 ? '...' : ''}`
                        : ticket.last_message.has_media
                          ? `[${ticket.last_message.media_type}]`
                          : '...'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {ticketsData && ticketsData.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 border-t border-dark-800/50 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <span className="text-sm text-dark-400">
                {page} / {ticketsData.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(ticketsData.pages, p + 1))}
                disabled={page === ticketsData.pages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        <div className="card lg:col-span-2">
          {!selectedTicketId ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
                <svg
                  className="h-8 w-8 text-dark-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z"
                  />
                </svg>
              </div>
              <div className="text-dark-400">{t('admin.tickets.selectTicket')}</div>
            </div>
          ) : ticketLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : selectedTicket ? (
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="mb-4 border-b border-dark-800/50 pb-4">
                <div className="mb-3 flex items-start justify-between">
                  <h3 className="text-lg font-semibold text-dark-100">
                    #{selectedTicket.id} {selectedTicket.title}
                  </h3>
                  <div className="flex gap-2">
                    <span className={getStatusBadge(selectedTicket.status)}>
                      {t(
                        `admin.tickets.status${selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}`,
                      )}
                    </span>
                    <span className={getPriorityBadge(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-2 text-sm text-dark-500">
                  <span>
                    {t('admin.tickets.from')}: {formatUser(selectedTicket)}
                    {selectedTicket.user?.telegram_id && (
                      <button
                        onClick={() => copyToClipboard(String(selectedTicket.user!.telegram_id))}
                        className="ml-1 rounded bg-dark-700 px-2 py-0.5 text-xs transition-colors hover:bg-dark-600"
                        title={t('admin.tickets.copyTelegramId')}
                      >
                        TG: {selectedTicket.user!.telegram_id}
                      </button>
                    )}{' '}
                    | {t('admin.tickets.created')}:{' '}
                    {new Date(selectedTicket.created_at).toLocaleString()}
                  </span>
                  {selectedTicket.user && (
                    <button
                      onClick={() => navigate(`/admin/users/${selectedTicket.user!.id}`)}
                      className="shrink-0 rounded-lg border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-xs text-accent-400 transition-colors hover:bg-accent-500/20"
                    >
                      {t('admin.tickets.viewUser')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['open', 'pending', 'answered', 'closed'].map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        statusMutation.mutate({ ticketId: selectedTicket.id, status: s })
                      }
                      disabled={selectedTicket.status === s || statusMutation.isPending}
                      className={`rounded-lg border px-3 py-1.5 text-xs transition-all ${
                        selectedTicket.status === s
                          ? 'border-accent-500/50 bg-accent-500/20 text-accent-400'
                          : 'border-dark-700/50 text-dark-400 hover:border-dark-600 hover:text-dark-200'
                      } disabled:opacity-50`}
                    >
                      {t(`admin.tickets.status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="scrollbar-hide mb-4 max-h-[400px] flex-1 space-y-4 overflow-y-auto">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-4 ${
                      msg.is_from_admin
                        ? 'ml-4 border border-accent-500/20 bg-accent-500/10'
                        : 'mr-4 border border-dark-700/30 bg-dark-800/50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`text-xs font-medium ${msg.is_from_admin ? 'text-accent-400' : 'text-dark-400'}`}
                      >
                        {msg.is_from_admin
                          ? t('admin.tickets.adminLabel')
                          : t('admin.tickets.userLabel')}
                      </span>
                      <span className="text-xs text-dark-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    {msg.message_text && (
                      <p
                        className="whitespace-pre-wrap text-dark-200 [&_a]:text-accent-400 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: linkifyText(msg.message_text) }}
                      />
                    )}
                    <MessageMediaGrid message={msg} translateError={t('support.imageLoadFailed')} />
                  </div>
                ))}
              </div>

              {/* Reply form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleReply} className="border-t border-dark-800/50 pt-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('admin.tickets.replyPlaceholder')}
                    rows={3}
                    className="input resize-none"
                  />

                  {/* Attachments preview */}
                  {attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {attachments.map((att, idx) => (
                        <div key={att.id} className="relative">
                          {att.mediaType === 'photo' && att.preview ? (
                            <img
                              src={att.preview}
                              alt="Preview"
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-dark-700 text-xs text-dark-400">
                              {att.file.name.slice(-6)}
                            </div>
                          )}
                          {att.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                            </div>
                          )}
                          {att.error && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/30">
                              <span className="text-xs text-red-300">!</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAttachment(idx)}
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-dark-600 text-dark-300 hover:bg-red-500 hover:text-white"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT_STRING}
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {replyError && (
                    <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                      {replyError}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={attachments.length >= 10 || attachments.some((a) => a.uploading)}
                      className="flex items-center gap-2 rounded-lg border border-dark-700/50 px-3 py-2 text-sm text-dark-400 transition-colors hover:border-dark-600 hover:text-dark-200 disabled:opacity-50"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                        />
                      </svg>
                      {t('admin.tickets.attachMedia')}{' '}
                      {attachments.length > 0 && `(${attachments.length}/10)`}
                    </button>
                    <button
                      type="submit"
                      disabled={
                        (!replyText.trim() && attachments.filter((a) => a.fileId).length === 0) ||
                        isReplying ||
                        attachments.some((a) => a.uploading || a.error)
                      }
                      className="btn-primary"
                    >
                      {isReplying ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          {t('common.loading')}
                        </span>
                      ) : (
                        t('admin.tickets.sendReply')
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
