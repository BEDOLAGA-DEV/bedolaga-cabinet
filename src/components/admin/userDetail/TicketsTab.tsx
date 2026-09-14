import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminTicketDetail } from '@/api/admin';
import { dayTimeLabel } from '@/components/admin/users';
import { BackIcon, SendIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { linkifyText } from '@/utils/linkify';
import { MessageMediaGrid } from '../../tickets/MessageMediaGrid';
import { useAdminAction } from './useAdminAction';

const STATUS_VALUES = ['open', 'pending', 'answered', 'closed'] as const;
type TicketStatus = (typeof STATUS_VALUES)[number];
const TICKETS_PAGE = 50;

const STATUS_TONE: Record<string, string> = {
  open: 'bg-accent-500/15 text-accent-400',
  pending: 'bg-warning-500/15 text-warning-400',
  answered: 'bg-success-500/15 text-success-400',
  closed: 'bg-dark-800 text-dark-400',
};

function useStatusLabel() {
  const { t } = useTranslation();
  return (status: string) =>
    (STATUS_VALUES as readonly string[]).includes(status)
      ? t(`admin.tickets.status${status.charAt(0).toUpperCase()}${status.slice(1)}`)
      : t('admin.tickets.statusOpen');
}

function StatusChip({ status }: { status: string }) {
  const label = useStatusLabel();
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        STATUS_TONE[status] ?? STATUS_TONE.closed,
      )}
    >
      {label(status)}
    </span>
  );
}

/**
 * Обращения человека: список, по нажатию — переписка с ответом и сменой статуса.
 * Тот же ключ запроса, что у счётчика в «Обзоре», — список не грузится дважды.
 */
export function TicketsTab({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const ticketsQuery = useQuery({
    queryKey: ['admin-user-tickets', userId] as const,
    queryFn: () => adminApi.getTickets({ user_id: userId, per_page: TICKETS_PAGE }),
  });
  const tickets = ticketsQuery.data?.items ?? [];

  if (selectedId !== null) {
    return (
      <TicketChat
        ticketId={selectedId}
        onBack={() => setSelectedId(null)}
        onChanged={() => void ticketsQuery.refetch()}
      />
    );
  }
  if (ticketsQuery.isLoading) {
    return (
      <SkeletonGroup className="space-y-2">
        <Skeleton variant="line" count={3} className="h-14" />
      </SkeletonGroup>
    );
  }
  if (tickets.length === 0) {
    return <p className="text-sm text-dark-500">{t('admin.users.detail.noTickets')}</p>;
  }

  return (
    <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <button
            type="button"
            onClick={() => setSelectedId(ticket.id)}
            className="-mx-2 flex w-[calc(100%+1rem)] flex-col gap-1 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-dark-800/40"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-dark-100">
                {ticket.title}
              </span>
              <StatusChip status={ticket.status} />
            </span>
            <span className="truncate text-xs text-dark-500">
              #{ticket.id} · {dayTimeLabel(ticket.updated_at, t)} ·{' '}
              {t('admin.users.detail.messages', { count: ticket.messages_count })}
            </span>
            {ticket.last_message?.message_text && (
              <span className="truncate text-sm text-dark-400">
                {ticket.last_message.is_from_admin && `${t('admin.tickets.adminLabel')}: `}
                {ticket.last_message.message_text}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function TicketChat({
  ticketId,
  onBack,
  onChanged,
}: {
  ticketId: number;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const statusLabel = useStatusLabel();
  const { busy, run } = useAdminAction();
  const [reply, setReply] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const detailQuery = useQuery({
    queryKey: ['admin-ticket-detail', ticketId] as const,
    queryFn: () => adminApi.getTicket(ticketId),
  });
  const ticket: AdminTicketDetail | undefined = detailQuery.data;

  useEffect(() => {
    if (ticket) endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [ticket]);

  const refresh = async () => {
    await detailQuery.refetch();
    onChanged();
  };

  const send = async () => {
    const text = reply.trim();
    if (!text) return;
    const sent = await run(() => adminApi.replyToTicket(ticketId, text), { after: refresh });
    if (sent) setReply('');
  };

  if (detailQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-error-400">{t('admin.users.detail.ticketLoadError')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void detailQuery.refetch()}
            className="btn-secondary"
          >
            {t('common.retry')}
          </button>
          <button type="button" onClick={onBack} className="btn-ghost">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }
  if (detailQuery.isLoading || !ticket) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('common.back')}
          className="btn-ghost h-10 w-10 shrink-0 p-0"
        >
          <BackIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-dark-100">{ticket.title}</div>
          <div className="text-xs text-dark-500">
            #{ticket.id} · {dayTimeLabel(ticket.created_at, t)}
          </div>
        </div>
        <StatusChip status={ticket.status} />
      </div>

      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={t('admin.users.detail.status')}
      >
        {STATUS_VALUES.filter((status) => status !== ticket.status).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              void run(() => adminApi.updateTicketStatus(ticketId, status as TicketStatus), {
                after: refresh,
              })
            }
            disabled={busy}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>

      <div className="scrollbar-hide max-h-[60vh] space-y-3 overflow-y-auto rounded-xl bg-dark-800/30 p-3">
        {ticket.messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'rounded-xl p-3',
              msg.is_from_admin
                ? 'ml-6 border border-accent-500/20 bg-accent-500/10'
                : 'mr-6 border border-dark-700/30 bg-dark-800/50',
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-xs font-medium',
                  msg.is_from_admin ? 'text-accent-400' : 'text-dark-400',
                )}
              >
                {msg.is_from_admin ? t('admin.tickets.adminLabel') : t('admin.tickets.userLabel')}
              </span>
              <span className="text-xs text-dark-500">{dayTimeLabel(msg.created_at, t)}</span>
            </div>
            {msg.message_text && (
              <p
                className="whitespace-pre-wrap break-words text-sm text-dark-200 [&_a]:text-accent-400 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: linkifyText(msg.message_text) }}
              />
            )}
            <MessageMediaGrid message={msg} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {ticket.status !== 'closed' && (
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={t('admin.tickets.replyPlaceholder')}
            aria-label={t('admin.tickets.replyPlaceholder')}
            rows={2}
            className="input flex-1 resize-none"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={!reply.trim() || busy}
            aria-label={t('admin.tickets.sendReply')}
            className="btn-primary h-11 w-11 shrink-0 self-end p-0"
          >
            {busy ? <Spinner className="h-4 w-4" /> : <SendIcon className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
