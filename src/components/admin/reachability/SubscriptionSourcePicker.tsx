import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminUsersApi } from '@/api/adminUsers';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from './useDebouncedValue';

interface SubscriptionSourcePickerProps {
  userId: number | null;
  shortUuid: string | null;
  onSource: (next: { userId: number | null; shortUuid: string | null }) => void;
}

const SEARCH_LIMIT = 8;
const DEBOUNCE_MS = 300;

/** Откуда брать конфиги: эталонная подписка панели или подписка конкретного пользователя. */
export function SubscriptionSourcePicker({
  userId,
  shortUuid,
  onSource,
}: SubscriptionSourcePickerProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), DEBOUNCE_MS);
  const users = useQuery({
    queryKey: ['admin-reachability-user-search', query],
    queryFn: () => adminUsersApi.getUsers({ search: query, limit: SEARCH_LIMIT }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
  const isReference = userId === null && shortUuid === null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={isReference}
        onClick={() => onSource({ userId: null, shortUuid: null })}
        className={cn(
          'rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
          isReference
            ? 'bg-accent-500 text-on-accent'
            : 'bg-dark-700 text-dark-300 hover:text-dark-100',
        )}
      >
        {t('admin.reachability.subscription.reference')}
      </button>
      {userId !== null && (
        <span className="rounded-xl bg-accent-500 px-3 py-1.5 text-xs font-medium text-on-accent">
          {t('admin.reachability.subscription.pickUser')}: #{userId}
        </span>
      )}
      {shortUuid !== null && userId === null && (
        <span className="rounded-xl bg-accent-500 px-3 py-1.5 font-mono text-xs text-on-accent">
          {shortUuid}
        </span>
      )}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.reachability.subscription.userSearchPlaceholder')}
          aria-label={t('admin.reachability.subscription.pickUser')}
          className="input w-full sm:w-64"
        />
        {query.length >= 2 && (users.data?.users.length ?? 0) > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-dark-700/60 bg-dark-900 shadow-linear">
            {users.data?.users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSource({ userId: user.id, shortUuid: null });
                    setSearch('');
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-dark-100 hover:bg-dark-800"
                >
                  <span className="truncate">
                    {user.full_name || user.username || `#${user.id}`}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-dark-400">#{user.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
