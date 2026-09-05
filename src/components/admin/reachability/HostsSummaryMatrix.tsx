import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Summary, Unit } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { REACHABILITY_PATH } from './deepLink';
import { relativeAge } from './relativeAge';
import { toneClasses, verdictLabelKey, verdictTone } from './verdict';

interface HostsSummaryMatrixProps {
  summary: Summary;
}

function unitHeader(unit: Unit): string {
  return unit.operator ? `${unit.operator} · ${unit.region}` : unit.op_key;
}

export function HostsSummaryMatrix({ summary }: HostsSummaryMatrixProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl border border-dark-700/60">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="bg-dark-900/60 text-xs text-dark-400">
            <th className="sticky left-0 z-10 bg-dark-900/60 p-2 text-left font-medium uppercase tracking-wide">
              {t('admin.reachability.targets.hosts')}
            </th>
            {summary.units.map((unit) => (
              <th key={unit.op_key} className="p-2 text-center font-normal">
                <span className="block">{unitHeader(unit)}</span>
                <span className="block font-mono text-[10px] text-dark-500">{unit.op_key}</span>
                {!unit.in_catalog && (
                  <span className="block text-[10px] text-warning-400">
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
              <th className="sticky left-0 z-10 bg-dark-800 p-2 text-left font-medium text-dark-100">
                <span className="block truncate">{row.label}</span>
                <span className="block font-mono text-xs text-dark-400">{row.target_key}</span>
                <span className="mt-1 flex flex-wrap gap-1 text-[10px]">
                  <span className="rounded-md bg-dark-700 px-1.5 py-0.5 text-dark-300">
                    {t(`admin.reachability.purpose.${row.purpose}`)}
                    {row.purpose_guessed ? ` · ${t('admin.reachability.purpose.guessed')}` : ''}
                  </span>
                  {!row.in_panel && (
                    <span className="rounded-md bg-warning-500/15 px-1.5 py-0.5 text-warning-400">
                      {t('admin.reachability.summary.notInPanel')}
                    </span>
                  )}
                </span>
              </th>
              {summary.units.map((unit) => {
                const cell = row.cells[unit.op_key];
                return (
                  <td key={unit.op_key} className="p-1">
                    {cell ? (
                      <Link
                        to={`${REACHABILITY_PATH}?tab=history&job=${cell.job_id}`}
                        title={t('admin.reachability.summary.openJob')}
                        className={cn(
                          'block rounded-lg border px-2 py-1 text-center text-xs',
                          toneClasses(verdictTone(cell.verdict, cell.matches_expectation)),
                        )}
                      >
                        {t(verdictLabelKey(cell.verdict))}
                        <span className="block text-[10px] opacity-70">
                          {relativeAge(cell.checked_at, i18n.language)}
                        </span>
                      </Link>
                    ) : (
                      <span className="block rounded-lg border border-dashed border-dark-700 px-2 py-1 text-center text-xs text-dark-500">
                        —
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
