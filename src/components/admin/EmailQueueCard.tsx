import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminEmailQueueApi, type EmailQueueItem } from '../../api/adminEmailQueue';
import { useNativeDialog } from '../../platform/hooks/useNativeDialog';
import { useNotify } from '@/platform';
import { getApiErrorMessage } from '@/utils/api-error';
import { ClockIcon, TrashIcon, WarningIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Состояние очереди писем: сколько ждёт отправки, сколько дошло, сколько потеряно.
 *
 * Очередь была видна только в базе. Когда почтовый сервер не настроен, письма
 * копятся, и владелец узнаёт об этом лишь из сообщений об ошибках.
 */

const MAX_VISIBLE_ITEMS = 8;

function formatMoment(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Служебный текст ошибки людям не нужен — переводим известные причины во фразы. */
function humanReason(
  item: EmailQueueItem,
  t: (key: string, fallback: string) => string,
): string | null {
  if (item.status === 'sent') return null;
  const raw = item.last_error || '';
  if (raw.includes('SMTP'))
    return t('admin.emailQueue.reasonNoSmtp', 'Почтовый сервер не настроен');
  if (raw.includes('срок годности'))
    return t('admin.emailQueue.reasonExpired', 'Содержимое письма устарело');
  if (item.status === 'dead') return t('admin.emailQueue.reasonFailed', 'Отправить не удалось');
  return null;
}

function StatusPill({ item }: { item: EmailQueueItem }) {
  const { t } = useTranslation();
  const styles: Record<EmailQueueItem['status'], string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    sent: 'bg-emerald-500/10 text-emerald-400',
    dead: 'bg-rose-500/10 text-rose-400',
  };
  const labels: Record<EmailQueueItem['status'], string> = {
    pending: t('admin.emailQueue.statusPending', 'Ждёт повтора'),
    sent: t('admin.emailQueue.statusSent', 'Доставлено повтором'),
    dead: t('admin.emailQueue.statusDead', 'Не доставлено'),
  };
  return (
    <span
      className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${styles[item.status]}`}
    >
      {labels[item.status]}
    </span>
  );
}

export function EmailQueueCard() {
  const { t, i18n } = useTranslation();
  const notify = useNotify();
  const dialog = useNativeDialog();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'email-queue'],
    queryFn: adminEmailQueueApi.getQueue,
    refetchInterval: 60_000,
  });

  const clearMutation = useMutation({
    mutationFn: (pendingOnly: boolean) => adminEmailQueueApi.clearQueue(pendingOnly),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-queue'] });
      notify.success(
        t('admin.emailQueue.cleared', 'Очередь очищена: {{count}}', { count: result.removed }),
      );
    },
    onError: (error) => notify.error(getApiErrorMessage(error, t('common.error'))),
  });

  // Карточку не прячем ни при загрузке, ни при пустой очереди, ни при ошибке:
  // её ищут глазами в разделе писем, и «ничего нет» неотличимо от «раздела нет».
  if (isLoading) {
    return (
      <div className="rounded-xl border border-dark-700 bg-dark-800 p-3 sm:p-4">
        <Skeleton className="h-5 w-40" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-dark-700 bg-dark-800 p-3 text-xs text-dark-400 sm:p-4">
        {t(
          'admin.emailQueue.unavailable',
          'Состояние очереди писем недоступно. Возможно, бот ещё не обновлён.',
        )}
      </div>
    );
  }

  const total = data.pending + data.sent + data.dead;

  const handleClear = async (pendingOnly: boolean) => {
    const message = pendingOnly
      ? t('admin.emailQueue.confirmPending', 'Убрать письма, ожидающие отправки?')
      : t('admin.emailQueue.confirmAll', 'Очистить очередь целиком, вместе с историей?');
    if (await dialog.confirm(message)) {
      clearMutation.mutate(pendingOnly);
    }
  };

  const visible = data.items.slice(0, MAX_VISIBLE_ITEMS);

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800 p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <ClockIcon className="h-5 w-5 flex-shrink-0 text-dark-400" />
        <h2 className="text-sm font-semibold text-dark-100">
          {t('admin.emailQueue.title', 'Очередь писем')}
        </h2>
      </div>

      {/* Числа плитками: длинная строка «ждут повтора: 0 · доставлены…» рвалась
          посреди фразы на телефоне и читалась плохо. */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(
          [
            [data.pending, t('admin.emailQueue.captionPending', 'в ожидании')],
            [data.sent, t('admin.emailQueue.captionSent', 'доставлены')],
            [data.dead, t('admin.emailQueue.captionDead', 'не дошли')],
          ] as const
        ).map(([value, caption]) => (
          <div key={caption} className="rounded-lg bg-dark-900/50 px-2 py-1.5 text-center">
            <p className="text-base font-semibold tabular-nums text-dark-100">{value}</p>
            <p className="text-[10px] leading-tight text-dark-400">{caption}</p>
          </div>
        ))}
      </div>

      <p className="mt-2 text-[11px] leading-snug text-dark-500">
        {t('admin.emailQueue.hint', 'Только письма, не ушедшие с первого раза')}
      </p>

      {total > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.pending > 0 && (
            <button
              type="button"
              onClick={() => handleClear(true)}
              disabled={clearMutation.isPending}
              className="flex-1 rounded-lg border border-dark-700 px-2 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
            >
              {t('admin.emailQueue.clearPending', 'Убрать ожидающие')}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleClear(false)}
            disabled={clearMutation.isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-dark-700 px-2 py-1.5 text-xs text-dark-300 transition-colors hover:bg-dark-700 disabled:opacity-50"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            {t('admin.emailQueue.clearAll', 'Очистить')}
          </button>
        </div>
      )}

      {!data.smtp_configured && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2.5">
          <WarningIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200">
            {t(
              'admin.emailQueue.noSmtp',
              'Почтовый сервер не настроен, письма не отправляются. Адрес сервера задаётся в настройках, раздел SMTP.',
            )}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {visible.map((item) => {
            const reason = humanReason(item, t);
            return (
              <li key={item.id} className="rounded-lg bg-dark-900/50 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-dark-200">{item.to_email}</p>
                  <StatusPill item={item} />
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
                  <p className="truncate text-dark-400">
                    {item.subject}
                    {reason ? ` · ${reason}` : ''}
                  </p>
                  <span className="flex-shrink-0 text-dark-500">
                    {formatMoment(item.sent_at || item.created_at, i18n.language || 'ru')}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {data.items.length > MAX_VISIBLE_ITEMS && (
        <p className="mt-2 text-[11px] text-dark-500">
          {t('admin.emailQueue.more', 'И ещё {{count}}', {
            count: data.items.length - MAX_VISIBLE_ITEMS,
          })}
        </p>
      )}
    </div>
  );
}
