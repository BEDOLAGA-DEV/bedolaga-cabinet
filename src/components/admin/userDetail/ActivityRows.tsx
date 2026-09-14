import { useCallback } from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { UserActivityItem } from '@/api/adminUsers';
import { backTo } from '@/components/admin/AdminBackButton';
import { stampParts, useSignedMoney } from '@/components/admin/users';
import { METHOD_LABELS } from '@/constants/paymentMethods';
import { cn } from '@/lib/utils';
import { describeActivity } from './activityLabels';

interface ActivityRowsProps {
  items: UserActivityItem[];
  /** В «Обзоре» на телефоне — только дата, без времени и подписи. */
  compact?: boolean;
}

/** Способ оплаты словами: «СБП», «Telegram Stars», «с баланса»; незнакомый — ничего. */
export function usePaymentMethodLabel() {
  const { t } = useTranslation();
  return useCallback(
    (method: string) =>
      method === 'balance'
        ? t('admin.users.detail.activity.fromBalance')
        : (METHOD_LABELS[method] ?? null),
    [t],
  );
}

/**
 * Лента событий: слева день и время, по центру что произошло и одна подпись,
 * справа сумма со знаком. Тикет ведёт в переписку.
 */
export function ActivityRows({ items, compact = false }: ActivityRowsProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const signed = useSignedMoney();
  const methodLabel = usePaymentMethodLabel();

  return (
    <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
      {items.map((item, index) => {
        const line = describeActivity(item, t, methodLabel);
        const stamp = stampParts(item.timestamp);
        const body = (
          <>
            <span className="w-11 shrink-0 font-mono text-xs leading-5 tabular-nums text-dark-500">
              {stamp.day}
              <span className={cn('block', compact && 'hidden sm:block')}>{stamp.time}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-dark-100">{line.title}</span>
              {line.detail && (
                <span
                  className={cn(
                    'block truncate text-xs text-dark-500',
                    compact && 'hidden sm:block',
                  )}
                >
                  {line.detail}
                </span>
              )}
            </span>
            {line.amountRubles !== null && (
              <span
                className={cn(
                  'shrink-0 font-mono text-sm font-semibold tabular-nums',
                  line.amountRubles < 0 ? 'text-error-400' : 'text-success-400',
                )}
              >
                {signed(line.amountRubles)}
              </span>
            )}
          </>
        );
        const rowClass = 'flex items-start gap-3 py-2.5';
        return (
          <li key={`${item.type}-${item.timestamp}-${index}`}>
            {line.ticketId !== null ? (
              <Link
                to={`/admin/tickets/${line.ticketId}`}
                state={backTo(location).state}
                className={cn(
                  rowClass,
                  '-mx-2 rounded-lg px-2 transition-colors hover:bg-dark-800/40',
                )}
              >
                {body}
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
