import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminTicket, type AdminTicketDetail } from '../../../api/admin';
import { MessageMediaGrid } from '../../tickets/MessageMediaGrid';
import { linkifyText } from '../../../utils/linkify';

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
      <svg
        className="mb-3 h-12 w-12 text-dark-600"
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
          <svg
            className="h-4 w-4 text-dark-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
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
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
