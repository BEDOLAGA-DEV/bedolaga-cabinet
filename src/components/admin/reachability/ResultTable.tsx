import { Fragment, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Leg } from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { ProbeDot } from './ProbeDot';
import { VerdictBadge } from './VerdictBadge';
import type { CellState } from './probeCells';
import type { UnitLabel } from './unitLabel';

/**
 * Результат по симкам — для людей: сначала вердикт, потом пробы. На широком экране таблица
 * «Оператор · Вердикт · пробы», на телефоне список «оператор → вердикт», пробы и диагноз —
 * по тапу. Таблица проб и VLESS-тест отличаются только набором столбцов и ячейками.
 */

export interface ResultColumn {
  key: string;
  title: string;
}

export interface ResultCellProps {
  /** null — без точки, только текст. */
  state: CellState | null;
  value: string | null;
  /** Несколько точек в одной ячейке (SNI-имена, целевые сайты). */
  subs?: boolean[] | null;
  title?: string | null;
  subTitle?: (index: number) => string;
  icon?: ReactNode;
}

export interface ResultRow {
  leg: Leg;
  label: UnitLabel;
  cells: ReadonlyArray<ResultCellProps & { key: string }>;
  /** Диагноз словами: на широком экране по тапу на строку, на телефоне в раскрытии. */
  note?: string | null;
}

export interface ResultGroup {
  targetKey: string;
  label: string;
  rows: ResultRow[];
}

/** Классы таблиц результата — общие для проб, VLESS-теста и матрицы на узких экранах. */
export const TABLE_STYLES = {
  wrap: 'overflow-x-auto rounded-xl border border-dark-700/60',
  table: 'w-full min-w-max border-collapse text-sm',
  head: 'bg-dark-900/60 text-xs font-medium text-dark-400',
  thFirst: 'px-3 py-2 text-left',
  th: 'px-2 py-2 text-center',
  row: 'border-t border-dark-700/60',
  unitCell: 'px-3 py-2 align-middle',
  cell: 'px-2 py-2 text-center align-middle',
  value: 'text-xs tabular-nums text-dark-300',
} as const;

const { cell: CELL, row: ROW_BORDER, value: VALUE } = TABLE_STYLES;

/** Симка оператора: иконка, имя, округ, «без Белого списка». Вставлять в кнопку или заголовок. */
export function UnitBadge({ label, noBs }: { label: UnitLabel; noBs: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <OperatorIcon operator={label.code} className="h-4 w-4 rounded" />
      <span className="font-medium text-dark-100">{label.name}</span>
      {label.region && (
        <span className="rounded bg-dark-700/60 px-1.5 text-xs text-dark-300">{label.region}</span>
      )}
      {noBs && <span className="text-xs text-dark-400">{t('admin.reachability.result.noBs')}</span>}
    </>
  );
}

function CellValue({ state, value, subs, subTitle, icon }: ResultCellProps) {
  const text = value ? <span className={VALUE}>{value}</span> : null;
  if (subs) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex gap-0.5">
          {subs.map((ok, index) => (
            <ProbeDot key={index} size="sm" state={ok ? 'ok' : 'down'} title={subTitle?.(index)} />
          ))}
        </span>
        {text}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      {state && <ProbeDot state={state} />}
      {icon}
      {text}
      {!value && (state === null || state === 'na') && (
        <span className="text-xs text-dark-500">—</span>
      )}
    </span>
  );
}

/** Заголовок группы строк — цель (сервер), когда целей несколько. */
export function GroupRow({
  span,
  label,
  targetKey,
}: {
  span: number;
  label: string;
  targetKey: string;
}) {
  return (
    <tr className={cn(ROW_BORDER, 'bg-dark-900/30')}>
      <td colSpan={span} className="px-3 py-1.5">
        <span className="text-sm font-medium text-dark-100">{label}</span>
        {label !== targetKey && (
          <span className="ml-2 font-mono text-xs text-dark-400">{targetKey}</span>
        )}
      </td>
    </tr>
  );
}

