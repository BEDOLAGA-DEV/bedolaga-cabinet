import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { type Job, type JobKind, type JobStatus, reachabilityApi } from '@/api/reachability';
import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { JobResult } from './JobResult';
import { REACHABILITY_JOBS_KEY, jobsRefetchInterval } from './jobsRefetch';
import { SectionHeading } from './SectionHeading';
import { buildReachabilityLink } from './deepLink';
import { type Outcome, jobOutcome } from './jobOutcome';
import { formatCredits } from './money';
import { relativeAge } from './relativeAge';
import { canRepeat, repeatFromJob } from './repeatFromJob';

const KINDS: Array<JobKind | ''> = ['', 'probe', 'vless', 'scan'];
const STATUSES: Array<JobStatus | ''> = ['', 'running', 'done', 'failed', 'cancelled'];
const PAGE = 20;
/** Фильтры нужны только длинному журналу; короткий читается глазами. */
const FILTER_THRESHOLD = 20;
const SHOWN_TARGETS = 2;

const OUTCOME_DOT: Record<Outcome, string> = {
  ok: 'bg-success-400',
  warn: 'bg-warning-400',
  down: 'bg-error-400',
  pending: 'bg-accent-400',
  na: 'bg-dark-500',
};

const GRID = 'md:grid md:grid-cols-[0.75rem_minmax(0,1fr)_7rem_8rem_6rem_6rem_1rem] md:gap-3';

function targetsLabel(job: Job, more: (count: number) => string): string {
  const keys = job.targets.map((target) => target.label || target.target_key);
  const shown = keys.slice(0, SHOWN_TARGETS).join(', ');
  return keys.length > SHOWN_TARGETS ? `${shown} ${more(keys.length - SHOWN_TARGETS)}` : shown;
}

function unitsCount(job: Job): number {
  return (job.units_effective ?? job.units_resolved ?? job.units_requested ?? []).length;
}

interface RecentJobsProps {
  /** Задача из ссылки (?job=), раскрывается и прокручивается к ней. */
  initialJobId: number | null;
}

/**
 * «Мои проверки» для людей: строка — точка итога, цели, итог словом, симки, время, списано;
 * раскрытие показывает ответ словами и результат, «Повторить» подставляет всё в форму.
 * Журнал обновляется сам, пока есть незавершённые задачи.
 */
export function RecentJobs({ initialJobId }: RecentJobsProps) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<JobKind | ''>('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(initialJobId);
  const scrolledTo = useRef<number | null>(null);

  const jobs = useQuery({
    queryKey: [REACHABILITY_JOBS_KEY, kind, status, limit],
    queryFn: () =>
      reachabilityApi.listJobs({
        kind: kind || undefined,
        status: status || undefined,
        offset: 0,
        limit,
      }),
    staleTime: 10_000,
    refetchInterval: (query) => jobsRefetchInterval(query.state.data?.items),
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
  const statusWord = (job: Job, outcome: Outcome): string =>
    job.status === 'done'
      ? t(`admin.reachability.recent.outcome.${outcome}`)
      : t(`admin.reachability.history.statuses.${job.status}`);
  const showFilters = (jobs.data?.total ?? 0) > FILTER_THRESHOLD || kind !== '' || status !== '';
  const scrollToLauncher = () =>
    document.getElementById('reachability-launcher')?.scrollIntoView?.({ behavior: 'smooth' });

  return (
    <section aria-labelledby="reachability-recent" className="space-y-4">
      <SectionHeading
        id="reachability-recent"
        title={t('admin.reachability.recent.title')}
        aside={
          showFilters ? (
            <button
              type="button"
              aria-expanded={filtersOpen}
              className="btn-ghost min-h-[36px] px-3 text-sm"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              {t('admin.reachability.recent.filter')}
            </button>
          ) : undefined
        }
      />
      {showFilters && filtersOpen && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
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
        </div>
      )}

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
        <div className="overflow-hidden rounded-2xl border border-dark-700/60">
          <div className={cn('hidden px-3 py-2 text-xs text-dark-400', GRID)}>
            <span />
            <span>{t('admin.reachability.recent.columns.target')}</span>
            <span>{t('admin.reachability.recent.columns.outcome')}</span>
            <span>{t('admin.reachability.recent.columns.units')}</span>
            <span>{t('admin.reachability.recent.columns.time')}</span>
            <span className="text-right">{t('admin.reachability.recent.columns.cost')}</span>
            <span />
          </div>
          <ul className="divide-y divide-dark-700/60">
            {jobs.data.items.map((job) => {
              const open = expanded === job.id;
              const outcome = jobOutcome(job);
              const word = statusWord(job, outcome);
              const units = t('admin.reachability.history.units', { count: unitsCount(job) });
              const age = relativeAge(job.started_at ?? job.created_at, i18n.language);
              const cost = formatCredits(job.cost_kopeks);
              return (
                <li key={job.id} id={`reachability-job-${job.id}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(job.id)}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-dark-800/30 md:items-center',
                      open && 'bg-dark-900/40',
                      GRID,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 h-2 w-2 shrink-0 rounded-full md:mt-0',
                        OUTCOME_DOT[outcome],
                      )}
                    />
                    <span className="min-w-0 flex-1 md:contents">
                      <span className="block text-sm font-medium text-dark-100 md:truncate">
                        {targetsLabel(job, more)}
                      </span>
                      <span className="mt-0.5 block text-xs text-dark-400 md:hidden">
                        {[age, word, units, cost].join(' · ')}
                      </span>
                      <span className="hidden text-xs text-dark-300 md:block">{word}</span>
                      <span className="hidden text-xs text-dark-400 md:block">{units}</span>
                      <span className="hidden text-xs text-dark-400 md:block">{age}</span>
                      <span className="hidden text-xs tabular-nums text-dark-100 md:block md:text-right">
                        {cost}
                      </span>
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className={cn(
                        'mt-1 h-4 w-4 shrink-0 text-dark-400 transition-transform md:mt-0',
                        open && 'rotate-180',
                      )}
                    />
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-dark-700/60 bg-dark-900/40 p-3">
                      {job.error_message && (
                        <p className="text-sm text-error-400">{job.error_message}</p>
                      )}
                      <JobResult job={job} />
                      <div className="flex flex-wrap gap-2 pt-1">
                        {canRepeat(job) && (
                          <Link
                            to={buildReachabilityLink({
                              mode: repeatFromJob(job).mode,
                              repeatJobId: job.id,
                            })}
                            className="btn-secondary min-h-[40px] px-3 text-sm"
                            onClick={scrollToLauncher}
                          >
                            {t('admin.reachability.recent.repeat')}
                          </Link>
                        )}
                        <button
                          type="button"
                          className="btn-ghost min-h-[40px] px-3 text-sm"
                          onClick={() => setExpanded(null)}
                        >
                          {t('admin.reachability.recent.close')}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
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
    </section>
  );
}
