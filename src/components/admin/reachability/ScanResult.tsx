import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { Button } from '@/components/primitives';
import { copyToClipboard } from '@/utils/clipboard';
import { scanSummary } from './resultShapes';

const COPIED_MS = 2000;

export function ScanResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const summary = useMemo(() => scanSummary(job.result), [job.result]);
  const [perUnit, setPerUnit] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!summary) {
    return <p className="text-sm text-dark-400">{t('admin.reachability.result.empty')}</p>;
  }

  const units = Object.keys(summary.aliveByUnit);
  const copyList = async () => {
    await copyToClipboard(summary.ips.map((item) => item.ip).join('\n'));
    setCopied(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-dark-100">
          <span className="font-semibold">
            {t('admin.reachability.scan.alive', { count: summary.upN })}
          </span>{' '}
          <span className="text-dark-400">
            {t('admin.reachability.scan.ofTotal', { total: summary.total })}
          </span>
        </p>
        {units.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-dark-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-dark-600 accent-accent-500"
              checked={perUnit}
              onChange={(event) => setPerUnit(event.target.checked)}
            />
            {t('admin.reachability.scan.perUnit')}
          </label>
        )}
        {summary.ips.length > 0 && (
          <Button variant="secondary" size="sm" className="ml-auto" onClick={copyList}>
            {copied ? t('admin.reachability.scan.copied') : t('admin.reachability.scan.copy')}
          </Button>
        )}
      </div>

      {units.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-xs">
          {units.map((opKey) => (
            <li
              key={opKey}
              className="rounded-lg border border-dark-700/60 px-2 py-1 text-dark-300"
            >
              <span className="font-mono">{opKey}</span>
              <span className="ml-1 text-dark-100">{summary.aliveByUnit[opKey]}</span>
            </li>
          ))}
        </ul>
      )}

      {summary.ips.length > 0 && (
        <div className="max-h-96 overflow-auto rounded-xl border border-dark-700/60 bg-dark-900 p-3">
          <ul className="space-y-1 font-mono text-xs text-dark-200">
            {summary.ips.map((item) => (
              <li key={item.ip} className="flex flex-wrap gap-2">
                <span>{item.ip}</span>
                {perUnit &&
                  Object.entries(item.units).map(([opKey, probe]) => (
                    <span key={opKey} className="text-dark-400">
                      {opKey}
                      {probe.icmp ? ' icmp' : ''}
                      {probe.tcp ? ' tcp' : ''}
                      {Object.entries(probe.sni)
                        .filter(([, ok]) => ok)
                        .map(([host]) => ` sni:${host}`)
                        .join('')}
                    </span>
                  ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
