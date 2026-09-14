import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon } from '@/components/icons';
import { DropdownSelect, type DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { cn } from '@/lib/utils';
import {
  type SortKey,
  type StatusFilter,
  type SubFilter,
  type UsersListState,
  type ViewKey,
  EXPIRING_DAYS,
  SORT_KEYS,
  SUB_FILTERS,
  VIEW_KEYS,
  applyView,
  hasActiveFilters,
} from '@/pages/adminUsers/usersListState';

export interface ToolbarOptions {
  tariffs: DropdownOption[];
  groups: DropdownOption[];
  campaigns: DropdownOption[];
}

interface UsersToolbarProps {
  state: UsersListState;
  onChange: (next: UsersListState) => void;
  options: ToolbarOptions;
}

/** Пауза после последней буквы перед запросом; Enter отправляет сразу. */
export const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: StatusFilter[] = ['active', 'blocked', 'deleted'];

/**
 * Одно поле поиска, сортировка, сегменты и чипы фильтров.
 * Компонент не хранит состояние выборки — оно живёт в адресе страницы,
 * здесь только текст поиска до отправки.
 */
export function UsersToolbar({ state, onChange, options }: UsersToolbarProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const [text, setText] = useState(state.q);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Внешний сброс (кнопка «Сбросить всё», «Назад» в браузере) должен отражаться в поле.
  useEffect(() => {
    setText(state.q);
  }, [state.q]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // «/» ставит курсор в поиск, как в GitHub и Linear; не мешает, если уже печатают.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const commit = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (q !== state.q) onChange({ ...state, q });
  };

  const patch = (partial: Partial<UsersListState>) =>
    onChange({ ...state, ...partial, view: 'all' });

  const sortOptions: DropdownOption[] = SORT_KEYS.map((key: SortKey) => ({
    value: key,
    label: t(`admin.users.sort.${key}`),
  }));
  const statusOptions: DropdownOption[] = [
    { value: '', label: t('admin.users.filterAny.status') },
    ...STATUS_OPTIONS.map((value) => ({ value, label: t(`admin.users.status.${value}`) })),
  ];
  const subOptions: DropdownOption[] = SUB_FILTERS.map((value: SubFilter) => ({
    value,
    label: value ? t(`admin.users.subFilters.${value}`) : t('admin.users.filterAny.sub'),
  }));
  const withAny = (list: DropdownOption[], anyKey: string): DropdownOption[] => [
    { value: '', label: t(`admin.users.filterAny.${anyKey}`) },
    ...list,
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            {t('admin.users.search')}
          </label>
          <input
            ref={inputRef}
            id={searchId}
            type="search"
            value={text}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit(text);
              }
              if (event.key === 'Escape' && text) {
                setText('');
                commit('');
              }
            }}
            placeholder={t('admin.users.search')}
            className="h-11 w-full rounded-xl border border-dark-700 bg-dark-800 pl-10 pr-10 text-sm text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)]"
          />
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-dark-700 px-1.5 py-0.5 font-mono text-[11px] text-dark-500 sm:block"
          >
            /
          </kbd>
        </div>
        <label className="flex items-center gap-2 text-xs text-dark-500">
          <span className="shrink-0">{t('admin.users.sort.label')}</span>
          <DropdownSelect
            value={state.sort}
            options={sortOptions}
            onChange={(value) => onChange({ ...state, sort: value as SortKey })}
            className="min-w-[190px]"
          />
        </label>
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {VIEW_KEYS.map((view: ViewKey) => (
          <button
            key={view}
            type="button"
            aria-pressed={state.view === view}
            onClick={() => onChange(applyView(state, view))}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              state.view === view
                ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                : 'bg-dark-800/50 text-dark-400 hover:text-dark-200',
            )}
          >
            {t(`admin.users.views.${view}`, { days: EXPIRING_DAYS })}
          </button>
        ))}
      </div>

      <div className="scrollbar-hide -mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <FilterChip
          label={t('admin.users.filterLabels.status')}
          value={state.status}
          options={statusOptions}
          onChange={(value) => patch({ status: value as StatusFilter })}
        />
        <FilterChip
          label={t('admin.users.filterLabels.sub')}
          value={state.sub}
          options={subOptions}
          onChange={(value) => patch({ sub: value as SubFilter })}
        />
        <FilterChip
          label={t('admin.users.filterLabels.tariff')}
          value={state.tariff}
          options={withAny(options.tariffs, 'tariff')}
          onChange={(value) => patch({ tariff: value })}
        />
        <FilterChip
          label={t('admin.users.filterLabels.group')}
          value={state.group}
          options={withAny(options.groups, 'group')}
          onChange={(value) => patch({ group: value })}
        />
        <FilterChip
          label={t('admin.users.filterLabels.campaign')}
          value={state.campaign}
          options={withAny(options.campaigns, 'campaign')}
          onChange={(value) => patch({ campaign: value })}
        />
        {hasActiveFilters(state) && (
          <button
            type="button"
            onClick={() => {
              setText('');
              onChange({ ...applyView(state, 'all'), q: '' });
            }}
            className="shrink-0 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/10"
          >
            {t('admin.users.reset')}
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

/** Чип-фильтр: подпись слева, готовый DropdownSelect справа; выбранное значение выделено цветом. */
function FilterChip({ label, value, options, onChange }: FilterChipProps) {
  const id = useId();
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-xl border pl-3 transition-colors',
        value ? 'border-accent-500/30 bg-accent-500/10' : 'border-dark-700 bg-dark-800/50',
      )}
    >
      <label htmlFor={id} className="whitespace-nowrap text-xs text-dark-500">
        {label}
      </label>
      <DropdownSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        className={cn(
          '[&>select]:border-0 [&>select]:bg-transparent [&>select]:py-1.5 [&>select]:pl-1 [&>select]:text-sm [&>select]:font-medium',
          value ? '[&>select]:text-accent-400' : '[&>select]:text-dark-200',
        )}
      />
    </div>
  );
}
