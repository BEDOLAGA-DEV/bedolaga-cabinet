import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminTicket, type AdminTicketDetail } from '../../../api/admin';
import { MessageMediaGrid } from '../../tickets/MessageMediaGrid';
import { linkifyText } from '../../../utils/linkify';
import { ChatIcon, BackIcon, SendIcon } from '@/components/icons';

// ──────────────────────────────────────────────────────────────────
// Tickets tab — list view + chat view (selected ticket replaces list).
// Owns its own query, selection state, reply form state, and the
// auto-scroll-to-bottom ref. Parent only knows the userId.
// ──────────────────────────────────────────────────────────────────

export interface TicketsTabProps {
  userId: number;
  formatDate: (date: string | null) => string;
}

const STATUS_VALUES = ['open', 'pending', 'answered', 'closed'] as const;
type TicketStatus = (typeof STATUS_VALUES)[number];

export function TicketsTab({ userId, formatDate }: TicketsTabProps) {
  // List query
  const ticketsQuery = useQuery({
    queryKey: ['admin-user-tickets', userId] as const,
    queryFn: () => adminApi.getTickets({ user_id: userId, per_page: 50 }),
    enabled: !!userId,
  });
  const tickets = ticketsQuery.data?.items ?? [];
  const ticketsTotal = ticketsQuery.data?.total ?? 0;
  const ticketsLoading = ticketsQuery.isFetching;

  // Selected ticket (chat view)
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketDetail | null>(null);
  const [ticketDetailLoading, setTicketDetailLoading] = useState(false);

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);

  // Status-change gate
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ─── Detail loader / refresh chain ──────────────────────────────

  const loadTicketDetail = async (ticketId: number) => {
    try {
      setTicketDetailLoading(true);
      const data = await adminApi.getTicket(ticketId);
      setSelectedTicket(data);
    } catch (error) {
      console.error('Failed to load ticket detail:', error);
    } finally {
      setTicketDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTicketId) {
      loadTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId]);

  // Auto-scroll messages list to the latest reply
  useEffect(() => {
    if (selectedTicket && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket]);

  // ─── Mutations ──────────────────────────────────────────────────

  const handleTicketReply = async () => {
    if (!selectedTicketId || !replyText.trim()) return;
    setReplySending(true);
    try {
      await adminApi.replyToTicket(selectedTicketId, replyText);
      setReplyText('');
      await loadTicketDetail(selectedTicketId);
      await ticketsQuery.refetch();
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setReplySending(false);
    }
  };

  const handleTicketStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicketId) return;
    setActionLoading(true);
    try {
      await adminApi.updateTicketStatus(selectedTicketId, newStatus);
      await loadTicketDetail(selectedTicketId);
      await ticketsQuery.refetch();
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {selectedTicketId ? (
        /* Ticket Chat View */
        ticketDetailLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : selectedTicket ? (
          <ChatView
            selectedTicket={selectedTicket}
            actionLoading={actionLoading}
            replyText={replyText}
            replySending={replySending}
            messagesEndRef={messagesEndRef}
            onBack={() => {
              setSelectedTicketId(null);
              setSelectedTicket(null);
            }}
            onStatusChange={handleTicketStatusChange}
            onReplyTextChange={setReplyText}
            onReply={handleTicketReply}
            formatDate={formatDate}
          />
        ) : null
      ) : ticketsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState />
      ) : (
        <TicketsList
          tickets={tickets}
          ticketsTotal={ticketsTotal}
          onOpenTicket={setSelectedTicketId}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sub-views (kept private to this file for now)
// ──────────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-dark-800/50 py-12">
      <ChatIcon className="mb-3 h-12 w-12 text-dark-600" />
      <p className="text-dark-400">{t('admin.users.detail.noTickets')}</p>
    </div>
  );
}

