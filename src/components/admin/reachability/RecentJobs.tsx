import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Job, type JobKind, type JobStatus, reachabilityApi } from '@/api/reachability';
import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { JobResult } from './JobResult';
import { SectionHeading } from './SectionHeading';
import { formatCredits } from './money';
import { relativeAge } from './relativeAge';

const KINDS: Array<JobKind | ''> = ['', 'probe', 'vless', 'scan'];
const STATUSES: Array<JobStatus | ''> = ['', 'pending', 'running', 'done', 'failed', 'cancelled'];
const PAGE = 20;
const SHOWN_TARGETS = 2;

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

interface RecentJobsProps {
  /** Задача из ссылки (?job=), раскрывается и прокручивается к ней. */
  initialJobId: number | null;
}

/** «Мои проверки»: список с раскрытием результата на месте, без модалок. */
export function RecentJobs({ initialJobId }: RecentJobsProps) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<JobKind | ''>('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [limit, setLimit] = useState(PAGE);
  const [expanded, setExpanded] = useState<number | null>(initialJobId);
  const scrolledTo = useRef<number | null>(null);

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

  useEffect(() => {
    if (initialJobId === null || scrolledTo.current === initialJobId || !jobs.data) return;
    const element = document.getElementById(`reachability-job-${initialJobId}`);
    if (element) {
      scrolledTo.current = initialJobId;
      element.scrollIntoView?.({ block: 'center' });
    }
  }, [initialJobId, jobs.data]);

  const more = (count: number) => t('admin.reachability.history.more', { count });
  const toggle = (id: number) => setExpanded((current) => (current === id ? null : id));

  return (
    <section aria-labelledby="reachability-recent" className="space-y-4">
      <SectionHeading
        id="reachability-recent"
        title={t('admin.reachability.recent.title')}
        aside={jobs.data ? String(jobs.data.total) : undefined}
      />
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
        <ChoiceChips
          value={kind}
          onChange={setKind}
          label={t('admin.reachability.recent.filterKind')}
          showLabel
          options={KINDS.map((item) => ({
            value: item,
            label: item
              ? t(`admin.reachability.kinds.${item}`)
              : t('admin.reachability.recent.all'),
          }))}
        />
        <ChoiceChips
          value={status}
          onChange={setStatus}
          label={t('admin.reachability.recent.filterStatus')}
          showLabel
          options={STATUSES.map((item) => ({
            value: item,
            label: item
              ? t(`admin.reachability.history.statuses.${item}`)
              : t('admin.reachability.recent.all'),
          }))}
        />
      </div>

      {jobs.isLoading && <ListRowSkeleton count={3} actions={[{ width: 'w-16', pill: true }]} />}
      {jobs.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(jobs.error, '')}</p>
      )}
      {jobs.data && jobs.data.items.length === 0 && (
        <p className="rounded-xl border border-dashed border-dark-700/60 p-6 text-center text-sm text-dark-400">
          {t('admin.reachability.recent.empty')}
        </p>
      )}

      {jobs.data && jobs.data.items.length > 0 && (
        <ul className="space-y-2">
          {jobs.data.items.map((job) => {
            const open = expanded === job.id;
            return (
              <li
                key={job.id}
                id={`reachability-job-${job.id}`}
                className={cn(
                  'rounded-xl border bg-dark-900/30',
                  open ? 'border-dark-600' : 'border-dark-700/60',
                )}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={t(
                    open ? 'admin.reachability.recent.close' : 'admin.reachability.recent.open',
                  )}
                  onClick={() => toggle(job.id)}
                  className="flex w-full items-start gap-3 p-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-dark-400">#{job.id}</span>
                      <span className="text-sm font-medium text-dark-100">
                        {t(`admin.reachability.kinds.${job.kind}`)}
                      </span>
                      <span
                        className={cn(
                          'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_CLASS[job.status],
                        )}
                      >
                        {t(`admin.reachability.history.statuses.${job.status}`)}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-dark-200">
                      {targetsLabel(job, more)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-dark-400">
                      <span>
                        {t('admin.reachability.history.units', { count: unitsCount(job) })}
                      </span>
                      <span className="tabular-nums text-dark-100">
                        {formatCredits(job.cost_kopeks)}
                      </span>
                      <span>{relativeAge(job.started_at ?? job.created_at, i18n.language)}</span>
                    </span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 text-dark-400 transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                </button>
                {open && (
                  <div className="space-y-3 border-t border-dark-700/60 p-3">
                    {job.error_message && (
                      <p className="text-sm text-error-400">
                        {job.error_message}
                        {job.error_code ? (
                          <span className="ml-1 font-mono text-xs text-dark-400">
                            [{job.error_code}]
                          </span>
                        ) : null}
                      </p>
                    )}
                    <JobResult job={job} />
                    <details className="rounded-xl border border-dark-700/60 bg-dark-950/40 p-3">
                      <summary className="cursor-pointer text-xs text-dark-400">
                        {t('admin.reachability.history.rawJson')}
                      </summary>
                      <pre className="mt-2 max-h-80 overflow-auto text-xs text-dark-200">
                        {JSON.stringify(job.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
    </section>
  );
}
