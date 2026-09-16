import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminUsersApi } from '@/api/adminUsers';
import { useInfiniteScroll } from '@/components/admin/users';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { ActivityRows } from './ActivityRows';

const PAGE_SIZE = 25;

interface ActivityTabProps {
  userId: number;
  /** CSV типов для ручки активности; null — все. */
  types: string | null;
}

/**
 * Лента событий человека в боте и кабинете: подгружается при прокрутке,
 * «показано N из M» внизу. Фильтр — ряд сегментов в `ActivityHub`.
 */
export function ActivityTab({ userId, types }: ActivityTabProps) {
  const { t } = useTranslation();
  const query = useInfiniteQuery({
    queryKey: ['admin-user-activity', userId, types] as const,
    queryFn: ({ pageParam }) =>
      adminUsersApi.getUserActivity(userId, pageParam, PAGE_SIZE, types ?? undefined),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return last.items.length > 0 && loaded < last.total ? loaded : undefined;
    },
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const sentinel = useInfiniteScroll(() => void query.fetchNextPage(), {
    enabled: Boolean(query.hasNextPage) && !query.isFetchingNextPage,
    rootMargin: '400px 0px',
  });

  if (query.isLoading) {
    return (
      <SkeletonGroup className="space-y-2">
        <Skeleton variant="line" count={5} className="h-10" />
      </SkeletonGroup>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-error-400">{t('admin.users.detail.activity.loadError')}</p>
        <button type="button" onClick={() => void query.refetch()} className="btn-secondary">
          {t('common.retry')}
        </button>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-dark-500">{t('admin.users.detail.activity.empty')}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ActivityRows items={items} />
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {query.isFetchingNextPage && (
        <SkeletonGroup>
          <Skeleton variant="line" className="h-10" />
        </SkeletonGroup>
      )}
      <p className="text-xs tabular-nums text-dark-500">
        {t('admin.users.shown', { shown: items.length, total })}
      </p>
    </div>
  );
}