function TicketsList({
  tickets,
  ticketsTotal,
  onOpenTicket,
  formatDate,
}: {
  tickets: AdminTicket[];
  ticketsTotal: number;
  onOpenTicket: (id: number) => void;
  formatDate: (date: string | null) => string;
}) {
  const { t } = useTranslation();
  const statusStyles: Record<string, string> = {
    open: 'bg-accent-500/20 text-accent-400 border-accent-500/30',
    pending: 'bg-warning-500/20 text-warning-400 border-warning-500/30',
    answered: 'bg-success-500/20 text-success-400 border-success-500/30',
    closed: 'bg-dark-600 text-dark-400 border-dark-500',
  };
  return (
    <>
      <div className="text-sm text-dark-400">
        {ticketsTotal} {t('admin.users.detail.ticketsCount')}
      </div>
      <div className="space-y-2">
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => onOpenTicket(ticket.id)}
            className="w-full rounded-xl bg-dark-800/50 p-4 text-left transition-colors hover:bg-dark-700/50"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-dark-100">
                #{ticket.id} {ticket.title}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${statusStyles[ticket.status] || statusStyles.closed}`}
              >
                {ticket.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-dark-500">
              <span>{formatDate(ticket.created_at)}</span>
              <span>
                {ticket.messages_count} {t('admin.users.detail.messagesCount')}
              </span>
            </div>
            {ticket.last_message && (
              <div className="mt-2 truncate text-sm text-dark-400">
                {ticket.last_message.is_from_admin ? '> ' : ''}
                {ticket.last_message.message_text}
              </div>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

function ChatView({
  selectedTicket,
  actionLoading,
  replyText,
  replySending,
  messagesEndRef,
  onBack,
  onStatusChange,
  onReplyTextChange,
  onReply,
  formatDate,
}: {
  selectedTicket: AdminTicketDetail;
  actionLoading: boolean;
  replyText: string;
  replySending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onStatusChange: (s: TicketStatus) => void;
  onReplyTextChange: (text: string) => void;
  onReply: () => void;
  formatDate: (date: string | null) => string;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {/* Chat header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label={t('common.back', 'Back')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dark-800 transition-colors hover:bg-dark-700 sm:h-8 sm:w-8"
        >
          <BackIcon className="h-4 w-4 text-dark-400" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-dark-100">
            #{selectedTicket.id} {selectedTicket.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-500">
            <span
              className={`rounded-full border px-1.5 py-0.5 ${
                {
                  open: 'border-accent-500/30 bg-accent-500/20 text-accent-400',
                  pending: 'border-warning-500/30 bg-warning-500/20 text-warning-400',
                  answered: 'border-success-500/30 bg-success-500/20 text-success-400',
                  closed: 'border-dark-500 bg-dark-600 text-dark-400',
                }[selectedTicket.status] || 'border-dark-500 bg-dark-600 text-dark-400'
              }`}
            >
              {selectedTicket.status}
            </span>
            <span>{formatDate(selectedTicket.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Status buttons — 36px mobile / 26px desktop. Active state matters
          and gets mis-tapped on mobile when too small. */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_VALUES.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(s)}
            disabled={selectedTicket.status === s || actionLoading}
            className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs transition-all sm:min-h-0 sm:py-1 ${
              selectedTicket.status === s
                ? 'border-accent-500/50 bg-accent-500/20 text-accent-400'
                : 'border-dark-700/50 text-dark-400 hover:border-dark-600 hover:text-dark-200'
            } disabled:opacity-50`}
          >
            {t(`admin.tickets.status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="scrollbar-hide max-h-[60vh] space-y-3 overflow-y-auto rounded-xl bg-dark-800/30 p-3">
        {selectedTicket.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl p-3 ${
              msg.is_from_admin
                ? 'ml-6 border border-accent-500/20 bg-accent-500/10'
                : 'mr-6 border border-dark-700/30 bg-dark-800/50'
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span
                className={`text-xs font-medium ${msg.is_from_admin ? 'text-accent-400' : 'text-dark-400'}`}
              >
                {msg.is_from_admin ? t('admin.tickets.adminLabel') : t('admin.tickets.userLabel')}
              </span>
              <span className="text-xs text-dark-500">{formatDate(msg.created_at)}</span>
            </div>
            {msg.message_text && (
              <p
                className="whitespace-pre-wrap text-sm text-dark-200 [&_a]:text-accent-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: linkifyText(msg.message_text) }}
              />
            )}
            <MessageMediaGrid message={msg} />
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form */}
      {selectedTicket.status !== 'closed' && (
        <div className="flex gap-2">
          <textarea
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder={t('admin.tickets.replyPlaceholder')}
            rows={2}
            className="input flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onReply();
              }
            }}
          />
          <button
            onClick={onReply}
            disabled={!replyText.trim() || replySending}
            aria-label={t('admin.tickets.sendReply', 'Send reply')}
            className="min-h-[44px] min-w-[44px] shrink-0 self-end rounded-lg bg-accent-500 px-4 py-2 text-sm text-white transition-colors hover:bg-accent-600 disabled:opacity-50 sm:min-h-0 sm:min-w-0"
          >
            {replySending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <SendIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
