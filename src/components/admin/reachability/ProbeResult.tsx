import { Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { GroupRow, LegRow, ResultTable, tableSpan } from './ResultTable';
import { type ProbeName, groupLegsByTarget, probeCells, probeColumns } from './probeCells';
import { targetLabel, unitLabel } from './unitLabel';
import { useUnits } from './useUnits';

/**
 * Таблица результата проб как в оригинале bsbord: строки — симки операторов, столбцы — пробы
 * ICMP · TCP · SNI · HTTP с точкой и значением, плюс наш вердикт «как ожидалось».
 * Несколько целей — группами. Сырых ответов нет: людям они не нужны.
 */
export function ProbeResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const probes = useMemo(() => probeColumns(job), [job]);
  const groups = useMemo(() => groupLegsByTarget(job.legs), [job.legs]);

  if (job.legs.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const sniCount = Math.max(1, job.sni_hosts.length);
  const columnTitle = (probe: ProbeName): string => {
    if (probe === 'sni' && sniCount > 1) {
      return t('admin.reachability.result.sniMulti', { count: sniCount });
    }
    const key = `admin.reachability.probes.${probe}`;
    const title = t(key);
    return title === key ? probe.toUpperCase() : title;
  };
  const columns = probes.map((probe) => ({ key: probe, title: columnTitle(probe) }));
  const span = tableSpan(columns);
  const label = (targetKey: string) => targetLabel(job, targetKey) ?? targetKey;

  return (
    <div className="space-y-3">
      <ResultTable columns={columns}>
        {groups.map((group) => (
          <Fragment key={group.targetKey}>
            {groups.length > 1 && (
              <GroupRow span={span} label={label(group.targetKey)} targetKey={group.targetKey} />
            )}
            {group.legs.map((leg) => (
              <LegRow
                key={leg.id}
                leg={leg}
                label={unitLabel(leg, catalog)}
                cells={probeCells(leg, probes).map((cell) => ({
                  key: cell.probe,
                  state: cell.state,
                  value: cell.value,
                  subs: cell.subs,
                  subTitle: (index: number) => `SNI #${index + 1}`,
                }))}
              />
            ))}
          </Fragment>
        ))}
      </ResultTable>
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
