import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Summary, SummaryCell, SummaryRow } from '@/api/reachability';
import { TABLE_STYLES, UnitBadge } from './ResultTable';
import { VerdictBadge } from './VerdictBadge';
import { buildReachabilityLink } from './deepLink';
import { relativeAge } from './relativeAge';
import { unitLabel } from './unitLabel';
import { verdictLabelKey } from './verdict';

/**
 * Матрица на узких экранах — в стиле таблиц результата: строки — симки операторов с округом,
 * столбцы — хосты (их мало), в ячейке вердикт-бейдж, тап ведёт в задачу. Десктопная матрица
 * «хост × симка» точками сюда не помещается: симок в эфире десятки.
 */
export function UnitsByHostTable({ summary }: { summary: Summary }) {
  const { t, i18n } = useTranslation();
  const cellTitle = (row: SummaryRow, cell: SummaryCell): string =>
    `${row.label} · ${t(verdictLabelKey(cell.verdict))} · ${relativeAge(cell.checked_at, i18n.language)}`;

  return (
    <div className={TABLE_STYLES.wrap}>
      <table className={TABLE_STYLES.table}>
        <thead>
          <tr className={TABLE_STYLES.head}>
            <th className={TABLE_STYLES.thFirst}>{t('admin.reachability.result.operator')}</th>
            {summary.rows.map((row) => (
              <th key={row.target_key} className={TABLE_STYLES.th} title={row.target_key}>
                <span className="block max-w-[9rem] truncate normal-case">{row.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {summary.units.map((unit) => (
            <tr key={unit.op_key} className={TABLE_STYLES.row}>
              <td className={TABLE_STYLES.unitCell}>
                <span className="flex items-center gap-2">
                  <UnitBadge label={unitLabel(unit, summary.units)} noBs={unit.dpi === 'off'} />
                  {!unit.in_catalog && (
                    <span className="text-xs text-dark-400">
                      {t('admin.reachability.summary.notInCatalog')}
                    </span>
                  )}
                </span>
              </td>
              {summary.rows.map((row) => {
                const cell = row.cells[unit.op_key];
                return (
                  <td key={row.target_key} className={TABLE_STYLES.cell}>
                    {cell ? (
                      <Link
                        to={buildReachabilityLink({ jobId: cell.job_id })}
                        title={cellTitle(row, cell)}
                        className="inline-block"
                      >
                        <VerdictBadge verdict={cell.verdict} matches={cell.matches_expectation} />
                      </Link>
                    ) : (
                      <span className="text-xs text-dark-500">—</span>
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
