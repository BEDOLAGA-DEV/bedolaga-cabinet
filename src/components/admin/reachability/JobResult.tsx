import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { ProbeResult } from './ProbeResult';
import { ScanResult } from './ScanResult';
import { VlessResult } from './VlessResult';
import { formatKopeks } from './money';

export function JobResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const refunded = job.refunded_kopeks
    ? ` (${t('admin.reachability.result.refunded', { amount: formatKopeks(job.refunded_kopeks) })})`
    : '';
  return (
    <div className="space-y-3">
      <p className="text-sm text-dark-300">
        {t('admin.reachability.result.cost')}:{' '}
        <span className="font-semibold text-dark-50">{formatKopeks(job.cost_kopeks)}</span>
        {refunded}
        {!job.estimate_is_exact && job.cost_kopeks !== null && (
          <span className="ml-1 text-xs text-warning-400">≈</span>
        )}
      </p>
      {job.kind === 'probe' && <ProbeResult job={job} />}
      {job.kind === 'vless' && <VlessResult job={job} />}
      {job.kind === 'scan' && <ScanResult job={job} />}
    </div>
  );
}
