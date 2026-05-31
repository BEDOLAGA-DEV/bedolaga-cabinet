import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ticketsApi } from '../api/tickets';
import { MessageMediaGrid } from '../components/tickets/MessageMediaGrid';
import { infoApi } from '../api/info';
import { useAuthStore } from '../store/auth';
import { logger } from '../utils/logger';
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit';
import type { TicketDetail } from '../types';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import { ChatIcon, CloseIcon, ImageIcon, PlusIcon, SendIcon } from '@/components/icons';
import { usePlatform } from '@/platform';
import { linkifyText } from '../utils/linkify';

const log = logger.createLogger('Support');

// Media attachment state
interface MediaAttachment {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  fileId?: string;
  error?: string;
}

export default function Support() {
  log.debug('Component loaded');

  const { t } = useTranslation();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const queryClient = useQueryClient();
  const { openTelegramLink, openLink } = usePlatform();
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Media attachment states (multi-upload, up to 10)
  const [createAttachments, setCreateAttachments] = useState<MediaAttachment[]>([]);
  const [replyAttachments, setReplyAttachments] = useState<MediaAttachment[]>([]);
  const createFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const urls = blobUrlsRef;
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const clearCreateAttachments = () => {
    createAttachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setCreateAttachments([]);
    if (createFileInputRef.current) createFileInputRef.current.value = '';
  };

  const clearReplyAttachments = () => {
    replyAttachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setReplyAttachments([]);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  // Get support configuration
  const { data: supportConfig, isLoading: configLoading } = useQuery({
    queryKey: ['support-config'],
    queryFn: infoApi.getSupportConfig,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.getTickets({ per_page: 20 }),
    enabled: supportConfig?.tickets_enabled === true,
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['ticket', selectedTicket?.id],
    queryFn: () => ticketsApi.getTicket(selectedTicket!.id),
    enabled: !!selectedTicket,
  });

  // Handle file selection (multi-upload)
  const handleFileSelect = async (
    file: File,
    setAttachments: React.Dispatch<React.SetStateAction<MediaAttachment[]>>,
  ) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;

    const preview = URL.createObjectURL(file);
    blobUrlsRef.current.add(preview);
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `att_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const entry: MediaAttachment = { id, file, preview, uploading: true };
    setAttachments((prev) => (prev.length >= 10 ? prev : [...prev, entry]));

    try {
      const result = await ticketsApi.uploadMedia(file, 'photo');
      setAttachments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, uploading: false, fileId: result.file_id } : a)),
      );
    } catch {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, uploading: false, error: t('support.uploadFailed') } : a,
        ),
      );
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const ready = createAttachments.filter((a) => a.fileId) as Array<{ fileId: string }>;
      const media =
        ready.length > 0
          ? {
              media_type: 'photo',
              media_file_id: ready[0].fileId,
              media_items: ready.map((a) => ({ type: 'photo' as const, file_id: a.fileId })),
            }
          : undefined;
      return ticketsApi.createTicket(newTitle, newMessage, media);
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreateForm(false);
      setNewTitle('');
      setNewMessage('');
      clearCreateAttachments();
      setSelectedTicket(ticket);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const ready = replyAttachments.filter((a) => a.fileId) as Array<{ fileId: string }>;
      const media =
        ready.length > 0
          ? {
              media_type: 'photo',
              media_file_id: ready[0].fileId,
              media_items: ready.map((a) => ({ type: 'photo' as const, file_id: a.fileId })),
            }
          : undefined;
      await ticketsApi.addMessage(selectedTicket!.id, replyMessage, media);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicket?.id] });
      setReplyMessage('');
      clearReplyAttachments();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-info';
      case 'answered':
        return 'badge-success';
      case 'pending':
        return 'badge-warning';
      case 'closed':
        return 'badge-neutral';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`support.status.${status}`) || status;
  };

  // Show loading while checking configuration
  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // If tickets are disabled, show redirect message
  if (supportConfig && !supportConfig.tickets_enabled) {
    log.debug('Tickets disabled, config:', supportConfig);

    const getSupportMessage = () => {
      log.debug('Getting support message for type:', supportConfig.support_type);

      if (supportConfig.support_type === 'profile') {
        const supportUsername = supportConfig.support_username || '@support';
        log.debug('Opening profile:', supportUsername);
        return {
          title: isAdmin ? t('support.ticketsDisabled') : t('support.title'),
          message: t('support.contactSupport', { username: supportUsername }),
          buttonText: t('support.contactUs'),
          buttonAction: () => {
            log.debug('Button clicked, opening:', supportUsername);

            // Extract username without @
            const username = supportUsername.startsWith('@')
              ? supportUsername.slice(1)
              : supportUsername;

            const webUrl = `https://t.me/${username}`;
            log.debug('Web URL:', webUrl);

            // Use platform's openTelegramLink
            openTelegramLink(webUrl);
          },
        };
      }

      if (supportConfig.support_type === 'url' && supportConfig.support_url) {
        return {
          title: isAdmin ? t('support.ticketsDisabled') : t('support.title'),
          message: t('support.useExternalLink'),
          buttonText: t('support.openSupport'),
          buttonAction: () => {
            openLink(supportConfig.support_url!, { tryInstantView: false });
          },
        };
      }

      // Fallback: contact support (should not normally happen if config is correct)
      const supportUsername = supportConfig.support_username || '@support';
      log.debug('Fallback: Opening profile:', supportUsername);
      return {
        title: isAdmin ? t('support.ticketsDisabled') : t('support.title'),
        message: t('support.contactSupport', { username: supportUsername }),
        buttonText: t('support.contactUs'),
        buttonAction: () => {
          log.debug('Fallback button clicked, opening:', supportUsername);

          // Extract username without @
          const username = supportUsername.startsWith('@')
            ? supportUsername.slice(1)
            : supportUsername;

          const webUrl = `https://t.me/${username}`;
          log.debug('Fallback opening URL:', webUrl);

          // Use platform's openTelegramLink
          openTelegramLink(webUrl);
        },
      };
    };

    const supportMessage = getSupportMessage();

    return (
      <div className="mx-auto mt-12 max-w-md">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
            <ChatIcon className="h-8 w-8 text-dark-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-dark-100">{supportMessage.title}</h2>
          <p className="mb-6 text-dark-400">{supportMessage.message}</p>
          <Button onClick={supportMessage.buttonAction} fullWidth>
            {supportMessage.buttonText}
          </Button>
        </Card>
      </div>
    );
  }

  // Attachments preview component
  const AttachmentsPreview = ({
    items,
    onRemove,
  }: {
    items: MediaAttachment[];
    onRemove: (idx: number) => void;
  }) =>
    items.length === 0 ? null : (
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((att, idx) => (
          <div key={idx} className="relative">
            {att.preview ? (
              <img
                src={att.preview}
                alt="Preview"
                loading="lazy"
                className="h-16 w-16 rounded-lg border border-dark-700 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-dark-700 text-xs text-dark-400">
                {att.file.name.slice(-6)}
              </div>
            )}
            {att.uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-dark-950/50">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
              </div>
            )}
            {att.error && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-error-500/30">
                <span className="text-xs text-error-300">!</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-dark-600 text-dark-300 hover:bg-error-500 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    );

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div
        variants={staggerItem}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">{t('support.title')}</h1>
        <Button
          onClick={() => {
            setShowCreateForm(true);
            setSelectedTicket(null);
            clearCreateAttachments();
          }}
        >
          <PlusIcon />
          <span className="ml-2">{t('support.newTicket')}</span>
        </Button>
      </motion.div>

      {/* Contact support card for "both" mode */}
      {supportConfig?.support_type === 'both' && supportConfig.support_username && (
        <motion.div variants={staggerItem}>
          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-800">
                <ChatIcon className="h-5 w-5 text-dark-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-dark-100">{t('support.contactUs')}</div>
                <div className="text-xs text-dark-400">{supportConfig.support_username}</div>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const username = supportConfig.support_username!.startsWith('@')
                  ? supportConfig.support_username!.slice(1)
                  : supportConfig.support_username!;
                openTelegramLink(`https://t.me/${username}`);
              }}
            >
              {t('support.contactUs')}
            </Button>
          </Card>
        </motion.div>
      )}

      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tickets List */}
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold text-dark-100">{t('support.yourTickets')}</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : tickets?.items && tickets.items.length > 0 ? (
            <div className="space-y-2">
              {tickets.items.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket as unknown as TicketDetail);
                    setShowCreateForm(false);
                    clearReplyAttachments();
                  }}
                  className={`w-full rounded-bento border p-4 text-left transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="truncate font-medium text-dark-100">{ticket.title}</div>
                    <span className={`${getStatusBadge(ticket.status)} flex-shrink-0`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500">
                    {new Date(ticket.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-dark-800">
                <ChatIcon className="h-8 w-8 text-dark-500" />
              </div>
              <div className="text-dark-400">{t('support.noTickets')}</div>
            </div>
          )}
        </Card>

        {/* Ticket Detail / Create Form */}
        <Card className="lg:col-span-2">
          {showCreateForm ? (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-dark-100">
                {t('support.createTicket')}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setRateLimitError(null);
                  // Rate limit: max 3 tickets per 60 seconds
                  if (!checkRateLimit(RATE_LIMIT_KEYS.TICKET_CREATE, 3, 60000)) {
                    const resetTime = getRateLimitResetTime(RATE_LIMIT_KEYS.TICKET_CREATE);
                    setRateLimitError(t('support.tooManyRequests', { seconds: resetTime }));
                    return;
                  }
                  createMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="support-subject" className="label">
                    {t('support.subject')}
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    className="input"
                    placeholder={t('support.subjectPlaceholder')}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    minLength={3}
                    maxLength={255}
                  />
                </div>
                <div>
                  <label htmlFor="support-message" className="label">
                    {t('support.message')}
                  </label>
                  <textarea
                    id="support-message"
                    className="input min-h-[150px]"
                    placeholder={t('support.messagePlaceholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                    minLength={10}
                    maxLength={4000}
                  />
                </div>

                {/* Image attachments for create */}
                <div>
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach((file) => handleFileSelect(file, setCreateAttachments));
                      e.target.value = '';
                    }}
                  />
                  <AttachmentsPreview
                    items={createAttachments}
                    onRemove={(idx) =>
                      setCreateAttachments((prev) => {
                        const removed = prev[idx];
                        if (removed?.preview) URL.revokeObjectURL(removed.preview);
                        return prev.filter((_, i) => i !== idx);
                      })
                    }
                  />
                  {createAttachments.length < 10 && (
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      disabled={createAttachments.some((a) => a.uploading)}
                      className="mt-2 flex items-center gap-2 text-sm text-dark-400 transition-colors hover:text-dark-200 disabled:opacity-50"
                    >
                      <ImageIcon />
                      {t('support.attachImage')}{' '}
                      {createAttachments.length > 0 && `(${createAttachments.length}/10)`}
                    </button>
                  )}
                </div>

                {rateLimitError && (
                  <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
                    {rateLimitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={createAttachments.some((a) => a.uploading)}
                    loading={createMutation.isPending}
                  >
                    <SendIcon className="h-4 w-4" />
                    <span className="ml-2">{t('support.send')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      clearCreateAttachments();
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            </div>
          ) : selectedTicket ? (
            <div className="flex h-full flex-col">
              <div className="mb-6 flex flex-col gap-2 border-b border-dark-800/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-dark-100">
                    {ticketDetail?.title || selectedTicket.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={getStatusBadge(ticketDetail?.status || selectedTicket.status)}>
                      {getStatusLabel(ticketDetail?.status || selectedTicket.status)}
                    </span>
                    <span className="text-xs text-dark-500">
                      {t('support.created')}{' '}
                      {new Date(selectedTicket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                </div>
              ) : ticketDetail?.messages ? (
                <div className="scrollbar-hide mb-6 max-h-96 flex-1 space-y-4 overflow-y-auto">
                  {ticketDetail.messages.map((msg) => (
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
                          {msg.is_from_admin ? t('support.supportTeam') : t('support.you')}
                        </span>
                        <span className="text-xs text-dark-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      {msg.message_text && (
                        <div
                          className="whitespace-pre-wrap text-dark-200 [&_a]:text-accent-400 [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: linkifyText(msg.message_text) }}
                        />
                      )}
                      {/* Display media if present */}
                      <MessageMediaGrid
                        message={msg}
                        translateError={t('support.imageLoadFailed')}
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Reply Form */}
              {ticketDetail?.status !== 'closed' && !ticketDetail?.is_reply_blocked && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setRateLimitError(null);
                    // Rate limit: max 5 replies per 30 seconds
                    if (!checkRateLimit(RATE_LIMIT_KEYS.TICKET_REPLY, 5, 30000)) {
                      const resetTime = getRateLimitResetTime(RATE_LIMIT_KEYS.TICKET_REPLY);
                      setRateLimitError(t('support.tooManyRequests', { seconds: resetTime }));
                      return;
                    }
                    replyMutation.mutate();
                  }}
                  className="border-t border-dark-800/50 pt-4"
                >
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <textarea
                        className="input min-h-[80px] flex-1"
                        placeholder={t('support.replyPlaceholder')}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        maxLength={4000}
                      />
                    </div>

                    {/* Image attachments for reply */}
                    <div>
                      <input
                        ref={replyFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          files.forEach((file) => handleFileSelect(file, setReplyAttachments));
                          e.target.value = '';
                        }}
                      />
                      <AttachmentsPreview
                        items={replyAttachments}
                        onRemove={(idx) =>
                          setReplyAttachments((prev) => {
                            const removed = prev[idx];
                            if (removed?.preview) URL.revokeObjectURL(removed.preview);
                            return prev.filter((_, i) => i !== idx);
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      {replyAttachments.length < 10 && (
                        <button
                          type="button"
                          onClick={() => replyFileInputRef.current?.click()}
                          disabled={replyAttachments.some((a) => a.uploading)}
                          className="flex items-center gap-2 text-sm text-dark-400 transition-colors hover:text-dark-200 disabled:opacity-50"
                        >
                          <ImageIcon />
                          {t('support.attachImage')}{' '}
                          {replyAttachments.length > 0 && `(${replyAttachments.length}/10)`}
                        </button>
                      )}

                      <Button
                        type="submit"
                        disabled={
                          (!replyMessage.trim() &&
                            replyAttachments.filter((a) => a.fileId).length === 0) ||
                          replyAttachments.some((a) => a.uploading)
                        }
                        loading={replyMutation.isPending}
                      >
                        <SendIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    {rateLimitError && (
                      <div className="mt-2 rounded-lg border border-error-500/30 bg-error-500/10 p-2 text-sm text-error-400">
                        {rateLimitError}
                      </div>
                    )}
                  </div>
                </form>
              )}

              {ticketDetail?.is_reply_blocked && (
                <div className="border-t border-dark-800/50 py-4 text-center text-sm text-dark-500">
                  {t('support.repliesDisabled')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
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
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
              </div>
              <div className="text-dark-400">{t('support.selectTicket')}</div>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
