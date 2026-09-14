import { type ReactNode, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { adminUsersApi, type UserListItem } from '@/api/adminUsers';
import { UserAvatar } from '@/components/admin/users';
import { SearchIcon } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { classifySearch } from '@/pages/adminUsers/usersListState';

interface UserPickerProps {
  /** Надпись на кнопке: «Назначить», «Добавить». */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Кого не предлагать: самого человека, уже добавленных рефералов. */
  excludeIds: ReadonlySet<number>;
  busy: boolean;
  /** true — выбор удался, окно закрывается. */
  onPick: (user: UserListItem) => Promise<boolean>;
  align?: 'start' | 'end';
}

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
const RESULTS = 8;

/**
 * Найти человека одним полем — те же правила, что у поиска списка (ID, имя,
 * @username, email). Окно у самой кнопки: нажал «Назначить» — поиск тут же, выбрал —
 * закрылось. Раньше это была рамка во всю ширину с «Отмена», и форм висело по две.
 */
export function UserPicker({
  trigger,
  triggerClassName,
  excludeIds,
  busy,
  onPick,
  align = 'start',
}: UserPickerProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const results = useQuery({
    queryKey: ['admin-user-picker', query] as const,
    queryFn: () => adminUsersApi.getUsers({ ...classifySearch(query), limit: RESULTS }),
    enabled: open && query.length >= MIN_QUERY,
  });
  const users = (results.data?.users ?? []).filter((user) => !excludeIds.has(user.id));

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setText('');
      setQuery('');
    }
  };

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger className={cn('btn-secondary min-h-0 px-2.5 py-1 text-xs', triggerClassName)}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={6}
        collisionPadding={16}
        className="w-[min(22rem,calc(100vw-2rem))] bg-dark-900 p-2 backdrop-blur-none"
      >
        <div className="relative">
          <label htmlFor={inputId} className="sr-only">
            {t('admin.users.search')}
          </label>
          <input
            id={inputId}
            type="search"
            autoFocus
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('admin.users.search')}
            className="input py-2 pl-9"
          />
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
        </div>
        {query.length >= MIN_QUERY &&
          (results.isFetching && !results.data ? (
            <div className="flex justify-center py-3">
              <Spinner className="h-5 w-5" />
            </div>
          ) : users.length === 0 ? (
            <p className="px-2 pb-1 pt-3 text-sm text-dark-500">
              {t('admin.users.detail.referrals.noUsersFound')}
            </p>
          ) : (
            <ul className="m-0 mt-1.5 flex max-h-72 list-none flex-col gap-0.5 overflow-y-auto p-0">
              {users.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      if (await onPick(user)) changeOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-dark-800 focus-visible:bg-dark-800 focus-visible:outline-none disabled:opacity-50"
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
      </PopoverContent>
    </Popover>
  );
}
