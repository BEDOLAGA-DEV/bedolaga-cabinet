import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { adminUsersApi } from '@/api/adminUsers';
import { campaignsApi } from '@/api/campaigns';
import { promocodesApi } from '@/api/promocodes';
import { tariffsApi } from '@/api/tariffs';
import { AdminBackButton } from '@/components/admin/AdminBackButton';
import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';
import {
  type ToolbarOptions,
  UserCards,
  UsersTable,
  UsersToolbar,
  useInfiniteScroll,
} from '@/components/admin/users';
import { ArrowRightIcon, RefreshIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { safeLocal } from '@/utils/safeStorage';
import {
  type UsersListState,
  buildUsersQuery,
  hasActiveFilters,
  parseUsersListState,
  serializeUsersListState,
} from './adminUsers/usersListState';

/** Порция ленты: сервер отдаёт до 200, 50 хватает на два экрана десктопа. */
export const PAGE_SIZE = 50;
/** Последняя выборка: раздел, открытый из меню без параметров, продолжает с неё. */
const LAST_VIEW_KEY = 'admin-users:last-view';
const OPTIONS_STALE_MS = 5 * 60_000;
const TO_TOP_AFTER_PX = 600;

const number = (value: number, locale: string) => value.toLocaleString(locale);

export default function AdminUsers() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseUsersListState(params), [params]);

  // Чистый вход в раздел продолжает последнюю выборку; адрес с параметрами — главнее.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (params.toString() !== '') return;
    const saved = safeLocal.getItem(LAST_VIEW_KEY);
    if (saved) setParams(new URLSearchParams(saved), { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    safeLocal.setItem(LAST_VIEW_KEY, serializeUsersListState(state).toString());
  }, [state]);

  const update = useCallback(
    (next: UsersListState) => setParams(serializeUsersListState(next), { replace: true }),
    [setParams],
  );

  const query = useMemo(() => buildUsersQuery(state), [state]);
  const usersQuery = useInfiniteQuery({
    queryKey: ['admin-users', query] as const,
    queryFn: ({ pageParam }) =>
      adminUsersApi.getUsers({ ...query, offset: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.users.length, 0);
      return lastPage.users.length > 0 && loaded < lastPage.total ? loaded : undefined;
    },
  });
  const users = useMemo(
    () => usersQuery.data?.pages.flatMap((page) => page.users) ?? [],
    [usersQuery.data],
  );
  const pages = usersQuery.data?.pages ?? [];
  const total = pages.length > 0 ? pages[pages.length - 1].total : 0;

  const statsQuery = useQuery({
    queryKey: ['admin-users-stats'] as const,
    queryFn: () => adminUsersApi.getStats(),
  });

  const tariffsQuery = useQuery({
    queryKey: ['admin-users-filter-tariffs'] as const,
    queryFn: () => tariffsApi.getTariffs(true),
    staleTime: OPTIONS_STALE_MS,
  });
  const groupsQuery = useQuery({
    queryKey: ['admin-users-filter-groups'] as const,
    queryFn: () => promocodesApi.getPromoGroups({ limit: 100 }),
    staleTime: OPTIONS_STALE_MS,
  });
  const campaignsQuery = useQuery({
    queryKey: ['admin-users-filter-campaigns'] as const,
    queryFn: () => campaignsApi.getCampaigns(true, 0, 100),
    staleTime: OPTIONS_STALE_MS,
  });
  const options = useMemo<ToolbarOptions>(
    () => ({
      tariffs: (tariffsQuery.data?.tariffs ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
      groups: (groupsQuery.data?.items ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
      campaigns: (campaignsQuery.data?.campaigns ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    }),
    [tariffsQuery.data, groupsQuery.data, campaignsQuery.data],
  );

  const sentinelRef = useInfiniteScroll(() => usersQuery.fetchNextPage(), {
    enabled: Boolean(usersQuery.hasNextPage) && !usersQuery.isFetchingNextPage,
  });

  const [showToTop, setShowToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowToTop(window.scrollY > TO_TOP_AFTER_PX);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const locale = i18n.language;
  const stats = statsQuery.data;
  const summaryValues = stats && {
    total: number(stats.total_users, locale),
    subscribed: number(stats.users_with_active_subscription, locale),
    newToday: number(stats.new_today, locale),
    blocked: number(stats.blocked_users, locale),
  };

  const refreshing = usersQuery.isFetching && !usersQuery.isFetchingNextPage;

  return (
    <div className="animate-fade-in">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AdminBackButton to="/admin" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-dark-100">{t('admin.users.title')}</h1>
            {summaryValues ? (
              <>
                <p className="hidden text-sm text-dark-400 sm:block">
                  {t('admin.users.summary', summaryValues)}
                </p>
                <p className="text-sm text-dark-400 sm:hidden">
                  {t('admin.users.summaryShort', summaryValues)}
                </p>
              </>
            ) : (
              <p className="text-sm text-dark-400">{t('admin.users.subtitle')}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            usersQuery.refetch();
            statsQuery.refetch();
          }}
          aria-label={t('common.refresh')}
          className="btn-ghost shrink-0 p-2"
        >
          <RefreshIcon className={cn('h-5 w-5', refreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="mb-4">
        <UsersToolbar state={state} onChange={update} options={options} />
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-dark-400">
        <span>
          {usersQuery.isLoading
            ? t('common.loading')
            : t('admin.users.shown', {
                shown: number(users.length, locale),
                total: number(total, locale),
              })}
        </span>
        {usersQuery.hasNextPage && (
          <span className="hidden sm:inline">{t('admin.users.scrollHint')}</span>
        )}
      </div>

      {usersQuery.isLoading ? (
        <ListRowSkeleton count={6} actions={[]} />
      ) : usersQuery.isError ? (
        <div className="rounded-2xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="mb-3 text-error-400">{t('admin.users.loadError')}</p>
          <button type="button" onClick={() => usersQuery.refetch()} className="btn-secondary">
            {t('common.retry')}
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-dark-700/60 bg-dark-900/40 px-6 py-12 text-center">
          <p className="text-dark-400">{t('admin.users.noneFound')}</p>
          {hasActiveFilters(state) && (
            <button
              type="button"
              onClick={() =>
                update({
                  ...state,
                  q: '',
                  status: '',
                  sub: '',
                  tariff: '',
                  group: '',
                  campaign: '',
                  view: 'all',
                })
              }
              className="btn-secondary mt-4"
            >
              {t('admin.users.reset')}
            </button>
          )}
        </div>
      ) : (
        <>
          <UsersTable users={users} className="hidden md:block" />
          <UserCards users={users} className="md:hidden" />
        </>
      )}

      {usersQuery.isFetchingNextPage && (
        <SkeletonGroup className="mt-2">
          <Skeleton variant="card" className="h-16" />
        </SkeletonGroup>
      )}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {!usersQuery.isLoading && !usersQuery.hasNextPage && users.length > 0 && (
        <p className="py-6 text-center text-sm text-dark-500">
          {t('admin.users.endOfList', { total: number(total, locale) })}
        </p>
      )}

      {showToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="btn-secondary fixed bottom-24 right-4 z-20 shadow-lg md:bottom-6 md:right-6"
        >
          <ArrowRightIcon className="h-4 w-4 -rotate-90" />
          {t('admin.users.toTop')}
        </button>
      )}
    </div>
  );
}
