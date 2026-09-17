import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import type { DropdownOption } from '@/components/admin/bulkActions/DropdownSelect';
import { Segmented } from '@/components/admin/Segmented';
import { SearchIcon, XIcon } from '@/components/icons';
import {
  type SortDirection,
  type SortKey,
  type StatusFilter,
  type SubFilter,
  type UsersListState,
  type ViewKey,
  DEFAULT_STATE,
  EXPIRING_DAYS,
  SORT_KEYS,
  SUB_FILTERS,
  VIEW_KEYS,
  applyView,
  naturalDirection,
  sortDirection,
  viewFilterValue,
  withSort,
} from '@/pages/adminUsers/usersListState';
import { AppliedFilters } from './AppliedFilters';
import { type FilterField, type FilterKey, FiltersPopover } from './FiltersPopover';
import { SortMenu } from './SortMenu';

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

const WIDE_QUERY = '(min-width: 640px)';
const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia?.(WIDE_QUERY);
  query?.addEventListener?.('change', onChange);
  return () => query?.removeEventListener?.('change', onChange);
};
/** Широкий ли экран — для подсказки в поиске: на телефоне длинная обрезалась на «…или e». */
const useWideScreen = () =>
  useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia?.(WIDE_QUERY).matches ?? true,
    () => true,
  );

/** Пауза после последней буквы перед запросом; Enter отправляет сразу. */
export const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS: StatusFilter[] = ['active', 'blocked', 'deleted'];

/**
 * Одно поле поиска, кнопки «Фильтры» и сортировки, выборки переключателем и чипы
 * выбранных фильтров. Состояние живёт в адресе страницы — здесь только текст поиска
 * до отправки.
 */
export function UsersToolbar({ state, onChange, options }: UsersToolbarProps) {
  const { t } = useTranslation();
  const searchId = useId();
  const [text, setText] = useState(state.q);
  const wide = useWideScreen();
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

  const withAny = (list: DropdownOption[], anyKey: string): DropdownOption[] => [
    { value: '', label: t(`admin.users.filterAny.${anyKey}`) },
    ...list,
  ];
  const fields: FilterField[] = [
    {
      key: 'status',
      label: t('admin.users.filterLabels.status'),
      value: state.status,
      fromView: state.status === viewFilterValue(state.view, 'status'),
      options: withAny(
        STATUS_OPTIONS.map((value) => ({ value, label: t(`admin.users.status.${value}`) })),
        'status',
      ),
    },
    {
      key: 'sub',
      label: t('admin.users.filterLabels.sub'),
      value: state.sub,
      fromView: state.sub === viewFilterValue(state.view, 'sub'),
      options: withAny(
        SUB_FILTERS.filter(Boolean).map((value: SubFilter) => ({
          value,
          label: t(`admin.users.subFilters.${value}`),
        })),
        'sub',
      ),
    },
    {
      key: 'tariff',
      label: t('admin.users.filterLabels.tariff'),
      value: state.tariff,
      options: withAny(options.tariffs, 'tariff'),
    },
    {
      key: 'group',
      label: t('admin.users.filterLabels.group'),
      value: state.group,
      options: withAny(options.groups, 'group'),
    },
    {
      key: 'campaign',
      label: t('admin.users.filterLabels.campaign'),
      value: state.campaign,
      options: withAny(options.campaigns, 'campaign'),
    },
  ];
  const setFilter = (key: FilterKey, value: string) => patch({ [key]: value });
  const clearFilters = () => patch({ status: '', sub: '', tariff: '', group: '', campaign: '' });

  // Пункт меню — ключ и направление сразу («Сначала новые»); привычное направление ключа первым в паре.
  const sortGroups: DropdownOption[][] = SORT_KEYS.map((key: SortKey) => {
    const natural = naturalDirection(key);
    return [natural, natural === 'asc' ? 'desc' : 'asc'].map((dir) => ({
      value: `${key}:${dir}`,
      label: t(`admin.users.sort.${key}.${dir}`),
    }));
  });
  const viewOptions = VIEW_KEYS.map((view: ViewKey) => ({
    value: view,
    label: t(`admin.users.views.${view}`, { days: EXPIRING_DAYS }),
  }));

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
            enterKeyHint="done"
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
                // На телефоне клавиатура закрывает пол-экрана, а результат уже под ней.
                inputRef.current?.blur();
              }
              if (event.key === 'Escape' && text) {
                setText('');
                commit('');
              }
            }}
            placeholder={wide ? t('admin.users.search') : t('admin.users.searchShort')}
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
        <FiltersPopover fields={fields} onChange={setFilter} onReset={clearFilters} />
        <SortMenu
          label={t('admin.users.sort.label')}
          value={`${state.sort}:${sortDirection(state)}`}
          groups={sortGroups}
          onChange={(value) => {
            const [sort, dir] = value.split(':') as [SortKey, SortDirection];
            onChange(withSort(state, sort, dir));
          }}
          direction={sortDirection(state)}
          changed={state.sort !== DEFAULT_STATE.sort || state.dir !== DEFAULT_STATE.dir}
        />
      </div>

      <Segmented
        size="md"
        label={t('admin.users.viewsLabel')}
        value={state.view}
        options={viewOptions}
        onChange={(view) => onChange(applyView(state, view))}
      />

      <AppliedFilters
        fields={fields}
        onRemove={(key) => setFilter(key, '')}
        onResetAll={() => {
          setText('');
          onChange({ ...applyView(state, 'all'), q: '' });
        }}
      />
    </div>
  );
}
