import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Verdict } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { toneClasses, verdictLabelKey, verdictTone } from './verdict';

export interface VerdictCell {
  key: string;
  label: string;
  /** Код оператора для иконки («mts»). */
  operator?: string | null;
  verdict: Verdict;
  matches: boolean | null;
  /** Мелкая подпись под вердиктом — например, давность проверки. */
  hint?: string;
  /** Если задано — чип ведёт по ссылке, иначе вызывает `onSelect`. */
  to?: string;
}

export interface VerdictRow {
  key: string;
  label: string;
  sub?: string;
  badges?: ReactNode;
  cells: VerdictCell[];
}

interface VerdictChipListProps {
  rows: VerdictRow[];
  onSelect?: (rowKey: string, cellKey: string) => void;
  selectedCell?: string | null;
}

const CHIP =
  'inline-flex min-h-[36px] flex-col items-start rounded-lg border px-2 py-1 text-left text-xs leading-tight';

/** Узкие экраны: вместо матрицы «хост × симка» — список хостов с чипами симок. */
export function VerdictChipList({ rows, onSelect, selectedCell = null }: VerdictChipListProps) {
  const { t } = useTranslation();
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key} className="rounded-xl border border-dark-700/60 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-dark-100">{row.label}</span>
            {row.badges}
          </div>
          {row.sub && <p className="break-all font-mono text-xs text-dark-400">{row.sub}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {row.cells.map((cell) => {
              const body = (
                <>
                  <span className="flex items-center gap-1 font-mono text-[11px] opacity-80">
                    <OperatorIcon operator={cell.operator} className="h-3.5 w-3.5 rounded" />
                    {cell.label}
                  </span>
                  <span className="font-medium">{t(verdictLabelKey(cell.verdict))}</span>
                  {cell.hint && <span className="text-[10px] opacity-70">{cell.hint}</span>}
                </>
              );
              const className = cn(
                CHIP,
                toneClasses(verdictTone(cell.verdict, cell.matches)),
                selectedCell === cell.key && 'ring-2 ring-accent-500/50',
              );
              return cell.to ? (
                <Link key={cell.key} to={cell.to} className={className}>
                  {body}
                </Link>
              ) : (
                <button
                  key={cell.key}
                  type="button"
                  className={className}
                  aria-pressed={selectedCell === cell.key}
                  onClick={() => onSelect?.(row.key, cell.key)}
                >
                  {body}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
