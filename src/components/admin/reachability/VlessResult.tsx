import { Fragment, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job, Leg } from '@/api/reachability';
import { XrayIcon } from '@/components/icons';
import { DetailsRow, GroupRow, LegRow, ResultTable, tableSpan } from './ResultTable';
import { groupLegsByTarget } from './probeCells';
import { vlessLegView } from './resultShapes';
import { targetLabel, unitLabel } from './unitLabel';
import { useReachabilityStatus } from './useReachabilityStatus';
import { useUnits } from './useUnits';
import { VLESS_COLUMNS, type VlessColumn, vlessCells } from './vlessCells';

const COLUMN_KEYS: Record<VlessColumn, string> = {
  tunnel: 'tunnel',
  targets: 'targets',
  latency: 'latency',
  core: 'core',
  reason: 'failReason',
};

/**
 * Результат VLESS-теста в том же стиле, что таблица проб: строки — симки операторов,
 * столбцы — туннель · цели · задержка · Xray · причина, справа наш вердикт. Несколько серверов —
 * группами. Тап по строке — диагноз словами и сырой ответ.
 */
export function VlessResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const { data: status } = useReachabilityStatus();
  const groups = useMemo(() => groupLegsByTarget(job.legs), [job.legs]);
  const [expanded, setExpanded] = useState<Leg | null>(null);

  if (job.legs.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const columns = VLESS_COLUMNS.map((key) => ({
    key,
    title: t(`admin.reachability.result.${COLUMN_KEYS[key]}`),
  }));
  const span = tableSpan(columns);
  const toggle = (leg: Leg) => setExpanded(expanded?.id === leg.id ? null : leg);
  const groupLabel = (group: { targetKey: string; legs: Leg[] }): string =>
    targetLabel(job, group.targetKey) ?? vlessLegView(group.legs[0]).server;

  return (
    <ResultTable columns={columns}>
      {groups.map((group) => (
        <Fragment key={group.targetKey}>
          {groups.length > 1 && (
            <GroupRow span={span} label={groupLabel(group)} targetKey={group.targetKey} />
          )}
          {group.legs.map((leg) => {
            const view = vlessLegView(leg);
            const open = expanded?.id === leg.id;
            const cells = vlessCells(view, status?.cores).map((cell) => ({
              ...cell,
              icon:
                cell.key === 'core' && cell.value ? (
                  <XrayIcon className="h-3.5 w-3.5 text-dark-400" aria-hidden="true" />
                ) : undefined,
              subTitle: cell.key === 'targets' ? (index: number) => `#${index + 1}` : undefined,
            }));
            return (
              <Fragment key={leg.id}>
                <LegRow
                  leg={leg}
                  label={unitLabel(leg, catalog, view.operatorName)}
                  cells={cells}
                  open={open}
                  onToggle={() => toggle(leg)}
                />
                {open && (
                  <DetailsRow
                    span={span}
                    label={targetLabel(job, leg.target_key) ?? view.server}
                    opKey={leg.op_key}
                    note={view.diagnosis}
                    raw={leg.raw}
                  />
                )}
              </Fragment>
            );
          })}
        </Fragment>
      ))}
    </ResultTable>
  );
}
