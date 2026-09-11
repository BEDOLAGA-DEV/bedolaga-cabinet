import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { TABLE_STYLES } from './ResultTable';
import type { GeoRow } from './geoRowsView';
import { TONE_DOT, verdictTone } from './geoVerdicts';

const KEY = 'admin.reachability.geo';

function Verdict({ verdict }: { verdict: string }) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-dark-100">
      <span className={cn('inline-block h-2 w-2 rounded-full', TONE_DOT[verdictTone(verdict)])} />
      {t(`${KEY}.verdicts.${verdict}`, { defaultValue: verdict })}
    </span>
  );
}

/** Цели чипами: `host:port ms`; у туннеля — его подпроверки («IP-проверка», «Google», «YouTube»). */
function Targets({ row }: { row: GeoRow }) {
  const { t } = useTranslation();
  if (row.err) {
    return (
      <span className="text-xs text-dark-400">
        {t(`${KEY}.rows.notChecked`, { reason: row.err })}
      </span>
    );
  }
  const cells = row.tunnel
    ? row.tunnel.checks.map((check) => ({ key: check.name, ok: check.ok, ms: check.ms, err: null }))
    : row.targets;
  return (
    <span className="flex flex-wrap gap-1">
      {cells.map((cell) => (
        <span
          key={cell.key}
          title={cell.err ?? undefined}
          className={cn(
            'rounded-md px-1.5 py-0.5 font-mono text-[11px]',
            cell.ok ? 'bg-success-500/10 text-success-400' : 'bg-error-500/10 text-error-400',
          )}
        >
          {cell.key}
          {cell.ms !== null ? ` ${cell.ms}` : ''}
        </span>
      ))}
    </span>
  );
}

function Speed({ row }: { row: GeoRow }) {
  const { t } = useTranslation();
  if (!row.heavy) return <>—</>;
  const speed = row.heavy.kbps === null ? '—' : t(`${KEY}.rows.kbps`, { value: row.heavy.kbps });
  return <>{row.heavy.froze ? `${speed} · ${t(`${KEY}.rows.froze`)}` : speed}</>;
}

export interface GeoRowsProps {
  rows: readonly GeoRow[];
}

const rowKey = (row: GeoRow) => `${row.region}:${row.city}:${row.provider ?? ''}`;

/** Города списком: город · регион · провайдер · вердикт · задержка · цели; на телефоне — карточки. */
export function GeoRows({ rows }: GeoRowsProps) {
  const { t } = useTranslation();
  if (rows.length === 0) return <p className="text-sm text-dark-400">{t(`${KEY}.rows.empty`)}</p>;
  const latency = (row: GeoRow) =>
    row.latency_ms === null ? '—' : t(`${KEY}.rows.latency`, { value: row.latency_ms });
  const withSpeed = rows.some((row) => row.heavy);
  return (
    <>
      <div className={cn(TABLE_STYLES.wrap, 'hidden md:block')}>
        <table className={TABLE_STYLES.table}>
          <thead className={TABLE_STYLES.head}>
            <tr>
              <th className={TABLE_STYLES.thFirst}>{t(`${KEY}.rows.city`)}</th>
              <th className={TABLE_STYLES.th}>{t(`${KEY}.rows.provider`)}</th>
              <th className={TABLE_STYLES.th}>{t('admin.reachability.result.verdict')}</th>
              <th className={TABLE_STYLES.th}>{t('admin.reachability.result.latency')}</th>
              <th className={TABLE_STYLES.th}>{t('admin.reachability.result.targets')}</th>
              {withSpeed && <th className={TABLE_STYLES.th}>{t(`${KEY}.rows.speed`)}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={TABLE_STYLES.row}>
                <td className={TABLE_STYLES.unitCell}>
                  <span className="block text-sm text-dark-100">{row.city_ru || row.city}</span>
                  <span className="block text-xs text-dark-400">
                    {[row.district, row.region_ru].filter(Boolean).join(' · ')}
                  </span>
                </td>
                <td className={cn(TABLE_STYLES.cell, TABLE_STYLES.value)}>{row.provider ?? '—'}</td>
                <td className={TABLE_STYLES.cell}>
                  <Verdict verdict={row.verdict} />
                </td>
                <td className={cn(TABLE_STYLES.cell, TABLE_STYLES.value)}>{latency(row)}</td>
                <td className={cn(TABLE_STYLES.cell, 'text-left')}>
                  <Targets row={row} />
                </td>
                {withSpeed && (
                  <td className={cn(TABLE_STYLES.cell, TABLE_STYLES.value)}>
                    <Speed row={row} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-xl border border-dark-700/60 bg-dark-900/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-sm font-medium text-dark-100">
                  {row.city_ru || row.city}
                </span>
                <span className="block text-xs text-dark-400">
                  {[row.district, row.region_ru, row.provider].filter(Boolean).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-dark-300">{latency(row)}</span>
            </div>
            <div className="mt-2">
              <Verdict verdict={row.verdict} />
            </div>
            <div className="mt-2">
              <Targets row={row} />
            </div>
            {row.heavy && (
              <div className="mt-2 text-xs text-dark-400">
                <Speed row={row} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
