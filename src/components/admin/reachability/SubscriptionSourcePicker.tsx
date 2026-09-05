import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { adminUsersApi } from '@/api/adminUsers';
import type { ReferenceStatus } from '@/api/reachability';
import { ChoiceChips } from './ChoiceChips';
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

/**
 * Откуда брать конфиги: подписка по умолчанию (из настроек) или подписка пользователя.
 * Без подписки по умолчанию объясняем, что делать, вместо пустого списка целей.
 */
export function SubscriptionSourcePicker({
  userId,
  shortUuid,
  onSource,
  reference,
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

  const hasReference = Boolean(reference?.short_uuid);
  const current: SourceKind = userId !== null ? 'user' : shortUuid !== null ? 'sub' : 'reference';
  const options = [
    ...(hasReference
      ? [{ value: 'reference' as const, label: t('admin.reachability.subscription.reference') }]
      : []),
    ...(userId !== null
      ? [
          {
            value: 'user' as const,
            label: t('admin.reachability.subscription.userLabel', { id: userId }),
          },
        ]
      : []),
    ...(shortUuid !== null && userId === null ? [{ value: 'sub' as const, label: shortUuid }] : []),
  ];
  const referenceMissing = reference !== null && !hasReference && current === 'reference';
  const referenceBroken = hasReference && current === 'reference' && reference?.error;

  return (
    <div className="space-y-3">
      {options.length > 0 && (
        <ChoiceChips
          value={current}
          options={options}
          label={t('admin.reachability.subscription.source')}
          showLabel
          onChange={(value) => {
            if (value === 'reference') onSource({ userId: null, shortUuid: null });
          }}
        />
      )}
      {referenceMissing && (
        <div
          role="status"
          className="rounded-xl border border-warning-500/30 bg-warning-500/10 p-3 text-sm text-dark-100"
        >
          <p className="font-medium">{t('admin.reachability.subscription.noReference')}</p>
          <p className="mt-1 text-xs text-dark-300">
            {t('admin.reachability.subscription.noReferenceHint')}
          </p>
          <Link
            to="/admin/settings"
            className="mt-2 inline-block text-xs text-accent-400 hover:underline"
          >
            {t('admin.reachability.status.openSettings')}
          </Link>
        </div>
      )}
      {referenceBroken && <p className="text-xs text-warning-400">{reference?.error}</p>}
      <div className="relative sm:max-w-md">
        <label
          htmlFor="reachability-user-search"
          className="block text-sm font-medium text-dark-200"
        >
          {t('admin.reachability.subscription.pickUser')}
        </label>
        <input
          id="reachability-user-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.reachability.subscription.userSearchPlaceholder')}
          className="input mt-1.5 w-full"
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
