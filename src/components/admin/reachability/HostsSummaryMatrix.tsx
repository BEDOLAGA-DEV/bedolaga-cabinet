import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Summary, Unit } from '@/api/reachability';
import { OperatorIcon } from './OperatorIcon';
import { ProbeDot } from './ProbeDot';
import { PurposeChip } from './PurposeChip';
import { type VerdictRow, VerdictChipList } from './VerdictChipList';
import { buildReachabilityLink } from './deepLink';
import type { CellState } from './probeCells';
import { relativeAge } from './relativeAge';
import { type Tone, verdictLabelKey, verdictTone } from './verdict';

interface HostsSummaryMatrixProps {
  summary: Summary;
}

const TONE_TO_STATE: Record<Tone, CellState> = {
  success: 'ok',
  error: 'down',
  warning: 'warn',
  neutral: 'na',
};

function unitHeader(unit: Unit): string {
  return unit.operator ? `${unit.name || unit.operator} · ${unit.region}` : unit.op_key;
}

function jobLink(jobId: number): string {
  return buildReachabilityLink({ jobId });
}

/**
 * Матрица «хост × симка» точками, как таблицы оригинала: иконка оператора и округ в шапке,
 * в ячейке цветная точка (соответствие ожиданию), подробности — во всплывающей подсказке,
 * тап ведёт в задачу. На узких экранах — список чипов.
 */
export function HostsSummaryMatrix({ summary }: HostsSummaryMatrixProps) {
  const { t, i18n } = useTranslation();

  const rows = useMemo<VerdictRow[]>(
    () =>
      summary.rows.map((row) => ({
        key: row.target_key,
        label: row.label,
        sub: row.target_key,
        badges: (
          <>
            <PurposeChip purpose={row.purpose} guessed={row.purpose_guessed} />
            {!row.in_panel && (
              <span className="rounded-md bg-warning-500/15 px-1.5 py-0.5 text-[10px] text-warning-400">
                {t('admin.reachability.summary.notInPanel')}
              </span>
            )}
          </>
        ),
        cells: summary.units.flatMap((unit) => {
          const cell = row.cells[unit.op_key];
          return cell
            ? [
                {
                  key: unit.op_key,
                  label: unitHeader(unit),
                  operator: unit.operator,
                  verdict: cell.verdict,
                  matches: cell.matches_expectation,
                  hint: relativeAge(cell.checked_at, i18n.language),
                  to: jobLink(cell.job_id),
                },
              ]
            : [];
        }),
      })),
    [summary, t, i18n.language],
  );

  return (
    <>
      <div className="md:hidden">
        <VerdictChipList rows={rows} />
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-dark-700/60 md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-dark-900/60 text-[11px] text-dark-400">
              <th className="sticky left-0 z-10 bg-dark-900/60 px-3 py-2 text-left font-medium uppercase tracking-wide">
                {t('admin.reachability.targets.hosts')}
              </th>
              {summary.units.map((unit) => (
                <th
                  key={unit.op_key}
                  title={`${unitHeader(unit)}${unit.dpi === 'off' ? ` · ${t('admin.reachability.result.noBs')}` : ''}`}
                  className="px-1 py-2 text-center font-normal"
                >
                  <OperatorIcon operator={unit.operator} className="mx-auto h-4 w-4 rounded" />
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide">
                    {unit.region || unit.op_key.split('|')[1] || ''}
                  </span>
                  {unit.dpi === 'off' && (
                    <span className="block text-[8px] font-bold text-warning-400">
                      {t('admin.reachability.result.noBs')}
                    </span>
                  )}
                  {!unit.in_catalog && (
                    <span className="block text-[8px] text-warning-400">
                      {t('admin.reachability.summary.notInCatalog')}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.target_key} className="border-t border-dark-700/60">
                <th className="sticky left-0 z-10 bg-dark-800 px-3 py-2 text-left font-medium text-dark-100">
                  <span className="block truncate">{row.label}</span>
                  <span className="block font-mono text-xs text-dark-400">{row.target_key}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <PurposeChip purpose={row.purpose} guessed={row.purpose_guessed} />
                    {!row.in_panel && (
                      <span className="rounded-md bg-warning-500/15 px-1.5 py-0.5 text-[10px] text-warning-400">
                        {t('admin.reachability.summary.notInPanel')}
                      </span>
                    )}
                  </span>
                </th>
                {summary.units.map((unit) => {
                  const cell = row.cells[unit.op_key];
                  if (!cell) {
                    return (
                      <td key={unit.op_key} className="px-1 py-2 text-center">
                        <ProbeDot state="na" />
                      </td>
                    );
                  }
                  const tone = verdictTone(cell.verdict, cell.matches_expectation);
                  const title = `${unitHeader(unit)} · ${t(verdictLabelKey(cell.verdict))} · ${relativeAge(cell.checked_at, i18n.language)}`;
                  return (
                    <td key={unit.op_key} className="px-1 py-2 text-center">
                      <Link
                        to={jobLink(cell.job_id)}
                        title={title}
                        aria-label={title}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-dark-700/40"
                      >
                        <ProbeDot state={TONE_TO_STATE[tone]} />
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
