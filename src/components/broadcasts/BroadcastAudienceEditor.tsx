import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminBroadcastsApi,
  type BroadcastAudience,
  type BroadcastAudienceCondition,
  type BroadcastFilter,
  type TariffFilter,
} from '../../api/adminBroadcasts';

type Channel = 'telegram' | 'email';
type Category = 'system' | 'news' | 'promo';
type Filter = BroadcastFilter | TariffFilter;

const GROUP_LABELS: Record<string, string> = {
  basic: 'admin.broadcasts.filterGroups.basic',
  subscription: 'admin.broadcasts.filterGroups.subscription',
  traffic: 'admin.broadcasts.filterGroups.traffic',
  registration: 'admin.broadcasts.filterGroups.registration',
  activity: 'admin.broadcasts.filterGroups.activity',
  source: 'admin.broadcasts.filterGroups.source',
  tariff: 'admin.broadcasts.filterGroups.tariff',
  auth_type: 'admin.broadcasts.audience.authType',
};

export const emptyAudience = (): BroadcastAudience => ({
  conditions: [{ field: '', operator: 'eq', value: '', join: null }],
});

export const isAudienceComplete = (audience: BroadcastAudience): boolean =>
  audience.conditions.length > 0 &&
  audience.conditions.every((condition) => condition.field !== '' && condition.value !== '');

interface Props {
  channel: Channel;
  category: Category;
  audience: BroadcastAudience;
  onChange: (audience: BroadcastAudience) => void;
  filters: Filter[];
  isLoading: boolean;
}

