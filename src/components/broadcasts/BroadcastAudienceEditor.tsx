import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import {
  adminBroadcastsApi,
  type BroadcastAudience,
  type BroadcastAudienceCondition,
  type BroadcastFilter,
  type TariffFilter,
} from '../../api/adminBroadcasts';
import { DateField } from '../DateField';

type Channel = 'telegram' | 'email';
type Category = 'system' | 'news' | 'promo';
type Filter = BroadcastFilter | TariffFilter;

type UserField = 'telegram_id' | 'telegram_username' | 'email_user';
type FieldKind = 'select' | 'fixed' | 'number' | 'date' | 'user';
interface FieldChoice {
  field: string;
  label: string;
  kind: FieldKind;
  values?: { value: string; label: string }[];
}

const DATE_FIELDS = new Set(['registration_date', 'activity_date', 'subscription_end_date']);
const NUMBER_FIELDS = new Set(['traffic_gt', 'traffic_lt']);
let nextRowId = 0;
const rowId = () => String(++nextRowId);

export const emptyAudience = (): BroadcastAudience => ({
  conditions: [{ client_id: rowId(), field: '', operator: 'eq', value: '', join: null }],
});

export const isAudienceComplete = (audience: BroadcastAudience): boolean =>
  audience.conditions.length > 0 &&
  audience.conditions.every((condition) => {
    if (!condition.field || !condition.value) return false;
    if (DATE_FIELDS.has(condition.field)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(condition.value)) return false;
      return (
        condition.operator !== 'between' ||
        (!!condition.value_to && condition.value_to >= condition.value)
      );
    }
    if (NUMBER_FIELDS.has(condition.field)) {
      const value = Number(condition.value);
      return Number.isFinite(value) && value >= 0 && value <= 1_000_000;
    }
    return true;
  });

