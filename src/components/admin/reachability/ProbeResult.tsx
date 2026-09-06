import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job, Leg } from '@/api/reachability';
import { DetailsRow, GroupRow, LegRow, ResultTable, tableSpan } from './ResultTable';
import { type ProbeName, groupLegsByTarget, probeCells, probeColumns } from './probeCells';
import { targetLabel, unitLabel } from './unitLabel';
import { useUnits } from './useUnits';

/**
 * Таблица результата проб как в оригинале bsbord: строки — симки операторов, столбцы — пробы
 * ICMP · TCP · SNI · HTTP с точкой и значением, плюс наш вердикт «как ожидалось».
 * Несколько целей — группами. Тап по строке — сырой ответ.
 */
export function ProbeResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const probes = useMemo(() => probeColumns(job), [job]);
  const groups = useMemo(() => groupLegsByTarget(job.legs), [job.legs]);
  const [expanded, setExpanded] = useState<Leg | null>(null);

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
  const toggle = (leg: Leg) => setExpanded(expanded?.id === leg.id ? null : leg);
  const label = (targetKey: string) => targetLabel(job, targetKey) ?? targetKey;

  return (
    <div className="space-y-3">
      <ResultTable columns={columns}>
        {groups.map((group) => (
          <Fragment key={group.targetKey}>
            {groups.length > 1 && (
              <GroupRow span={span} label={label(group.targetKey)} targetKey={group.targetKey} />
            )}
            {group.legs.map((leg) => {
              const open = expanded?.id === leg.id;
              const cells = probeCells(leg, probes).map((cell) => ({
                key: cell.probe,
                state: cell.state,
                value: cell.value,
                subs: cell.subs,
                subTitle: (index: number) => `SNI #${index + 1}`,
              }));
              return (
                <Fragment key={leg.id}>
                  <LegRow
                    leg={leg}
                    label={unitLabel(leg, catalog)}
                    cells={cells}
                    open={open}
                    onToggle={() => toggle(leg)}
                  />
                  {open && (
                    <DetailsRow
                      span={span}
                      label={label(leg.target_key)}
                      opKey={leg.op_key}
                      raw={leg.raw}
                    />
                  )}
                </Fragment>
              );
            })}
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
