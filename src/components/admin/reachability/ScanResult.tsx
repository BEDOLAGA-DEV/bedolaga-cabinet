import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { CopyIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { useNotify } from '@/platform/hooks/useNotify';
import { copyToClipboard } from '@/utils/clipboard';
import { OperatorIcon } from './OperatorIcon';
import { type ScanUnitProbe, scanSummary } from './resultShapes';
import { unitLabel } from './unitLabel';
import { useUnits } from './useUnits';

/** Что симка увидела у адреса — словами: «пинг · порт · SNI имя». */
function probeWords(t: (key: string) => string, probe: ScanUnitProbe): string {
  const base = 'admin.reachability.scan';
  const parts: string[] = [];
  if (probe.icmp) parts.push(t(`${base}.probeIcmp`));
  if (probe.tcp) parts.push(t(`${base}.probeTcp`));
  for (const [host, ok] of Object.entries(probe.sni)) {
    if (ok) parts.push(`${t(`${base}.probeSni`)} ${host}`);
  }
  return parts.join(' · ');
}

/**
 * Результат скана подсети словами: «Живых адресов: 12 из 256», операторы с числом находок,
 * список адресов (их можно скопировать), по желанию — кто из операторов что увидел.
 */
export function ScanResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const summary = useMemo(() => scanSummary(job.result), [job.result]);
  const [perUnit, setPerUnit] = useState(false);
  const notify = useNotify();
  const { data: catalog = [] } = useUnits();
  const base = 'admin.reachability.scan';

  if (!summary) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const units = Object.keys(summary.aliveByUnit);
  const label = (opKey: string) => {
    const item = unitLabel({ op_key: opKey, operator: null, region: null }, catalog);
    return `${item.name} ${item.region}`;
  };
  const copyList = async () => {
    try {
      await copyToClipboard(summary.ips.map((item) => item.ip).join('\n'));
      notify.success(t(`${base}.copied`));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-dark-100">
          <span className="font-semibold">{t(`${base}.alive`, { count: summary.upN })}</span>{' '}
          <span className="text-dark-400">{t(`${base}.ofTotal`, { total: summary.total })}</span>
        </p>
        {summary.ips.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            leftIcon={<CopyIcon className="h-4 w-4" />}
            onClick={copyList}
          >
            {t(`${base}.copy`)}
          </Button>
        )}
      </div>

      {units.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[13px] font-semibold text-dark-400">{t(`${base}.byOperator`)}</p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {units.map((opKey) => {
              const item = unitLabel({ op_key: opKey, operator: null, region: null }, catalog);
              return (
                <li
                  key={opKey}
                  className="flex items-center gap-2 rounded-lg border border-dark-700/50 px-2.5 py-1 text-dark-200"
                >
                  <OperatorIcon operator={item.code} className="h-4 w-4 rounded" />
                  <span>
                    {item.name} <span className="text-xs text-dark-400">{item.region}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-dark-50">
                    {summary.aliveByUnit[opKey]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {summary.ips.length > 0 && (
        <div className="space-y-2">
          {units.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-dark-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-dark-600 accent-accent-500"
                checked={perUnit}
                onChange={(event) => setPerUnit(event.target.checked)}
              />
              {t(`${base}.perUnit`)}
            </label>
          )}
          <div className="max-h-96 overflow-auto rounded-xl border border-dark-700/50 bg-dark-900/60 p-3">
            <ul className="space-y-1.5 text-xs">
              {summary.ips.map((item) => (
                <li key={item.ip} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <span className="font-mono text-dark-100">{item.ip}</span>
                  {perUnit &&
                    Object.entries(item.units).map(([opKey, probe]) => (
                      <span key={opKey} className="text-dark-400">
                        {label(opKey)}: {probeWords(t, probe)}
                      </span>
                    ))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
