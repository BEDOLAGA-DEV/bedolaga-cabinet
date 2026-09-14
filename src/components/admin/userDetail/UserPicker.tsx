import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminUsersApi, type UserListItem } from '@/api/adminUsers';
import { UserAvatar } from '@/components/admin/users';
import { SearchIcon } from '@/components/icons';
import { Spinner } from '@/components/ui/Spinner';
import { classifySearch } from '@/pages/adminUsers/usersListState';

interface UserPickerProps {
  /** Кого не предлагать: самого человека, уже добавленных рефералов. */
  excludeIds: ReadonlySet<number>;
  busy: boolean;
  onPick: (user: UserListItem) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const RESULTS = 8;

/**
 * Найти человека одним полем — те же правила, что у поиска списка (ID, имя,
 * @username, email). Результаты — списком под полем, не всплывающим окном.
 */
export function UserPicker({ excludeIds, busy, onPick, onClose }: UserPickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const results = useQuery({
    queryKey: ['admin-user-picker', query] as const,
    queryFn: () => adminUsersApi.getUsers({ ...classifySearch(query), limit: RESULTS }),
    enabled: query.length >= MIN_QUERY,
  });
  const users = (results.data?.users ?? []).filter((user) => !excludeIds.has(user.id));

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dark-700 bg-dark-800/60 p-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            {t('admin.users.search')}
          </label>
          <input
            id={inputId}
            type="search"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
            }}
            placeholder={t('admin.users.search')}
            className="input py-2 pl-9"
          />
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
        </div>
        <button type="button" onClick={onClose} className="btn-ghost">
          {t('common.cancel')}
        </button>
      </div>
      {query.length >= MIN_QUERY &&
        (results.isFetching && !results.data ? (
          <div className="flex justify-center py-3">
            <Spinner className="h-5 w-5" />
          </div>
        ) : users.length === 0 ? (
          <p className="px-1 py-2 text-sm text-dark-500">
            {t('admin.users.detail.referrals.noUsersFound')}
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {users.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onPick(user)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-dark-700/60 disabled:opacity-50"
                >
                  <UserAvatar firstName={user.first_name} username={user.username} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-dark-100">{user.full_name}</span>
                    <span className="block truncate text-xs tabular-nums text-dark-500">
                      {user.username ? `@${user.username} · ` : ''}
                      {user.telegram_id || `#${user.id}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