export function BroadcastAudienceEditor({
  channel,
  category,
  audience,
  onChange,
  filters,
  isLoading,
}: Props) {
  const { t } = useTranslation();
  const [showUsers, setShowUsers] = useState(false);
  const [offset, setOffset] = useState(0);
  const pageSize = 50;

  const groups = useMemo(() => {
    const result: Record<string, Filter[]> = {};
    for (const filter of filters) {
      const group = 'tariff_id' in filter ? 'tariff' : filter.group || 'basic';
      if (!result[group]) result[group] = [];
      result[group].push(filter);
    }
    return result;
  }, [filters]);

  const valid = isAudienceComplete(audience);
  const preview = useQuery({
    queryKey: ['admin', 'broadcasts', 'audience', channel, category, audience, offset],
    queryFn: () =>
      adminBroadcastsApi.previewAudience({ channel, category, audience, offset, limit: pageSize }),
    enabled: valid && !isLoading,
  });

  const changeCondition = (index: number, update: Partial<BroadcastAudienceCondition>) => {
    setOffset(0);
    onChange({
      conditions: audience.conditions.map((condition, position) =>
        position === index ? { ...condition, ...update } : condition,
      ),
    });
  };

  const removeCondition = (index: number) => {
    setOffset(0);
    const conditions = audience.conditions.filter((_, position) => position !== index);
    onChange({
      conditions: conditions.map((condition, position) =>
        position === 0 ? { ...condition, join: null } : condition,
      ),
    });
  };

  const addCondition = () => {
    setOffset(0);
    onChange({
      conditions: [...audience.conditions, { field: '', operator: 'eq', value: '', join: 'and' }],
    });
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-dark-300">
        {t('admin.broadcasts.selectFilter', 'Выберите аудиторию')}
      </h3>
      <div className="space-y-3">
        {audience.conditions.map((condition, index) => (
          <div key={index}>
            {index > 0 && (
              <select
                aria-label={t('admin.broadcasts.audience.join', 'Связь условий')}
                value={condition.join || 'and'}
                onChange={(event) =>
                  changeCondition(index, { join: event.target.value as 'and' | 'or' })
                }
                className="input mb-2 w-24"
              >
                <option value="and">{t('admin.broadcasts.audience.and', 'И')}</option>
                <option value="or">{t('admin.broadcasts.audience.or', 'ИЛИ')}</option>
              </select>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,1fr)_auto]">
              <select
                aria-label={t('admin.broadcasts.audience.field', 'Условие фильтрации')}
                value={condition.field}
                onChange={(event) =>
                  changeCondition(index, { field: event.target.value, value: '' })
                }
                className="input min-w-0"
              >
                <option value="">
                  {t('admin.broadcasts.audience.field', 'Условие фильтрации')}
                </option>
                {Object.keys(groups).map((group) => (
                  <option key={group} value={group}>
                    {GROUP_LABELS[group] ? t(GROUP_LABELS[group], group) : group}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('admin.broadcasts.audience.comparison', 'Оператор сравнения')}
                value={condition.operator}
                onChange={(event) =>
                  changeCondition(index, { operator: event.target.value as 'eq' | 'ne' })
                }
                className="input min-w-0"
              >
                <option value="eq">{t('admin.broadcasts.audience.equals', 'Равно')}</option>
                <option value="ne">{t('admin.broadcasts.audience.notEquals', 'Не равно')}</option>
              </select>
              <select
                aria-label={t('admin.broadcasts.audience.value', 'Значение')}
                value={condition.value}
                onChange={(event) => changeCondition(index, { value: event.target.value })}
                disabled={!condition.field}
                className="input min-w-0"
              >
                <option value="">{t('admin.broadcasts.audience.value', 'Значение')}</option>
                {(groups[condition.field] || []).map((filter) => (
                  <option key={filter.key} value={filter.key}>
                    {filter.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeCondition(index)}
                disabled={audience.conditions.length === 1}
                aria-label={t('admin.broadcasts.audience.remove', 'Удалить условие')}
                className="rounded-lg border border-dark-700 px-3 text-dark-300 hover:border-dark-500 disabled:opacity-40"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addCondition} className="mt-3 text-sm text-accent-400">
        + {t('admin.broadcasts.audience.add', 'Добавить условие')}
      </button>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-dark-300">
        {valid && preview.isPending && <span>{t('common.loading', 'Загрузка...')}</span>}
        {valid && preview.isError && (
          <span className="text-error-400">
            {t('admin.broadcasts.audience.loadError', 'Не удалось загрузить получателей')}
          </span>
        )}
        {preview.data && (
          <>
            <span>
              {t('admin.broadcasts.audience.recipientCount', 'Получателей')}:{' '}
              <strong className="text-accent-400">{preview.data.count}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setOffset(0);
                setShowUsers(true);
                void preview.refetch();
              }}
              className="text-accent-400 hover:underline"
            >
              {t('admin.broadcasts.audience.showUsers', 'Посмотреть список')}
            </button>
          </>
        )}
      </div>

      {showUsers && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-xl rounded-xl border border-dark-700 bg-dark-900 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.broadcasts.audience.users', 'Получатели рассылки')}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-dark-100">
                {t('admin.broadcasts.audience.users', 'Получатели рассылки')}
                {preview.data && ` (${preview.data.count})`}
              </h3>
              <button
                type="button"
                onClick={() => setShowUsers(false)}
                className="text-xl text-dark-300"
                aria-label={t('common.close', 'Закрыть')}
              >
                ×
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {preview.isPending && <p>{t('common.loading', 'Загрузка...')}</p>}
              {preview.isError && (
                <p className="text-error-400">
                  {t('admin.broadcasts.audience.loadError', 'Не удалось загрузить получателей')}
                </p>
              )}
              {preview.data?.users.length === 0 && (
                <p className="text-dark-400">
                  {t('admin.broadcasts.audience.empty', 'Получателей нет')}
                </p>
              )}
              {preview.data?.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 border-b border-dark-800 py-2 text-sm"
                >
                  <span className="min-w-0 truncate text-dark-100">
                    {user.username ||
                      [user.first_name, user.last_name].filter(Boolean).join(' ') ||
                      `#${user.id}`}
                  </span>
                  <span className="min-w-0 truncate text-dark-400">
                    {channel === 'telegram' ? user.telegram_id : user.email}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - pageSize))}
                className="btn-secondary disabled:opacity-40"
              >
                {t('admin.broadcasts.prev', 'Назад')}
              </button>
              <span className="text-sm text-dark-400">
                {preview.data && preview.data.count > 0
                  ? `${offset + 1}–${Math.min(offset + pageSize, preview.data.count)} / ${preview.data.count}`
                  : '0'}
              </span>
              <button
                type="button"
                disabled={!preview.data || offset + pageSize >= preview.data.count}
                onClick={() => setOffset(offset + pageSize)}
                className="btn-secondary disabled:opacity-40"
              >
                {t('admin.broadcasts.next', 'Далее')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
