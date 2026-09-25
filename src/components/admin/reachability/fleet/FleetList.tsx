import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { CheckGlyph } from '../SelectableRow';
import type { GroupState } from '../unitSelection';
import { COL_AGE, COL_UNITS, FleetRowItem, STATE_DOT } from './FleetRowItem';
import type { TargetProgress } from './batchProgress';
import { type FleetRow, type FleetState, groupRows, selectionState } from './fleet';

interface FleetListProps {
  /** Уже отфильтрованные строки; группировка «проблемы сначала» делается здесь. */
  rows: FleetRow[];
  /** Отмеченные серверы (refs) — цели проверки. */
  picked: Set<string>;
  onToggle: (ref: string) => void;
  /** Чекбокс группы или «Выбрать все»: отметить (on) или снять сразу несколько серверов. */
  onToggleMany: (refs: string[], on: boolean) => void;
  onDetails: (row: FleetRow) => void;
  /** Поиск по имени или адресу — в шапке таблицы, рядом с «Выбрать все». */
  query: string;
  onQuery: (query: string) => void;
  /** Сервер, чья карточка раскрыта под строкой (target_key). */
  expandedKey?: string | null;
  /** Содержимое раскрытой карточки. */
  renderDetails?: (row: FleetRow) => ReactNode;
  /** Живой прогресс идущей пачки по target_key. */
  progress?: Map<string, TargetProgress>;
  emptyText: string;
}

/** Работающие серверы сворачиваются, если их много или есть что показать важнее. */
const COLLAPSE_OK_FROM = 6;
const SELECT_BUTTON =
  'flex min-h-[40px] min-w-0 flex-1 items-center gap-3 px-3 text-left disabled:cursor-default disabled:opacity-50';
const SELECT_ALL_BUTTON =
  'flex h-10 w-10 shrink-0 items-center justify-center disabled:cursor-default disabled:opacity-50';

function ariaChecked(state: GroupState): boolean | 'mixed' {
  return state === 'some' ? 'mixed' : state === 'all';
}

/**
 * Серверы одной таблицей: шапка с «Выбрать все», поиском и колонками, группы «не работают →
 * не у всех → не проверяли → работают (свёрнуты)» с чекбоксом на группу, строка — чекбокс цели.
 * Так и на сотню серверов страница остаётся короткой, а выбор — в один тап.
 */
export function FleetList({
  rows,
  picked,
  onToggle,
  onToggleMany,
  onDetails,
  query,
  onQuery,
  expandedKey = null,
  renderDetails,
  progress,
  emptyText,
}: FleetListProps) {
  const { t } = useTranslation();
  const [okOpen, setOkOpen] = useState(false);
  const groups = groupRows(rows);
  const base = 'admin.reachability.fleet';
  /** Серверы, которые можно отметить: есть хост панели и их сейчас не проверяют. */
  const selectable = (list: FleetRow[]) =>
    list
      .filter((row) => row.ref !== null && !progress?.has(row.key))
      .map((row) => row.ref as string);
  const allRefs = selectable(rows);
  const allState = selectionState(allRefs, picked);

  return (
    <div className="divide-y divide-dark-700/40 overflow-hidden rounded-2xl border border-dark-700/60">
      <div className="flex items-center gap-3 bg-dark-900/40 py-1 pe-3 ps-1 text-xs text-dark-400">
        <button
          type="button"
          role="checkbox"
          aria-checked={ariaChecked(allState)}
          aria-label={t(`${base}.selectAll`)}
          title={t(`${base}.selectAll`)}
          disabled={allRefs.length === 0}
          onClick={() => onToggleMany(allRefs, allState !== 'all')}
          className={SELECT_ALL_BUTTON}
        >
          <CheckGlyph on={allState === 'all'} mixed={allState === 'some'} />
        </button>
        <label className="relative block min-w-0 flex-1 md:max-w-56">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            aria-label={t(`${base}.search`)}
            placeholder={t(`${base}.search`)}
            className="h-8 w-full rounded-lg border border-dark-700/50 bg-dark-800/50 pe-2 ps-8 text-xs text-dark-100 placeholder:text-dark-500 focus:border-accent-500/50 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
        </label>
        <span className="hidden flex-1 md:block" />
        <span className={cn('hidden md:block', COL_UNITS)}>{t(`${base}.columns.units`)}</span>
        <span className={cn('hidden md:block', COL_AGE)}>{t(`${base}.columns.checked`)}</span>
        <span aria-hidden="true" className="hidden w-6 shrink-0 md:block" />
      </div>
      {groups.length === 0 && (
        <p className="py-10 text-center text-sm text-dark-400">{emptyText}</p>
      )}
      {groups.map((group) => {
        const collapsible =
          group.state === 'ok' && (groups.length > 1 || group.rows.length >= COLLAPSE_OK_FROM);
        const collapsed = collapsible && !okOpen;
        const refs = selectable(group.rows);
        const state = selectionState(refs, picked);
        return (
          <section key={group.state} aria-label={t(`${base}.group.${group.state}`)}>
            <div className="flex items-center gap-3 bg-dark-900/30 pe-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={ariaChecked(state)}
                disabled={refs.length === 0}
                onClick={() => onToggleMany(refs, state !== 'all')}
                className={SELECT_BUTTON}
              >
                <CheckGlyph on={state === 'all'} mixed={state === 'some'} />
                <GroupName state={group.state} count={group.rows.length} />
              </button>
              {collapsible && (
                <Button variant="link" size="sm" onClick={() => setOkOpen((open) => !open)}>
                  {collapsed
                    ? t(`${base}.showAll`, { count: group.rows.length })
                    : t(`${base}.hide`)}
                </Button>
              )}
            </div>
            {!collapsed && (
              <ul className="divide-y divide-dark-700/30 border-t border-dark-700/30">
                {group.rows.map((row) => {
                  const expanded = row.key === expandedKey;
                  return (
                    <li key={row.key}>
                      <FleetRowItem
                        row={row}
                        picked={row.ref !== null && picked.has(row.ref)}
                        onToggle={onToggle}
                        onDetails={onDetails}
                        expanded={expanded}
                        progress={progress?.get(row.key)}
                      />
                      {expanded && renderDetails && (
                        <div className="border-t border-dark-700/40 bg-dark-900/40 px-3 py-4 md:px-5">
                          {renderDetails(row)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GroupName({ state, count }: { state: FleetState; count: number }) {
  const { t } = useTranslation();
  return (
    <>
      <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', STATE_DOT[state])} />
      <span className="text-[13px] font-semibold text-dark-200">
        {t(`admin.reachability.fleet.group.${state}`)}
      </span>
      <span className="text-[13px] tabular-nums text-dark-500">{count}</span>
    </>
  );
}
