import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { SearchIcon, XIcon } from '@/components/icons';
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
import { FilterMenu } from './FilterMenu';

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
 * Одно поле поиска, сегменты и чипы фильтров. Состояние выборки живёт в адресе
 * страницы — здесь только текст поиска до отправки.
 */
export function UsersToolbar({ state, onChange, options }: UsersToolbarProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const [text, setText] = useState(state.q);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Отложенный поиск берёт выборку на момент отправки, а не ввода: чип, выбранный
  // за эти 300 мс, иначе откатывался бы.
  const stateRef = useRef(state);
  stateRef.current = state;

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
    const latest = stateRef.current;
    if (q !== latest.q) onChange({ ...latest, q });
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

  const sortMenu = (className: string, align: 'start' | 'end') => (
    <FilterMenu
      label={t('admin.users.sort.label')}
      value={state.sort}
      options={sortOptions}
      onChange={(value) => onChange({ ...state, sort: value as SortKey })}
      active={false}
      align={align}
      className={className}
    />
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
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
            className="h-11 w-full appearance-none rounded-xl border border-dark-700 bg-dark-800 pl-10 pr-10 text-sm text-dark-100 placeholder-dark-500 outline-none transition-colors focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)] [&::-webkit-search-cancel-button]:hidden"
          />
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          {text ? (
            <button
              type="button"
              onClick={() => {
                setText('');
                commit('');
                inputRef.current?.focus();
              }}
              aria-label={t('common.clear')}
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-700 hover:text-dark-200"
            >
              <XIcon className="h-4 w-4" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-dark-700 px-1.5 py-0.5 font-mono text-[11px] text-dark-500 sm:block"
            >
              /
            </kbd>
          )}
        </div>
        {sortMenu('hidden h-11 sm:inline-flex', 'end')}
      </div>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {VIEW_KEYS.map((view: ViewKey) => (
          <button
            key={view}
            type="button"
            aria-pressed={state.view === view}
            onClick={() => onChange(applyView(state, view))}
            className={cn(
              'h-9 shrink-0 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium transition-colors',
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
        <FilterMenu
          label={t('admin.users.filterLabels.status')}
          value={state.status}
          options={statusOptions}
          onChange={(value) => patch({ status: value as StatusFilter })}
        />
        <FilterMenu
          label={t('admin.users.filterLabels.sub')}
          value={state.sub}
          options={subOptions}
          onChange={(value) => patch({ sub: value as SubFilter })}
        />
        <FilterMenu
          label={t('admin.users.filterLabels.tariff')}
          value={state.tariff}
          options={withAny(options.tariffs, 'tariff')}
          onChange={(value) => patch({ tariff: value })}
        />
        <FilterMenu
          label={t('admin.users.filterLabels.group')}
          value={state.group}
          options={withAny(options.groups, 'group')}
          onChange={(value) => patch({ group: value })}
        />
        <FilterMenu
          label={t('admin.users.filterLabels.campaign')}
          value={state.campaign}
          options={withAny(options.campaigns, 'campaign')}
          onChange={(value) => patch({ campaign: value })}
        />
        {/* На телефоне сортировка — последним чипом: фильтры нужнее и видны без прокрутки ряда. */}
        {sortMenu('sm:hidden', 'end')}
        {hasActiveFilters(state) && (
          <button
            type="button"
            onClick={() => {
              setText('');
              onChange({ ...applyView(state, 'all'), q: '' });
            }}
            className="h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/10"
          >
            {t('admin.users.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
