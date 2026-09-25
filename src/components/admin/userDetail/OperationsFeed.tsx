import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminUsersApi } from '@/api/adminUsers';
import { stampParts, useInfiniteScroll, useSignedMoney } from '@/components/admin/users';
import { HistoryIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePaymentMethodLabel } from './ActivityRows';
import { Segmented } from '@/components/admin/Segmented';
import { Section } from './sectionParts';

type OperationsFilter = 'all' | 'deposit' | 'withdrawal' | 'subscription_payment';
const FILTERS: OperationsFilter[] = ['all', 'deposit', 'withdrawal', 'subscription_payment'];
const PAGE_SIZE = 25;

export const operationsQueryKey = (userId: number) => ['admin-user-transactions', userId] as const;

/** Операции лентой: фильтр по типу, подгрузка при прокрутке, «показано N из M». */
export function OperationsFeed({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const signed = useSignedMoney();
  const methodLabel = usePaymentMethodLabel();
  const [filter, setFilter] = useState<OperationsFilter>('all');
  const ns = 'admin.users.detail.operations';

  const query = useInfiniteQuery({
    queryKey: [...operationsQueryKey(userId), filter] as const,
    queryFn: ({ pageParam }) =>
      adminUsersApi.getTransactions(userId, {
        offset: pageParam,
        limit: PAGE_SIZE,
        ...(filter === 'all' ? {} : { transaction_type: filter }),
      }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.transactions.length, 0);
      return last.transactions.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });
  const items = query.data?.pages.flatMap((page) => page.transactions) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const sentinel = useInfiniteScroll(() => void query.fetchNextPage(), {
    enabled: Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    rootMargin: '400px 0px',
  });

  return (
    <Section
      className="lg:col-span-2"
      icon={<HistoryIcon className="h-5 w-5" />}
      title={t(`${ns}.title`)}
      action={
        <Segmented
          label={t(`${ns}.title`)}
          value={filter}
          onChange={setFilter}
          options={FILTERS.map((value) => ({ value, label: t(`${ns}.filters.${value}`) }))}
          className="hidden sm:flex"
        />
      }
    >
      <Segmented
        label={t(`${ns}.title`)}
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((value) => ({ value, label: t(`${ns}.filters.${value}`) }))}
        className="sm:hidden"
      />
      {query.isLoading ? (
        <SkeletonGroup className="space-y-2">
          <Skeleton variant="line" count={4} className="h-10" />
        </SkeletonGroup>
      ) : items.length === 0 ? (
        <p className="text-sm text-dark-500">{t('admin.users.detail.balance.noOperations')}</p>
      ) : (
        <>
          <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
            {items.map((tx) => {
              const stamp = stampParts(tx.created_at);
              const detail = [
                tx.payment_method ? methodLabel(tx.payment_method) : null,
                `#${tx.id}`,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <li key={tx.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-11 shrink-0 font-mono text-xs leading-5 tabular-nums text-dark-500">
                    {stamp.day}
                    <span className="block">{stamp.time}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-dark-100">
                      {tx.description ||
                        t(`admin.users.detail.activity.subtypes.${tx.type}`, {
                          defaultValue: '',
                        }) ||
                        t(`${ns}.operation`)}
                    </span>
                    <span className="block truncate text-xs text-dark-500">
                      {detail}
                      {!tx.is_completed && ` · ${t(`${ns}.notCompleted`)}`}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-sm font-semibold tabular-nums',
                      !tx.is_completed
                        ? 'text-dark-500'
                        : tx.amount_kopeks < 0
                          ? 'text-error-400'
                          : 'text-success-400',
                    )}
                  >
                    {signed(tx.amount_kopeks / 100)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div ref={sentinel} aria-hidden="true" className="h-px" />
          {query.isFetchingNextPage && (
            <SkeletonGroup>
              <Skeleton variant="line" className="h-10" />
            </SkeletonGroup>
          )}
          <p className="text-xs tabular-nums text-dark-500">
            {t('admin.users.shown', { shown: items.length, total })}
          </p>
        </>
      )}
    </Section>
  );
}
