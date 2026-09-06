import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job, Leg, Unit } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { OperatorIcon } from './OperatorIcon';
import { ProbeDot } from './ProbeDot';
import { VerdictBadge } from './VerdictBadge';
import { operatorCode } from './operatorIcons';
import { type ProbeName, groupLegsByTarget, probeCells, probeColumns } from './probeCells';
import { useUnits } from './useUnits';

function labelFor(job: Job, targetKey: string): string {
  return job.targets.find((target) => target.target_key === targetKey)?.label ?? targetKey;
}

interface UnitLabel {
  code: string;
  name: string;
  region: string;
}

function unitLabel(leg: Leg, catalog: Unit[]): UnitLabel {
  const unit = catalog.find((item) => item.op_key === leg.op_key);
  const code = leg.operator ?? unit?.operator ?? operatorCode(leg.op_key);
  const [, region = ''] = leg.op_key.split('|');
  return {
    code,
    name: unit?.name ?? code,
    region: (leg.region ?? unit?.region ?? region).toUpperCase(),
  };
}

const CELL = 'px-2 py-1.5 text-center align-middle';

/**
 * Таблица результата как в оригинале bsbord: строки — симки операторов (иконка, округ,
 * «без БС»), столбцы — пробы ICMP · TCP · SNI · HTTP с точкой и значением, плюс наш
 * вердикт «как ожидалось». Несколько целей — группами. Тап по строке — сырой ответ.
 */
export function ProbeResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const columns = useMemo(() => probeColumns(job), [job]);
  const groups = useMemo(() => groupLegsByTarget(job.legs), [job.legs]);
  const [expanded, setExpanded] = useState<Leg | null>(null);

  if (job.legs.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const sniCount = Math.max(1, job.sni_hosts.length);
  const columnTitle = (probe: ProbeName): string =>
    probe === 'sni' && sniCount > 1
      ? t('admin.reachability.result.sniMulti', { count: sniCount })
      : t(`admin.reachability.probes.${probe}`) === `admin.reachability.probes.${probe}`
        ? probe.toUpperCase()
        : t(`admin.reachability.probes.${probe}`);
  const toggle = (leg: Leg) => setExpanded(expanded?.id === leg.id ? null : leg);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-dark-700/60">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr className="bg-dark-900/60 text-[11px] uppercase tracking-wide text-dark-400">
              <th className="px-3 py-2 text-left font-medium">
                {t('admin.reachability.result.operator')}
              </th>
              {columns.map((probe) => (
                <th key={probe} className="px-2 py-2 text-center font-medium">
                  {columnTitle(probe)}
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium">
                {t('admin.reachability.result.verdict')}
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.targetKey}>
                {groups.length > 1 && (
                  <tr className="border-t border-dark-700/60 bg-dark-900/30">
                    <td colSpan={columns.length + 2} className="px-3 py-1.5">
                      <span className="text-sm font-medium text-dark-100">
                        {labelFor(job, group.targetKey)}
                      </span>
                      <span className="ml-2 font-mono text-xs text-dark-400">
                        {group.targetKey}
                      </span>
                    </td>
                  </tr>
                )}
                {group.legs.map((leg) => {
                  const unit = unitLabel(leg, catalog);
                  const cells = probeCells(leg, columns);
                  const open = expanded?.id === leg.id;
                  return (
                    <Fragment key={leg.id}>
                      <tr
                        className={cn(
                          'cursor-pointer border-t border-dark-700/60 hover:bg-dark-800/40',
                          open && 'bg-dark-800/40',
                        )}
                        onClick={() => toggle(leg)}
                      >
                        <td className="px-3 py-1.5 align-middle">
                          <button
                            type="button"
                            aria-expanded={open}
                            className="flex items-center gap-2 text-left"
                          >
                            <OperatorIcon operator={unit.code} className="h-4 w-4 rounded" />
                            <span className="font-medium text-dark-100">{unit.name}</span>
                            {unit.region && (
                              <span className="rounded bg-success-500/15 px-1 text-[10px] font-bold tracking-wide text-success-400">
                                {unit.region}
                              </span>
                            )}
                            {leg.dpi === 'off' && (
                              <span className="rounded border border-warning-500/60 px-1 text-[9px] font-bold text-warning-400">
                                {t('admin.reachability.result.noBs')}
                              </span>
                            )}
                          </button>
                        </td>
                        {cells.map((cell) => (
                          <td key={cell.probe} className={CELL}>
                            {cell.subs ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="inline-flex gap-0.5">
                                  {cell.subs.map((ok, index) => (
                                    <ProbeDot
                                      // biome-ignore lint/suspicious/noArrayIndexKey: порядок имён SNI фиксирован
                                      key={index}
                                      size="sm"
                                      state={ok ? 'ok' : 'down'}
                                      title={`SNI #${index + 1}`}
                                    />
                                  ))}
                                </span>
                                <span className="font-mono text-[11px] text-dark-300">
                                  {cell.value}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5">
                                <ProbeDot state={cell.state} />
                                {cell.value && (
                                  <span className="font-mono text-[11px] text-dark-300">
                                    {cell.value}
                                  </span>
                                )}
                                {cell.state === 'na' && !cell.value && (
                                  <span className="text-xs text-dark-500">—</span>
                                )}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className={CELL}>
                          <VerdictBadge verdict={leg.verdict} matches={leg.matches_expectation} />
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-dark-700/60 bg-dark-950/40">
                          <td colSpan={columns.length + 2} className="px-3 py-2">
                            <p className="mb-1 text-xs text-dark-400">
                              {t('admin.reachability.result.raw')}: {labelFor(job, leg.target_key)}{' '}
                              · <span className="font-mono">{leg.op_key}</span>
                            </p>
                            <pre className="max-h-80 overflow-auto text-xs text-dark-200">
                              {JSON.stringify(leg.raw, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {job.sni_hosts.length > 0 && (
        <p className="break-all text-xs text-dark-400">
          {t('admin.reachability.result.sniList', {
            names: job.sni_hosts.map((name, index) => `${index + 1} ${name}`).join(' · '),
          })}
        </p>
      )}
    </div>
  );
}
