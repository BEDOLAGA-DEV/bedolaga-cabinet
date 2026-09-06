import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Leg } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { ProbeDot } from './ProbeDot';
import { VerdictBadge } from './VerdictBadge';
import type { CellState } from './probeCells';
import type { UnitLabel } from './unitLabel';

/**
 * Общая оболочка таблиц результата — как в оригинале bsbord: «Оператор · столбцы · Вердикт»,
 * строки — симки операторов (иконка, округ, «без БС»), тап по строке — подробности.
 * Таблица проб и VLESS-тест отличаются только набором столбцов и ячейками.
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

/** Классы таблиц результата — общие для проб, VLESS-теста и матрицы на узких экранах. */
export const TABLE_STYLES = {
  wrap: 'overflow-x-auto rounded-xl border border-dark-700/60',
  table: 'w-full min-w-max border-collapse text-sm',
  head: 'bg-dark-900/60 text-[11px] uppercase tracking-wide text-dark-400',
  thFirst: 'px-3 py-2 text-left font-medium',
  th: 'px-2 py-2 text-center font-medium',
  row: 'border-t border-dark-700/60',
  unitCell: 'px-3 py-1.5 align-middle',
  cell: 'px-2 py-1.5 text-center align-middle',
  value: 'font-mono text-[11px] text-dark-300',
} as const;

const { cell: CELL, row: ROW_BORDER, value: VALUE } = TABLE_STYLES;

/** Число колонок вместе с «Оператор» и «Вердикт» — colSpan строк-групп и подробностей. */
export function tableSpan(columns: readonly ResultColumn[]): number {
  return columns.length + 2;
}

export function ResultTable({
  columns,
  children,
}: {
  columns: readonly ResultColumn[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={TABLE_STYLES.wrap}>
      <table className={TABLE_STYLES.table}>
        <thead>
          <tr className={TABLE_STYLES.head}>
            <th className={TABLE_STYLES.thFirst}>{t('admin.reachability.result.operator')}</th>
            {columns.map((column) => (
              <th key={column.key} className={TABLE_STYLES.th}>
                {column.title}
              </th>
            ))}
            <th className={TABLE_STYLES.th}>{t('admin.reachability.result.verdict')}</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
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

function ValueCell({ state, value, subs, title, subTitle, icon }: ResultCellProps) {
  const text = value ? <span className={VALUE}>{value}</span> : null;
  if (subs) {
    return (
      <td className={CELL} title={title ?? undefined}>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex gap-0.5">
            {subs.map((ok, index) => (
              <ProbeDot
                key={index}
                size="sm"
                state={ok ? 'ok' : 'down'}
                title={subTitle?.(index)}
              />
            ))}
          </span>
          {text}
        </span>
      </td>
    );
  }
  return (
    <td className={CELL} title={title ?? undefined}>
      <span className="inline-flex items-center gap-1.5">
        {state && <ProbeDot state={state} />}
        {icon}
        {text}
        {!value && (state === null || state === 'na') && (
          <span className="text-xs text-dark-500">—</span>
        )}
      </span>
    </td>
  );
}

/** Симка оператора в строке: иконка, имя, округ, «без БС». Вставлять в кнопку или заголовок строки. */
export function UnitBadge({ label, noBs }: { label: UnitLabel; noBs: boolean }) {
  const { t } = useTranslation();
  return (
    <>
      <OperatorIcon operator={label.code} className="h-4 w-4 rounded" />
      <span className="font-medium text-dark-100">{label.name}</span>
      {label.region && (
        <span className="rounded bg-success-500/15 px-1 text-[10px] font-bold tracking-wide text-success-400">
          {label.region}
        </span>
      )}
      {noBs && (
        <span className="rounded border border-warning-500/60 px-1 text-[9px] font-bold text-warning-400">
          {t('admin.reachability.result.noBs')}
        </span>
      )}
    </>
  );
}

export interface LegRowProps {
  leg: Leg;
  label: UnitLabel;
  cells: ReadonlyArray<ResultCellProps & { key: string }>;
  /** Есть что раскрыть (диагноз): строка — кнопка. Без onToggle строка просто строка. */
  open?: boolean;
  onToggle?: () => void;
}

/** Строка симки: оператор с округом, ячейки по столбцам, вердикт. */
export function LegRow({ leg, label, cells, open = false, onToggle }: LegRowProps) {
  const badge = <UnitBadge label={label} noBs={leg.dpi === 'off'} />;
  return (
    <tr
      className={cn(
        ROW_BORDER,
        onToggle && 'cursor-pointer hover:bg-dark-800/40',
        open && 'bg-dark-800/40',
      )}
      onClick={onToggle}
    >
      <td className={TABLE_STYLES.unitCell}>
        {onToggle ? (
          <button type="button" aria-expanded={open} className="flex items-center gap-2 text-left">
            {badge}
          </button>
        ) : (
          <span className="flex items-center gap-2">{badge}</span>
        )}
      </td>
      {cells.map(({ key, ...cell }) => (
        <ValueCell key={key} {...cell} />
      ))}
      <td className={CELL}>
        <VerdictBadge verdict={leg.verdict} matches={leg.matches_expectation} />
      </td>
    </tr>
  );
}

/** Раскрытая строка: диагноз словами. Сырых ответов людям не показываем. */
export function DetailsRow({ span, note }: { span: number; note: string }) {
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
