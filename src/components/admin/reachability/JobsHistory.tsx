import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { type Job, type JobKind, type JobStatus, reachabilityApi } from '@/api/reachability';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobDetailsSheet } from './JobDetailsSheet';
import { formatKopeks } from './money';
import { relativeAge } from './relativeAge';

const KINDS: JobKind[] = ['probe', 'vless', 'scan'];
const STATUSES: JobStatus[] = ['pending', 'running', 'done', 'failed', 'cancelled'];
const PAGE = 20;
const SHOWN_TARGETS = 2;

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'text-dark-300',
  running: 'text-accent-400',
  done: 'text-success-400',
  failed: 'text-error-400',
  cancelled: 'text-dark-400',
};

function targetsLabel(job: Job, more: (count: number) => string): string {
  const keys = job.targets.map((target) => target.label || target.target_key);
  const shown = keys.slice(0, SHOWN_TARGETS).join(', ');
  return keys.length > SHOWN_TARGETS ? `${shown} ${more(keys.length - SHOWN_TARGETS)}` : shown;
}

export function JobsHistory() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<JobKind | ''>('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [limit, setLimit] = useState(PAGE);
  const jobParam = searchParams.get('job');
  const openJobId = jobParam && /^\d+$/.test(jobParam) ? Number(jobParam) : null;

  const jobs = useQuery({
    queryKey: ['admin-reachability-jobs', kind, status, limit],
    queryFn: () =>
      reachabilityApi.listJobs({
        kind: kind || undefined,
        status: status || undefined,
        offset: 0,
        limit,
      }),
    staleTime: 10_000,
  });

  const openJob = (id: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (id === null) next.delete('job');
    else next.set('job', String(id));
    setSearchParams(next, { replace: true });
  };

  const selectClass =
    'rounded-xl border border-dark-700 bg-dark-900 px-3 py-1.5 text-xs text-dark-100';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value as JobKind | '')}
          aria-label={t('admin.reachability.history.filters.kind')}
          className={selectClass}
        >
          <option value="">
            {t('admin.reachability.history.filters.kind')}:{' '}
            {t('admin.reachability.history.filters.all')}
          </option>
          {KINDS.map((item) => (
            <option key={item} value={item}>
              {t(`admin.reachability.kinds.${item}`)}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as JobStatus | '')}
          aria-label={t('admin.reachability.history.filters.status')}
          className={selectClass}
        >
          <option value="">
            {t('admin.reachability.history.filters.status')}:{' '}
            {t('admin.reachability.history.filters.all')}
          </option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {t(`admin.reachability.history.statuses.${item}`)}
            </option>
          ))}
        </select>
      </div>

      {jobs.isLoading && (
        <SkeletonGroup aria-label={t('admin.reachability.tabs.history')}>
          <Skeleton variant="card" className="h-12 w-full rounded-2xl" />
          <Skeleton variant="card" className="mt-2 h-12 w-full rounded-2xl" />
        </SkeletonGroup>
      )}
      {jobs.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(jobs.error, '')}</p>
      )}
      {jobs.data && jobs.data.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-dark-700/60 p-6 text-center text-sm text-dark-400">
          {t('admin.reachability.history.empty')}
        </p>
      )}

      {jobs.data && jobs.data.items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-dark-700/60">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead>
              <tr className="bg-dark-900/60 text-left text-xs uppercase tracking-wide text-dark-400">
                {(['id', 'kind', 'targets', 'units', 'cost', 'status', 'started'] as const).map(
                  (column) => (
                    <th key={column} className="p-2 font-medium">
                      {t(`admin.reachability.history.columns.${column}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {jobs.data.items.map((job) => (
                <tr
                  key={job.id}
                  onClick={() => openJob(job.id)}
                  className="cursor-pointer border-t border-dark-700/60 hover:bg-dark-800/60"
                >
                  <td className="p-2 font-mono text-xs text-dark-400">#{job.id}</td>
                  <td className="p-2 text-dark-100">{t(`admin.reachability.kinds.${job.kind}`)}</td>
                  <td className="max-w-xs truncate p-2 text-dark-200">
                    {targetsLabel(job, (count) => t('admin.reachability.history.more', { count }))}
                  </td>
                  <td className="p-2 text-dark-300">
                    {(job.units_effective ?? job.units_resolved ?? []).length}
                  </td>
                  <td className="p-2 text-dark-100">{formatKopeks(job.cost_kopeks)}</td>
                  <td className={`p-2 ${STATUS_CLASS[job.status]}`}>
                    {t(`admin.reachability.history.statuses.${job.status}`)}
                  </td>
                  <td className="p-2 text-dark-400">
                    {relativeAge(job.started_at ?? job.created_at, i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jobs.data && jobs.data.total > jobs.data.items.length && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setLimit((current) => current + PAGE)}
          disabled={jobs.isFetching}
        >
          {t('admin.reachability.history.loadMore')}
        </button>
      )}

      <JobDetailsSheet jobId={openJobId} onClose={() => openJob(null)} />
    </div>
  );
}
