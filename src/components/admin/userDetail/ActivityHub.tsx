import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminUsersApi } from '@/api/adminUsers';
import { cn } from '@/lib/utils';
import { ActivityTab } from './ActivityTab';
import { GiftsTab } from './GiftsTab';
import { TicketsTab } from './TicketsTab';

export type ActivityView = 'timeline' | 'tickets' | 'gifts';
export const ACTIVITY_VIEWS: readonly ActivityView[] = ['timeline', 'tickets', 'gifts'];

interface ActivityHubProps {
  userId: number;
  view: ActivityView;
  onViewChange: (view: ActivityView) => void;
  formatDate: (date: string | null) => string;
  locale: string;
  onNavigateToUser: (userId: number) => void;
}

/**
 * Вкладка «Активность»: лента событий, обращения и подарки под одной крышей.
 * Раньше это были три вкладки верхнего уровня из восьми.
 */
export function ActivityHub({
  userId,
  view,
  onViewChange,
  formatDate,
  locale,
  onNavigateToUser,
}: ActivityHubProps) {
  const { t } = useTranslation();
  const giftsQuery = useQuery({
    queryKey: ['admin-user-gifts', userId] as const,
    queryFn: () => adminUsersApi.getUserGifts(userId),
    enabled: view === 'gifts',
  });

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t('admin.users.detail.tabs.activity')}
      >
        {ACTIVITY_VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={view === item}
            onClick={() => onViewChange(item)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              view === item
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 hover:text-dark-200',
            )}
          >
            {t(`admin.users.detail.activity.views.${item}`)}
          </button>
        ))}
      </div>
      {view === 'timeline' && <ActivityTab userId={userId} formatDate={formatDate} />}
      {view === 'tickets' && <TicketsTab userId={userId} formatDate={formatDate} />}
      {view === 'gifts' && (
        <GiftsTab
          giftsLoading={giftsQuery.isFetching && !giftsQuery.data}
          giftsData={giftsQuery.data ?? null}
          locale={locale}
          onNavigateToUser={onNavigateToUser}
        />
      )}
    </div>
  );
}
