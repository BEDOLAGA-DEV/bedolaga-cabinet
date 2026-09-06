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
import { REACHABILITY_JOBS_KEY, jobsRefetchInterval } from './jobsRefetch';
import { OperatorIcon } from './OperatorIcon';
import { ProbeDot } from './ProbeDot';
import { SectionHeading } from './SectionHeading';
import { jobOperators, jobOutcome } from './jobOutcome';
import { formatCredits } from './money';
import { relativeAge } from './relativeAge';

const KINDS: Array<JobKind | ''> = ['', 'probe', 'vless', 'scan'];
const STATUSES: Array<JobStatus | ''> = ['', 'pending', 'running', 'done', 'failed', 'cancelled'];
const PAGE = 20;
const SHOWN_TARGETS = 2;
const SHOWN_OPERATORS = 8;

const STATUS_CLASS: Record<JobStatus, string> = {
  pending: 'bg-dark-700/60 text-dark-300',
  running: 'bg-accent-500/15 text-accent-400',
  done: 'bg-success-500/15 text-success-400',
  failed: 'bg-error-500/15 text-error-400',
  cancelled: 'bg-dark-700/60 text-dark-400',
};

const OUTCOME_TEXT: Record<ReturnType<typeof jobOutcome>, string> = {
  ok: 'text-success-400',
  warn: 'text-warning-400',
  down: 'text-error-400',
  pending: 'text-accent-400',
  na: 'text-dark-200',
};

const GRID =
  'md:grid md:grid-cols-[1.4rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_7rem_6rem_1.5rem] md:items-center md:gap-3';

function targetsLabel(job: Job, more: (count: number) => string): string {
  const keys = job.targets.map((target) => target.label || target.target_key);
  const shown = keys.slice(0, SHOWN_TARGETS).join(', ');
  return keys.length > SHOWN_TARGETS ? `${shown} ${more(keys.length - SHOWN_TARGETS)}` : shown;
}

function unitsCount(job: Job): number {
  return (job.units_effective ?? job.units_resolved ?? []).length;
}

/** Чипы проб как в журнале оригинала: ICMP · TCP · SNI (×N); VLESS-тест — одним чипом. */
function ProbeChips({ job }: { job: Job }) {
  const { t } = useTranslation();
  const chips: string[] = [];
  if (job.kind === 'vless') chips.push('VLESS');
  else if (job.probes) {
    if (job.probes.icmp) chips.push('ICMP');
    if (job.probes.tcp) chips.push('TCP');
    if (job.probes.sni) {
      chips.push(
        job.sni_hosts.length > 1
          ? t('admin.reachability.result.sniMulti', { count: job.sni_hosts.length })
          : 'SNI',
      );
    }
  }
  if (job.kind === 'scan') chips.unshift(t('admin.reachability.kinds.scan'));
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-md border border-dark-700/60 px-1.5 py-0.5 font-mono text-[10px] text-dark-300"
        >
          {chip}
        </span>
      ))}
    </span>
  );
}

function OperatorRow({ job }: { job: Job }) {
  const codes = jobOperators(job);
  return (
    <span className="flex items-center gap-1">
      {codes.slice(0, SHOWN_OPERATORS).map((code) => (
        <OperatorIcon key={code} operator={code} className="h-4 w-4 rounded" />
      ))}
      {codes.length > SHOWN_OPERATORS && (
        <span className="text-[10px] text-dark-400">+{codes.length - SHOWN_OPERATORS}</span>
      )}
    </span>
  );
}

interface RecentJobsProps {
  /** Задача из ссылки (?job=), раскрывается и прокручивается к ней. */
  initialJobId: number | null;
}

/**
 * «Мои проверки» как в оригинале: точка итога · цель · пробы · операторы · время · списано;
 * на телефоне те же строки карточками. Раскрытие результата на месте, без модалок.
 */
export function RecentJobs({ initialJobId }: RecentJobsProps) {
  const { t, i18n } = useTranslation();
  const [kind, setKind] = useState<JobKind | ''>('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [limit, setLimit] = useState(PAGE);
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
        <div className="rounded-xl border border-dark-700/60">
          <div
            className={cn(
              'hidden px-3 py-2 text-[11px] uppercase tracking-wide text-dark-400',
              GRID,
            )}
          >
            <span />
            <span>{t('admin.reachability.recent.columns.target')}</span>
            <span>{t('admin.reachability.recent.columns.probes')}</span>
            <span>{t('admin.reachability.recent.columns.operators')}</span>
            <span>{t('admin.reachability.recent.columns.time')}</span>
            <span className="text-right">{t('admin.reachability.recent.columns.cost')}</span>
            <span />
          </div>
          <ul>
            {jobs.data.items.map((job) => {
              const open = expanded === job.id;
              const outcome = jobOutcome(job);
              return (
                <li
                  key={job.id}
                  id={`reachability-job-${job.id}`}
                  className={cn('border-t border-dark-700/60', open && 'bg-dark-900/30')}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={t(
                      open ? 'admin.reachability.recent.close' : 'admin.reachability.recent.open',
                    )}
                    onClick={() => toggle(job.id)}
                    className={cn('flex w-full flex-col gap-2 px-3 py-2.5 text-left', GRID)}
                  >
                    <span className="hidden md:flex md:justify-center">
                      <ProbeDot
                        state={outcome === 'pending' ? 'na' : outcome}
                        title={t(`admin.reachability.recent.outcome.${outcome}`)}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <ProbeDot
                          state={outcome === 'pending' ? 'na' : outcome}
                          className="md:hidden"
                        />
                        <span className="font-mono text-xs text-dark-400">#{job.id}</span>
                        <span className={cn('truncate font-mono text-sm', OUTCOME_TEXT[outcome])}>
                          {targetsLabel(job, more)}
                        </span>
                        <span
                          className={cn(
                            'whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium',
                            STATUS_CLASS[job.status],
                          )}
                        >
                          {t(`admin.reachability.history.statuses.${job.status}`)}
                        </span>
                      </span>
                    </span>
                    <ProbeChips job={job} />
                    <span className="flex items-center gap-2">
                      <OperatorRow job={job} />
                      <span className="text-[10px] text-dark-400">
                        {t('admin.reachability.history.units', { count: unitsCount(job) })}
                      </span>
                    </span>
                    <span className="text-xs text-dark-400">
                      {relativeAge(job.started_at ?? job.created_at, i18n.language)}
                    </span>
                    <span className="text-xs tabular-nums text-dark-100 md:text-right">
                      {formatCredits(job.cost_kopeks)}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        'hidden h-4 w-4 shrink-0 text-dark-400 transition-transform md:block',
                        open && 'rotate-180',
                      )}
                    />
                  </button>
                  {open && (
                    <div className="space-y-3 border-t border-dark-700/60 p-3">
                      {job.error_message && (
                        <p className="text-sm text-error-400">{job.error_message}</p>
                      )}
                      <JobResult job={job} />
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