function UserLookup({
  field,
  condition,
  onSelect,
  rowIndex,
}: {
  field: UserField;
  condition: BroadcastAudienceCondition;
  onSelect: (value: string, label: string | null) => void;
  rowIndex: number;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(condition.label || '');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(text.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [text]);
  const searchReady = query === text.trim();
  const results = useQuery({
    queryKey: ['admin', 'broadcasts', 'audience-users', field, query, offset],
    queryFn: () => adminBroadcastsApi.searchAudienceUsers({ field, q: query, offset }),
    enabled: open && !condition.value && query.length > 0 && searchReady,
  });
  const users = searchReady ? results.data?.users || [] : [];
  const describe = (user: (typeof users)[number]) =>
    [
      user.username ? `@${user.username.replace(/^@/, '')}` : null,
      user.telegram_id ? String(user.telegram_id) : null,
      user.email,
      [user.first_name, user.last_name].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 512) || `#${user.id}`;
  return (
    <div
      className="relative min-w-0"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        type="text"
        className="input w-full min-w-0"
        role="combobox"
        aria-label={
          field === 'telegram_id'
            ? 'Telegram ID'
            : field === 'telegram_username'
              ? t('admin.broadcasts.atomic.telegramUsername', 'Ник Telegram')
              : 'Email'
        }
        aria-expanded={open && !condition.value}
        aria-controls={`audience-users-${field}-${rowIndex}`}
        aria-autocomplete="list"
        aria-activedescendant={
          open && users[highlight]
            ? `audience-user-${field}-${rowIndex}-${users[highlight].id}`
            : undefined
        }
        placeholder={t(
          'admin.broadcasts.atomic.searchUser',
          'Начните вводить и выберите пользователя',
        )}
        value={text}
        onFocus={() => setOpen(!condition.value)}
        onChange={(event) => {
          setText(event.target.value);
          setOffset(0);
          setHighlight(0);
          setOpen(true);
          onSelect('', null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
          if (event.key === 'ArrowDown' && users.length) {
            event.preventDefault();
            setHighlight((current) => Math.min(current + 1, users.length - 1));
          }
          if (event.key === 'ArrowUp' && users.length) {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          }
          if (event.key === 'Enter' && open && users[highlight]) {
            event.preventDefault();
            const user = users[highlight];
            const label = describe(user);
            setText(label);
            setOpen(false);
            onSelect(String(user.id), label);
          }
        }}
      />
      {open && !condition.value && query && searchReady && (
        <div
          id={`audience-users-${field}-${rowIndex}`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full min-w-64 overflow-y-auto rounded-lg border border-dark-600 bg-dark-800 p-1 shadow-xl"
        >
          {results.isPending && (
            <p className="px-2 py-1 text-sm text-dark-400">{t('common.loading', 'Загрузка...')}</p>
          )}
          {results.isError && (
            <p className="px-2 py-1 text-sm text-error-400">
              {t('admin.broadcasts.audience.loadError', 'Ошибка поиска')}
            </p>
          )}
          {results.data && users.length === 0 && (
            <p className="px-2 py-1 text-sm text-dark-400">
              {t('admin.broadcasts.atomic.noUsers', 'Пользователи не найдены')}
            </p>
          )}
          {users.map((user, index) => (
            <button
              key={user.id}
              id={`audience-user-${field}-${rowIndex}-${user.id}`}
              type="button"
              role="option"
              aria-selected={highlight === index}
              className={`block w-full rounded px-2 py-1 text-left text-sm text-dark-100 hover:bg-dark-700 ${highlight === index ? 'bg-dark-700' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const label = describe(user);
                setText(label);
                setOpen(false);
                onSelect(String(user.id), label);
              }}
            >
              {describe(user)}
            </button>
          ))}
          {results.data && results.data.count > 20 && (
            <div className="flex items-center justify-between gap-2 border-t border-dark-700 px-2 py-1 text-xs text-dark-400">
              <button
                type="button"
                disabled={offset === 0}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOffset(Math.max(0, offset - 20));
                  setHighlight(0);
                }}
                className="disabled:opacity-40"
              >
                {t('admin.broadcasts.prev', 'Назад')}
              </button>
              <span>
                {offset + 1}–{Math.min(offset + 20, results.data.count)} / {results.data.count}
              </span>
              <button
                type="button"
                disabled={offset + 20 >= results.data.count}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOffset(offset + 20);
                  setHighlight(0);
                }}
                className="disabled:opacity-40"
              >
                {t('admin.broadcasts.next', 'Далее')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const dialogRef = useFocusTrap<HTMLDivElement>(showUsers, {
    onEscape: () => setShowUsers(false),
  });
  const [offset, setOffset] = useState(0);
  const pageSize = 50;

  const choices: FieldChoice[] = [
    {
      field: 'basic',
      label: t('admin.broadcasts.atomic.all', 'Все пользователи'),
      kind: 'fixed',
      values: [
        {
          value: channel === 'telegram' ? 'all' : 'all_email',
          label: t('admin.broadcasts.atomic.all', 'Все пользователи'),
        },
      ],
    },
    {
      field: 'subscription_status',
      label: t('admin.broadcasts.atomic.subscriptionStatus', 'Статус подписки'),
      kind: 'select',
      values: [
        { value: 'active', label: t('admin.broadcasts.atomic.active', 'Активна') },
        { value: 'expired', label: t('admin.broadcasts.atomic.expired', 'Истекла') },
      ],
    },
    {
      field: 'subscription_type',
      label: t('admin.broadcasts.atomic.subscriptionType', 'Тип подписки'),
      kind: 'select',
      values: [
        { value: 'trial', label: t('admin.broadcasts.atomic.trial', 'Триальная') },
        { value: 'paid', label: t('admin.broadcasts.atomic.paid', 'Оплаченная') },
      ],
    },
    {
      field: 'tariff',
      label: t('admin.broadcasts.atomic.tariff', 'Тариф'),
      kind: 'select',
      values: filters
        .filter((filter): filter is TariffFilter => 'tariff_id' in filter)
        .map((filter) => ({ value: filter.key, label: filter.label })),
    },
    {
      field: 'traffic_zero',
      label: t('admin.broadcasts.atomic.trafficZero', 'Использованный трафик равен 0'),
      kind: 'fixed',
      values: [{ value: 'zero', label: '0 ГБ' }],
    },
    {
      field: 'traffic_gt',
      label: t('admin.broadcasts.atomic.trafficGt', 'Использованный трафик больше'),
      kind: 'number',
    },
    {
      field: 'traffic_lt',
      label: t('admin.broadcasts.atomic.trafficLt', 'Использованный трафик меньше'),
      kind: 'number',
    },
    {
      field: 'subscription_end_preset',
      label: t('admin.broadcasts.atomic.endPreset', 'Окончание подписки: быстрый период'),
      kind: 'select',
      values: [
        { value: 'expiring', label: t('admin.broadcasts.atomic.next3Days', 'В ближайшие 3 дня') },
      ],
    },
    {
      field: 'subscription_end_date',
      label: t('admin.broadcasts.atomic.endDate', 'Окончание подписки: дата'),
      kind: 'date',
    },
    {
      field: 'registration',
      label: t('admin.broadcasts.atomic.registrationPreset', 'Регистрация: быстрый период'),
      kind: 'select',
      values: [
        { value: 'custom_today', label: t('admin.broadcasts.atomic.today', 'Сегодня') },
        { value: 'custom_week', label: t('admin.broadcasts.atomic.last7Days', 'За 7 дней') },
        { value: 'custom_month', label: t('admin.broadcasts.atomic.last30Days', 'За 30 дней') },
      ],
    },
    {
      field: 'registration_date',
      label: t('admin.broadcasts.atomic.registrationDate', 'Дата регистрации'),
      kind: 'date',
    },
    {
      field: 'activity',
      label: t('admin.broadcasts.atomic.activityPreset', 'Активность: быстрый период'),
      kind: 'select',
      values: [
        {
          value: 'custom_active_today',
          label: t('admin.broadcasts.atomic.activeToday', 'Активен сегодня'),
        },
        {
          value: 'custom_inactive_week',
          label: t('admin.broadcasts.atomic.inactive7Days', 'Неактивен 7+ дней'),
        },
        {
          value: 'custom_inactive_month',
          label: t('admin.broadcasts.atomic.inactive30Days', 'Неактивен 30+ дней'),
        },
      ],
    },
    {
      field: 'activity_date',
      label: t('admin.broadcasts.atomic.activityDate', 'Последняя активность: дата'),
      kind: 'date',
    },
    {
      field: 'source',
      label: t('admin.broadcasts.atomic.source', 'Источник регистрации'),
      kind: 'select',
      values: [
        { value: 'custom_referrals', label: t('admin.broadcasts.atomic.referral', 'По рефералу') },
        { value: 'custom_direct', label: t('admin.broadcasts.atomic.direct', 'Напрямую') },
      ],
    },
    {
      field: 'auth_type',
      label: t('admin.broadcasts.audience.authType', 'Способ регистрации'),
      kind: 'select',
      values: [
        { value: 'telegram_with_email', label: 'Telegram' },
        { value: 'email_only', label: 'Email' },
      ],
    },
    {
      field: 'paid_history',
      label: t('admin.broadcasts.atomic.paidHistory', 'Оплачивал раньше'),
      kind: 'select',
      values: [
        { value: 'yes', label: t('common.yes', 'Да') },
        { value: 'no', label: t('common.no', 'Нет') },
      ],
    },
    ...(channel === 'telegram'
      ? [
          { field: 'telegram_id', label: 'Telegram ID', kind: 'user' as const },
          {
            field: 'telegram_username',
            label: t('admin.broadcasts.atomic.telegramUsername', 'Ник Telegram'),
            kind: 'user' as const,
          },
        ]
      : [{ field: 'email_user', label: 'Email', kind: 'user' as const }]),
  ];

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
      conditions: [
        ...audience.conditions,
        { client_id: rowId(), field: '', operator: 'eq', value: '', join: 'and' },
      ],
    });
  };

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-dark-300">
        {t('admin.broadcasts.selectFilter', 'Выберите аудиторию')}
      </h3>
      <div className="space-y-3">
        {audience.conditions.map((condition, index) => {
          const choice = choices.find((item) => item.field === condition.field);
          return (
            <div key={condition.client_id || index}>
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_140px_minmax(0,2fr)_auto]">
                <select
                  aria-label={t('admin.broadcasts.audience.field', 'Условие фильтрации')}
                  value={condition.field}
                  onChange={(event) => {
                    const next = choices.find((item) => item.field === event.target.value);
                    changeCondition(index, {
                      field: event.target.value,
                      operator: next?.kind === 'date' ? 'before' : 'eq',
                      value: next?.kind === 'fixed' ? next.values?.[0]?.value || '' : '',
                      value_to: null,
                      label: null,
                    });
                  }}
                  className="input min-w-0"
                >
                  <option value="">
                    {t('admin.broadcasts.audience.field', 'Условие фильтрации')}
                  </option>
                  {choices.map((item) => (
                    <option key={item.field} value={item.field}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {choice?.kind === 'date' ? (
                  <select
                    aria-label={t('admin.broadcasts.audience.comparison', 'Оператор сравнения')}
                    value={condition.operator}
                    onChange={(event) =>
                      changeCondition(index, {
                        operator: event.target.value as 'before' | 'after' | 'between',
                        value_to: null,
                      })
                    }
                    className="input min-w-0"
                  >
                    <option value="before">{t('admin.broadcasts.atomic.before', 'До даты')}</option>
                    <option value="after">
                      {t('admin.broadcasts.atomic.after', 'После даты')}
                    </option>
                    <option value="between">
                      {t('admin.broadcasts.atomic.between', 'Между датами')}
                    </option>
                  </select>
                ) : choice?.kind === 'number' || choice?.kind === 'fixed' ? (
                  <span className="flex items-center text-sm text-dark-400">
                    {choice.kind === 'number'
                      ? condition.field === 'traffic_gt'
                        ? '>'
                        : '<'
                      : '='}
                  </span>
                ) : (
                  <select
                    aria-label={t('admin.broadcasts.audience.comparison', 'Оператор сравнения')}
                    value={condition.operator}
                    onChange={(event) =>
                      changeCondition(index, { operator: event.target.value as 'eq' | 'ne' })
                    }
                    className="input min-w-0"
                  >
                    <option value="eq">{t('admin.broadcasts.audience.equals', 'Равно')}</option>
                    <option value="ne">
                      {t('admin.broadcasts.audience.notEquals', 'Не равно')}
                    </option>
                  </select>
                )}
                {choice?.kind === 'date' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <DateField
                      value={condition.value}
                      onChange={(value) => changeCondition(index, { value })}
                      max={
                        condition.operator === 'between'
                          ? condition.value_to || undefined
                          : undefined
                      }
                      placeholder={t('admin.broadcasts.atomic.dateFrom', 'Дата')}
                    />
                    {condition.operator === 'between' && (
                      <DateField
                        value={condition.value_to || ''}
                        onChange={(value) => changeCondition(index, { value_to: value })}
                        min={condition.value || undefined}
                        placeholder={t('admin.broadcasts.atomic.dateTo', 'До')}
                      />
                    )}
                  </div>
                ) : choice?.kind === 'number' ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="any"
                      inputMode="decimal"
                      placeholder="0"
                      className="input w-full min-w-0"
                      value={condition.value}
                      onChange={(event) => changeCondition(index, { value: event.target.value })}
                      aria-label={t('admin.broadcasts.atomic.gigabytes', 'Гигабайты')}
                    />
                    <span className="text-sm text-dark-400">ГБ</span>
                  </div>
                ) : choice?.kind === 'user' ? (
                  <UserLookup
                    key={`${index}-${condition.field}`}
                    field={condition.field as UserField}
                    condition={condition}
                    rowIndex={index}
                    onSelect={(value, label) => changeCondition(index, { value, label })}
                  />
                ) : choice?.kind === 'fixed' ? (
                  <span className="flex items-center text-sm text-dark-200">
                    {choice.values?.[0]?.label}
                  </span>
                ) : (
                  <select
                    aria-label={t('admin.broadcasts.audience.value', 'Значение')}
                    value={condition.value}
                    onChange={(event) => changeCondition(index, { value: event.target.value })}
                    disabled={!condition.field}
                    className="input min-w-0"
                  >
                    <option value="">{t('admin.broadcasts.audience.value', 'Значение')}</option>
                    {(choice?.values || []).map((value) => (
                      <option key={value.value} value={value.value}>
                        {value.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
                  disabled={audience.conditions.length === 1}
                  aria-label={t('admin.broadcasts.audience.remove', 'Удалить условие')}
                  className="h-10 w-10 justify-self-end rounded-lg border border-dark-700 text-dark-300 hover:border-dark-500 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
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
            ref={dialogRef}
            className="w-full max-w-xl rounded-xl border border-dark-700 bg-dark-900 p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label={t('admin.broadcasts.audience.users', 'Получатели рассылки')}
            tabIndex={-1}
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
