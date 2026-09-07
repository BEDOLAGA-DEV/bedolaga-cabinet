import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { relativeAge } from '../relativeAge';
import { StackedBar } from './StackedBar';
import type { FleetCounts } from './fleet';

interface FleetSummaryProps {
  counts: FleetCounts;
  checkedAt: string | null;
  /** «30 симок на связи» — строка флота из статуса; пустая, если симок нет. */
  unitsLine: string;
}

const LEGEND = [
  { key: 'partial', dot: 'bg-warning-400' },
  { key: 'down', dot: 'bg-error-400' },
  { key: 'unchecked', dot: 'bg-dark-500' },
] as const;

/** Выделить число работающих в предложении: ищем его как отдельное число, не часть другого. */
function highlightNumber(text: string, value: number): ReactNode {
  const token = String(value);
  const match = new RegExp(`(^|\\D)(${token})(?!\\d)`).exec(text);
  if (!match) return text;
  const start = match.index + match[1].length;
  return (
    <>
      {text.slice(0, start)}
      <span className="text-success-400">{token}</span>
      {text.slice(start + token.length)}
    </>
  );
}

/**
 * Первое, что видит человек: «Работают 84 из 100 серверов», полоска по тонам и легенда словами.
 * Никаких таблиц и процентов: остальное расскажет список ниже.
 */
export function FleetSummary({ counts, checkedAt, unitsLine }: FleetSummaryProps) {
  const { t, i18n } = useTranslation();
  const base = 'admin.reachability.fleet';
  const legend = LEGEND.filter((item) => counts[item.key] > 0).map((item) => ({
    ...item,
    text: t(`${base}.legend${item.key[0].toUpperCase()}${item.key.slice(1)}`, {
      count: counts[item.key],
    }),
  }));
  const legendWords = legend.map((item) => item.text).join(' · ');

  let statement: ReactNode;
  if (counts.total === 0) statement = t(`${base}.statementNone`);
  else if (counts.ok === counts.total)
    statement = t(`${base}.statementAllOk`, { total: counts.total });
  else
    statement = highlightNumber(
      t(`${base}.statement`, { ok: counts.ok, total: counts.total }),
      counts.ok,
    );

  const meta = checkedAt
    ? t(`${base}.meta`, { age: relativeAge(checkedAt, i18n.language), units: unitsLine })
    : unitsLine;

  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight text-dark-50 md:text-3xl">
        {statement}
      </h2>
      {counts.total > 0 && (
        <StackedBar
          label={legendWords || t(`${base}.statementAllOk`, { total: counts.total })}
          parts={[
            { count: counts.ok, className: 'bg-success-400' },
            { count: counts.partial, className: 'bg-warning-400' },
            { count: counts.down, className: 'bg-error-400' },
            { count: counts.unchecked, className: 'bg-dark-500' },
          ]}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {legend.map((item) => (
          <span key={item.key} className="flex items-center gap-2 text-sm text-dark-300">
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
            <span>{item.text}</span>
          </span>
        ))}
        {meta && <span className="text-xs text-dark-400">{meta}</span>}
      </div>
    </section>
  );
}
