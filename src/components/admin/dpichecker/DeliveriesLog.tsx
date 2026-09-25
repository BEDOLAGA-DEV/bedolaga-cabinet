import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi, type WebhookDelivery } from '@/api/dpichecker';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatDate, toneOf } from './historyStyle';

const LIMIT = 25;

function DeliveryRow({ delivery }: { delivery: WebhookDelivery }) {
  const { t } = useTranslation();
  const tone = toneOf(delivery.status);
  const facts = [
    delivery.object_id !== null
      ? t('admin.dpichecker.deliveries.object', { id: delivery.object_id })
      : null,
    delivery.response_code !== null
      ? t('admin.dpichecker.deliveries.response', { code: delivery.response_code })
      : null,
    delivery.attempts > 1
      ? t('admin.dpichecker.deliveries.attempts', { count: delivery.attempts })
      : null,
    formatDate(delivery.delivered_at ?? delivery.created_at),
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-0.5 border-b border-dark-800/60 py-2 last:border-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-sm text-dark-100">
          {/* В имени события точка («check.completed»), а i18next делит ключ по точкам. */}
          {t(`admin.dpichecker.deliveries.events.${delivery.event.replace(/\./g, '_')}`, {
            defaultValue: delivery.event,
          })}
        </span>
        <span className={cn('flex shrink-0 items-center gap-1.5 text-xs font-medium', tone.text)}>
          <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone.dot)} />
          {t(`admin.dpichecker.deliveries.status.${delivery.status}`, {
            defaultValue: delivery.status,
          })}
        </span>
      </div>
      <span className="text-xs tabular-nums text-dark-400">{facts.join(' · ')}</span>
      {delivery.last_error && <span className="text-xs text-error-400">{delivery.last_error}</span>}
    </li>
  );
}

/**
 * Журнал уведомлений DPI//CHECKER боту (вебхуки): дошло ли, что ответил бот. Нужен, когда проверка
 * в кабинете «идёт», а на сайте уже готова. Грузится, только когда блок раскрыт.
 */
export function DeliveriesLog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const log = useQuery({
    queryKey: ['dpichecker', 'deliveries'],
    queryFn: () => dpicheckerApi.webhookDeliveries(LIMIT, 0),
    enabled: open,
  });
  return (
    <details
      className="bento-card p-4 sm:p-5"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none text-base font-semibold text-dark-100">
        {t('admin.dpichecker.deliveries.title')}
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-sm text-dark-300">{t('admin.dpichecker.deliveries.hint')}</p>
        {log.isLoading && <Skeleton className="h-8 w-full" />}
        {log.isError && (
          <p className="text-sm text-error-400">
            {getApiErrorMessage(log.error, t('admin.dpichecker.deliveries.loadFailed'))}
          </p>
        )}
        {log.data?.items.length === 0 && (
          <p className="text-sm text-dark-400">{t('admin.dpichecker.deliveries.empty')}</p>
        )}
        <ul>
          {log.data?.items.map((delivery) => (
            <DeliveryRow key={delivery.id} delivery={delivery} />
          ))}
        </ul>
      </div>
    </details>
  );
}