function DetailsRow({ span, note }: { span: number; note: string }) {
  const { t } = useTranslation();
  return (
    <tr className={cn(ROW_BORDER, 'bg-dark-950/40')}>
      <td colSpan={span} className="px-3 py-2 text-sm text-dark-200">
        <span className="text-dark-400">{t('admin.reachability.result.diagnosis')}: </span>
        {note}
      </td>
    </tr>
  );
}

interface ResultTableProps {
  columns: readonly ResultColumn[];
  groups: readonly ResultGroup[];
  /** Подпись списка на телефоне для скринридера. */
  listLabel: string;
}

export function ResultTable({ columns, groups, listLabel }: ResultTableProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const toggle = (id: number) => setOpen((current) => (current === id ? null : id));
  const multi = groups.length > 1;
  const span = columns.length + 2;

  return (
    <>
      <div className={cn('hidden md:block', TABLE_STYLES.wrap)}>
        <table className={TABLE_STYLES.table}>
          <thead>
            <tr className={TABLE_STYLES.head}>
              <th className={TABLE_STYLES.thFirst}>{t('admin.reachability.result.operator')}</th>
              <th className={TABLE_STYLES.th}>{t('admin.reachability.result.verdict')}</th>
              {columns.map((column) => (
                <th key={column.key} className={TABLE_STYLES.th}>
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.targetKey}>
                {multi && <GroupRow span={span} label={group.label} targetKey={group.targetKey} />}
                {group.rows.map((row) => {
                  const isOpen = open === row.leg.id;
                  const badge = <UnitBadge label={row.label} noBs={row.leg.dpi === 'off'} />;
                  return (
                    <Fragment key={row.leg.id}>
                      <tr
                        className={cn(
                          ROW_BORDER,
                          row.note && 'cursor-pointer hover:bg-dark-800/40',
                          isOpen && 'bg-dark-800/40',
                        )}
                        onClick={row.note ? () => toggle(row.leg.id) : undefined}
                      >
                        <td className={TABLE_STYLES.unitCell}>
                          {row.note ? (
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              className="flex items-center gap-2 text-left"
                            >
                              {badge}
                            </button>
                          ) : (
                            <span className="flex items-center gap-2">{badge}</span>
                          )}
                        </td>
                        <td className={CELL}>
                          <VerdictBadge
                            verdict={row.leg.verdict}
                            matches={row.leg.matches_expectation}
                          />
                        </td>
                        {row.cells.map(({ key, ...cell }) => (
                          <td key={key} className={CELL} title={cell.title ?? undefined}>
                            <CellValue {...cell} />
                          </td>
                        ))}
                      </tr>
                      {isOpen && row.note && <DetailsRow span={span} note={row.note} />}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <ul
        aria-label={listLabel}
        className="divide-y divide-dark-700/60 overflow-hidden rounded-xl border border-dark-700/60 md:hidden"
      >
        {groups.map((group) => (
          <Fragment key={group.targetKey}>
            {multi && (
              <li className="bg-dark-900/30 px-3 py-1.5 text-sm font-medium text-dark-100">
                {group.label}
              </li>
            )}
            {group.rows.map((row) => {
              const isOpen = open === row.leg.id;
              return (
                <li key={row.leg.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => toggle(row.leg.id)}
                    className="flex min-h-[48px] w-full items-center gap-2 px-3 py-2 text-left"
                  >
                    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                      <UnitBadge label={row.label} noBs={row.leg.dpi === 'off'} />
                    </span>
                    <VerdictBadge verdict={row.leg.verdict} matches={row.leg.matches_expectation} />
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={cn(
                        'h-4 w-4 shrink-0 text-dark-400 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-dark-700/60 bg-dark-900/40 px-3 py-2">
                      <dl className="flex flex-wrap gap-x-4 gap-y-1">
                        {columns.map((column, index) => {
                          const cell = row.cells[index];
                          if (!cell) return null;
                          return (
                            <div key={column.key} className="flex items-center gap-1.5 text-xs">
                              <dt className="text-dark-400">{column.title}</dt>
                              <dd>
                                <CellValue {...cell} />
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                      {row.note && (
                        <p className="text-sm text-dark-200">
                          <span className="text-dark-400">
                            {t('admin.reachability.result.diagnosis')}:{' '}
                          </span>
                          {row.note}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </Fragment>
        ))}
      </ul>
    </>
  );
}
