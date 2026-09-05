import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { type Job, type JobKind, type JobStatus, reachabilityApi } from '@/api/reachability';
import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobDetailsModal } from './JobDetailsModal';
import { formatCredits } from './money';
import { relativeAge } from './relativeAge';

const KINDS: JobKind[] = ['probe', 'vless', 'scan'];
const STATUSES: JobStatus[] = ['pending', 'running', 'done', 'failed', 'cancelled'];
const PAGE = 20;
const SHOWN_TARGETS = 2;
const COLUMNS = ['id', 'kind', 'targets', 'units', 'cost', 'status', 'started'] as const;

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'bg-dark-700/60 text-dark-300',
  running: 'bg-accent-500/15 text-accent-400',
  done: 'bg-success-500/15 text-success-400',
  failed: 'bg-error-500/15 text-error-400',
  cancelled: 'bg-dark-700/60 text-dark-400',
};

function targetsLabel(job: Job, more: (count: number) => string): string {
  const keys = job.targets.map((target) => target.label || target.target_key);
  const shown = keys.slice(0, SHOWN_TARGETS).join(', ');
  return keys.length > SHOWN_TARGETS ? `${shown} ${more(keys.length - SHOWN_TARGETS)}` : shown;
}

function unitsCount(job: Job): number {
  return (job.units_effective ?? job.units_resolved ?? []).length;
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

  const more = (count: number) => t('admin.reachability.history.more', { count });
  const statusChip = (job: Job) => (
    <span
      className={cn(
        'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
        STATUS_CLASS[job.status],
      )}
    >
      {t(`admin.reachability.history.statuses.${job.status}`)}
    </span>
  );
  const age = (job: Job) => relativeAge(job.started_at ?? job.created_at, i18n.language);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <label className="sm:w-48">
          <span className="sr-only">{t('admin.reachability.history.filters.kind')}</span>
          <DropdownSelect
            value={kind}
            onChange={(value) => setKind(value as JobKind | '')}
            options={[
              {
                value: '',
                label: `${t('admin.reachability.history.filters.kind')}: ${t('admin.reachability.history.filters.all')}`,
              },
              ...KINDS.map((item) => ({
                value: item,
                label: t(`admin.reachability.kinds.${item}`),
              })),
            ]}
          />
        </label>
        <label className="sm:w-48">
          <span className="sr-only">{t('admin.reachability.history.filters.status')}</span>
          <DropdownSelect
            value={status}
            onChange={(value) => setStatus(value as JobStatus | '')}
            options={[
              {
                value: '',
                label: `${t('admin.reachability.history.filters.status')}: ${t('admin.reachability.history.filters.all')}`,
              },
              ...STATUSES.map((item) => ({
                value: item,
                label: t(`admin.reachability.history.statuses.${item}`),
              })),
            ]}
          />
        </label>
      </div>

      {jobs.isLoading && <ListRowSkeleton count={4} actions={[{ width: 'w-16', pill: true }]} />}
      {jobs.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(jobs.error, '')}</p>
      )}
      {jobs.data && jobs.data.items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-dark-700/60 p-6 text-center text-sm text-dark-400">
          {t('admin.reachability.history.empty')}
        </p>
      )}

      {jobs.data && jobs.data.items.length > 0 && (
        <>
          {/* Телефон: карточки, как в остальных админ-списках */}
          <ul className="space-y-2 md:hidden">
            {jobs.data.items.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => openJob(job.id)}
                  aria-label={t('admin.reachability.history.open', { id: job.id })}
                  className="flex w-full items-start gap-3 rounded-xl border border-dark-700 bg-dark-800/50 p-3 text-left transition-colors hover:border-dark-600"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-dark-400">#{job.id}</span>
                      <span className="text-sm font-medium text-dark-100">
                        {t(`admin.reachability.kinds.${job.kind}`)}
                      </span>
                      {statusChip(job)}
                    </span>
                    <span className="mt-1 block truncate text-sm text-dark-200">
                      {targetsLabel(job, more)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-dark-400">
                      <span>
                        {t('admin.reachability.history.units', { count: unitsCount(job) })}
                      </span>
                      <span className="text-dark-100">{formatCredits(job.cost_kopeks)}</span>
                      <span>{age(job)}</span>
                    </span>
                  </span>
                  <ChevronRightIcon className="mt-1 h-4 w-4 shrink-0 text-dark-400" />
                </button>
              </li>
            ))}
          </ul>

          {/* Десктоп: таблица */}
          <div className="hidden overflow-x-auto rounded-2xl border border-dark-700/60 md:block">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-dark-900/60 text-left text-xs uppercase tracking-wide text-dark-400">
                  {COLUMNS.map((column) => (
                    <th key={column} className="p-2 font-medium">
                      {t(`admin.reachability.history.columns.${column}`)}
                    </th>
                  ))}
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
                    <td className="p-2 text-dark-100">
                      {t(`admin.reachability.kinds.${job.kind}`)}
                    </td>
                    <td className="max-w-xs truncate p-2 text-dark-200">
                      {targetsLabel(job, more)}
                    </td>
                    <td className="p-2 text-dark-300">{unitsCount(job)}</td>
                    <td className="p-2 text-dark-100">{formatCredits(job.cost_kopeks)}</td>
                    <td className="p-2">{statusChip(job)}</td>
                    <td className="p-2 text-dark-400">{age(job)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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

      <JobDetailsModal jobId={openJobId} onClose={() => openJob(null)} />
    </div>
  );
}
