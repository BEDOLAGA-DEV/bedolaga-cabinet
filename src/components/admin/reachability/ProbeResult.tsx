import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job, Leg } from '@/api/reachability';
import { VerdictBadge } from './VerdictBadge';
import { probeMatrix } from './resultShapes';

function labelFor(job: Job, targetKey: string): string {
  return job.targets.find((target) => target.target_key === targetKey)?.label ?? targetKey;
}

export function ProbeResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const matrix = useMemo(() => probeMatrix(job.legs), [job.legs]);
  const [expanded, setExpanded] = useState<Leg | null>(null);

  if (matrix.rows.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-dark-700/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-dark-900/60 text-xs uppercase tracking-wide text-dark-400">
              <th className="sticky left-0 z-10 bg-dark-900/60 p-2 text-left">
                {t('admin.reachability.history.columns.targets')}
              </th>
              {matrix.cols.map((opKey) => (
                <th key={opKey} className="p-2 text-center font-mono text-[11px] normal-case">
                  {opKey}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((targetKey) => (
              <tr key={targetKey} className="border-t border-dark-700/60">
                <th className="sticky left-0 z-10 bg-dark-800 p-2 text-left font-medium text-dark-100">
                  <span className="block">{labelFor(job, targetKey)}</span>
                  <span className="block font-mono text-xs text-dark-400">{targetKey}</span>
                </th>
                {matrix.cols.map((opKey) => {
                  const leg = matrix.cells[targetKey]?.[opKey];
                  return (
                    <td key={opKey} className="p-1 text-center">
                      {leg ? (
                        <button
                          type="button"
                          onClick={() => setExpanded(expanded?.id === leg.id ? null : leg)}
                          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50"
                          aria-expanded={expanded?.id === leg.id}
                        >
                          <VerdictBadge verdict={leg.verdict} matches={leg.matches_expectation} />
                        </button>
                      ) : (
                        <span className="text-dark-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {expanded && (
        <div className="rounded-xl border border-dark-700/60 bg-dark-900 p-3">
          <p className="mb-2 text-xs text-dark-400">
            {t('admin.reachability.result.raw')}: {labelFor(job, expanded.target_key)} ·{' '}
            <span className="font-mono">{expanded.op_key}</span>
          </p>
          <pre className="max-h-80 overflow-auto text-xs text-dark-200">
            {JSON.stringify(expanded.raw, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
