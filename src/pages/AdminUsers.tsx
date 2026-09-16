import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
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
import { ArrowRightIcon, RefreshIcon, UsersIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
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
/** Как часто список перечитывает отметки «в сети» панели (окно панели — минута). */
const ONLINE_REFRESH_MS = 30_000;
/** Последняя выборка: раздел, открытый из меню без параметров, продолжает с неё. */
const LAST_VIEW_KEY = 'admin-users:last-view';
const OPTIONS_STALE_MS = 5 * 60_000;
const TO_TOP_AFTER_PX = 600;

const number = (value: number, locale: string) => value.toLocaleString(locale);

type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * «1 873 человека · 944 с активной подпиской · 14 новых сегодня · 61 заблокирован».
 * Каждая часть со своим склонением; нулевые «новых» и «заблокированных» не показываются.
 */
function summaryLine(
  stats: { total: number; subscribed: number; newToday: number; blocked: number },
  locale: string,
  t: Translate,
  short: boolean,
): string {
  const ns = short ? 'admin.users.summaryShort' : 'admin.users.summary';
  const part = (key: string, count: number) =>
    t(`${ns}.${key}`, { count, value: number(count, locale) });
  return [
    part('total', stats.total),
    part('subscribed', stats.subscribed),
    // На телефоне строка короче: рядом с иконкой раздела и кнопками ей тесно.
    !short && stats.newToday > 0 ? part('newToday', stats.newToday) : null,
    !short && stats.blocked > 0 ? part('blocked', stats.blocked) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

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
    // Отметки подключения живут минуту: без обновления открытый список к концу
    // минуты погасил бы все точки и больше их не зажёг. Обновляется только
    // видимая вкладка — фоновая ничего не опрашивает.
    refetchInterval: ONLINE_REFRESH_MS,
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
  const summaryStats = stats && {
    total: stats.total_users,
    subscribed: stats.users_with_active_subscription,
    newToday: stats.new_today,
    blocked: stats.blocked_users,
  };
  const { mobileCss } = useHeaderHeight();

  const refreshing = usersQuery.isFetching && !usersQuery.isFetchingNextPage;

  return (
    <div
      className="animate-fade-in [--sticky-top:var(--mobile-header)] lg:[--sticky-top:3.5rem]"
      style={{ '--mobile-header': mobileCss } as CSSProperties}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AdminBackButton to="/admin" />
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400"
          >
            <UsersIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-dark-100">{t('admin.users.title')}</h1>
            {summaryStats ? (
              <>
                <p className="hidden text-sm tabular-nums text-dark-400 sm:block">
                  {summaryLine(summaryStats, locale, t, false)}
                </p>
                <p className="text-sm tabular-nums text-dark-400 sm:hidden">
                  {summaryLine(summaryStats, locale, t, true)}
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
          title={t('common.refresh')}
          disabled={refreshing}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 text-dark-300 transition-colors hover:border-dark-600 hover:text-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 disabled:cursor-wait"
        >
          <RefreshIcon className={cn('h-5 w-5', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* На телефоне поиск и чипы прилипают под шапкой: фильтр меняют, не листая наверх. */}
      <div className="sticky top-[var(--sticky-top)] z-20 -mx-4 mb-3 border-b border-dark-800/70 bg-dark-950 px-4 pb-2.5 pt-2 md:static md:mx-0 md:mb-4 md:border-0 md:bg-transparent md:p-0">
        <UsersToolbar state={state} onChange={update} options={options} />
      </div>

      <p className="mb-3 text-sm tabular-nums text-dark-400">
        {usersQuery.isLoading
          ? t('common.loading')
          : t('admin.users.shown', {
              shown: number(users.length, locale),
              total: number(total, locale),
            })}
      </p>

      {usersQuery.isLoading ? (
        <ListRowSkeleton count={6} actions={[]} />
      ) : usersQuery.isError ? (
        <div className="rounded-2xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="mb-3 text-error-400">
            {state.view === 'online' &&
            isAxiosError(usersQuery.error) &&
            usersQuery.error.response?.status === 503
              ? t('admin.users.onlineUnavailable')
              : t('admin.users.loadError')}
          </p>
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
          {t('admin.users.endOfList', { count: users.length, total: number(users.length, locale) })}
        </p>
      )}

      {showToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          // Прижата к низу по общему правилу кабинета (--mobile-nav-clearance), а не
          // на глазок: иначе висела посреди списка и читалась как часть карточки.
          style={{ bottom: 'var(--mobile-nav-clearance)' }}
          className="btn-primary fixed right-4 z-20 md:right-6"
        >
          <ArrowRightIcon className="h-4 w-4 -rotate-90" />
          {t('admin.users.toTop')}
        </button>
      )}
    </div>
  );
}
