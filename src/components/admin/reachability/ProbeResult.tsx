import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { type ResultGroup, ResultTable } from './ResultTable';
import { type ProbeName, groupLegsByTarget, probeCells, probeColumns } from './probeCells';
import { targetLabel, unitLabel } from './unitLabel';
import { useUnits } from './useUnits';

/**
 * Результат проб: строки — симки операторов, сначала вердикт, потом пробы ICMP · TCP · SNI · HTTP
 * с точкой и значением. Несколько целей — группами. Сырых ответов нет: людям они не нужны.
 */
export function ProbeResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const probes = useMemo(() => probeColumns(job), [job]);

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
  const groups: ResultGroup[] = groupLegsByTarget(job.legs).map((group) => ({
    targetKey: group.targetKey,
    label: targetLabel(job, group.targetKey) ?? group.targetKey,
    rows: group.legs.map((leg) => ({
      leg,
      label: unitLabel(leg, catalog),
      cells: probeCells(leg, probes).map((cell) => ({
        key: cell.probe,
        state: cell.state,
        value: cell.value,
        subs: cell.subs,
        subTitle: (index: number) => `SNI #${index + 1}`,
      })),
    })),
  }));

  return (
    <div className="space-y-3">
      <ResultTable
        columns={columns}
        groups={groups}
        listLabel={t('admin.reachability.result.list')}
      />
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
