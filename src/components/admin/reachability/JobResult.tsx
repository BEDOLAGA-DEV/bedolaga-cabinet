import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { ProbeResult } from './ProbeResult';
import { JobHeadline } from './JobHeadline';
import { ScanResult } from './ScanResult';
import { VlessResult } from './VlessResult';
import { formatCredits, formatMoney } from './money';

/** Результат задачи: ответ словами, списание, потом таблица по симкам. */
export function JobResult({ job }: { job: Job }) {
  const { t } = useTranslation();
  const refunded = job.refunded_kopeks
    ? ` (${t('admin.reachability.result.refunded', { amount: formatCredits(job.refunded_kopeks) })})`
    : '';
  return (
    <div className="space-y-3">
      <JobHeadline job={job} />
      <p className="text-xs text-dark-400">
        {t('admin.reachability.result.cost')}:{' '}
        <span className="text-dark-200">{formatMoney(job.cost_kopeks)}</span>
        {refunded}
        {!job.estimate_is_exact && job.cost_kopeks !== null && (
          <span className="ml-1 text-warning-400">({t('admin.reachability.result.estimate')})</span>
        )}
      </p>
      {job.kind === 'probe' && <ProbeResult job={job} />}
      {job.kind === 'vless' && <VlessResult job={job} />}
      {job.kind === 'scan' && <ScanResult job={job} />}
    </div>
  );
}
