import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { XrayIcon } from '@/components/icons';
import { type ResultGroup, ResultTable } from './ResultTable';
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
 * Результат VLESS-теста в том же стиле, что пробы: сначала вердикт, потом туннель · цели ·
 * задержка · Xray · причина словами (код в подсказке). Серверы — группами, диагноз — по тапу.
 */
export function VlessResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const { data: status } = useReachabilityStatus();

  if (job.legs.length === 0) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const columns = VLESS_COLUMNS.map((key) => ({
    key,
    title: t(`admin.reachability.result.${COLUMN_KEYS[key]}`),
  }));
  const groups: ResultGroup[] = groupLegsByTarget(job.legs).map((group) => ({
    targetKey: group.targetKey,
    label: targetLabel(job, group.targetKey) ?? vlessLegView(group.legs[0]).server,
    rows: group.legs.map((leg) => {
      const view = vlessLegView(leg);
      return {
        leg,
        label: unitLabel(leg, catalog, view.operatorName),
        note: view.diagnosis,
        cells: vlessCells(view, status?.cores).map((cell) => ({
          ...cell,
          value:
            cell.key === 'reason' && cell.value
              ? t(`admin.reachability.result.reasons.${cell.value}`, { defaultValue: cell.value })
              : cell.value,
          title:
            cell.key === 'reason'
              ? [cell.title, cell.value].filter(Boolean).join(' · ') || null
              : cell.title,
          icon:
            cell.key === 'core' && cell.value ? (
              <XrayIcon className="h-3.5 w-3.5 text-dark-400" aria-hidden="true" />
            ) : undefined,
          subTitle: cell.key === 'targets' ? (index: number) => `#${index + 1}` : undefined,
        })),
      };
    }),
  }));

  return (
    <ResultTable
      columns={columns}
      groups={groups}
      listLabel={t('admin.reachability.result.list')}
    />
  );
}
