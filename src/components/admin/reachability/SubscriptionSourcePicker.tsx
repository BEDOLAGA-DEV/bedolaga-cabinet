import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { adminUsersApi } from '@/api/adminUsers';
import type { ReferenceStatus } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { REACHABILITY_SETTINGS_PATH } from './deepLink';
import { useDebouncedValue } from './useDebouncedValue';

interface SubscriptionSourcePickerProps {
  userId: number | null;
  shortUuid: string | null;
  onSource: (next: { userId: number | null; shortUuid: string | null }) => void;
  /** Подписка по умолчанию из настроек бота; null — статус ещё не пришёл. */
  reference: ReferenceStatus | null;
}

const SEARCH_LIMIT = 8;
const DEBOUNCE_MS = 300;

type SourceKind = 'reference' | 'user' | 'sub';

const CHIP =
  'flex min-h-[36px] items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors';
const CHIP_ON = 'border-accent-500/50 bg-accent-500/10 text-dark-50';
const CHIP_OFF = 'border-dark-700/50 bg-dark-900/30 text-dark-200 hover:border-dark-500';

/**
 * Откуда брать конфиги: подписка по умолчанию из настроек (число конфигов и её имя) — на
 * телефоне в две строки во всю ширину, на десктопе одной строкой; рядом поиск пользователя,
 * чтобы подставить его подписку. Без подписки по умолчанию объясняем, что делать, вместо
 * пустого списка целей.
 */
export function SubscriptionSourcePicker({
  userId,
  shortUuid,
  onSource,
  reference,
}: SubscriptionSourcePickerProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.subscription';
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search.trim(), DEBOUNCE_MS);
  const users = useQuery({
    queryKey: ['admin-reachability-user-search', query],
    queryFn: () => adminUsersApi.getUsers({ search: query, limit: SEARCH_LIMIT }),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });

  const hasReference = Boolean(reference?.short_uuid);
  const current: SourceKind = userId !== null ? 'user' : shortUuid !== null ? 'sub' : 'reference';
  const referenceMissing = reference !== null && !hasReference && current === 'reference';
  const referenceBroken = hasReference && current === 'reference' && reference?.error;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {hasReference && reference && (
          <button
            type="button"
            aria-pressed={current === 'reference'}
            onClick={() => onSource({ userId: null, shortUuid: null })}
            className={cn(
              CHIP,
              'w-full py-1.5 text-left sm:w-auto',
              current === 'reference' ? CHIP_ON : CHIP_OFF,
            )}
          >
            <span aria-hidden="true" className="text-accent-400">
              ◈
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-x-2 sm:flex-row sm:items-center">
              <span className="whitespace-nowrap">
                {t(`${base}.reference`)}
                <span className="text-xs font-normal text-dark-400">
                  {' '}
                  · {t(`${base}.configs`, { count: reference.configs })}
                </span>
              </span>
              <span className="truncate font-mono text-xs font-normal text-dark-400">
                {reference.short_uuid}
              </span>
            </span>
          </button>
        )}
        {userId !== null && (
          <span className={cn(CHIP, CHIP_ON)}>{t(`${base}.userLabel`, { id: userId })}</span>
        )}
        {shortUuid !== null && userId === null && (
          <span className={cn(CHIP, CHIP_ON, 'font-mono text-xs')}>{shortUuid}</span>
        )}
        <div className="relative w-full sm:ms-auto sm:w-64">
          <input
            id="reachability-user-search"
            type="search"
            value={search}
            aria-label={t(`${base}.pickUser`)}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t(`${base}.userSearchPlaceholder`)}
            className="input min-h-[36px] w-full py-1.5 text-sm"
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
      {referenceMissing && (
        <div
          role="status"
          className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-dark-100"
        >
          <p className="font-medium">{t(`${base}.noReference`)}</p>
          <p className="mt-1 text-xs text-dark-300">{t(`${base}.noReferenceHint`)}</p>
          <Link
            to={REACHABILITY_SETTINGS_PATH}
            className="mt-2 inline-block text-xs text-accent-400 hover:underline"
          >
            {t('admin.reachability.status.openSettings')}
          </Link>
        </div>
      )}
      {referenceBroken && <p className="text-xs text-warning-400">{reference?.error}</p>}
    </div>
  );
}
