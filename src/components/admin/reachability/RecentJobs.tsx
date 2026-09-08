import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { type Job, type JobKind, type JobStatus, reachabilityApi } from '@/api/reachability';
import { ListRowSkeleton } from '@/components/admin/ListRowSkeleton';
import { ChevronDownIcon, CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from './ChoiceChips';
import { JobResult } from './JobResult';
import { REACHABILITY_JOBS_KEY, jobsRefetchInterval } from './jobsRefetch';
import { SectionHeading } from './SectionHeading';
import { buildReachabilityLink } from './deepLink';
import {
  type HistoryEntry,
  batchHosts,
  batchSummary,
  groupHistory,
  mergeBatchJobs,
} from './historyEntries';
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

const GRID = 'md:grid md:grid-cols-[0.75rem_minmax(0,1fr)_8rem_6rem_6rem_6rem_1rem] md:gap-3';

interface RowView {
  key: string;
  /** Задача для ?job= и прокрутки; у пачки — первая. */
  anchorId: number;
  tone: Outcome;
  label: string;
  word: string;
  units: string;
  age: string;
  cost: string;
}

function unitsCount(job: Job): number {
  return (job.units_effective ?? job.units_resolved ?? job.units_requested ?? []).length;
}

interface RecentJobsProps {
  /** Задача из ссылки (?job=), раскрывается и прокручивается к ней. */
  initialJobId: number | null;
  /** Только проверки одного сервера (из его карточки); крестик снимает фильтр. */
  targetKey?: string | null;
  onClearTarget?: () => void;
}

/**
 * История проверок — своя вкладка: строка — точка итога, цели, итог словом, симки, время, списано.
 * Пачка серверов — одной строкой «24 сервера · работают 12 из 24», раскрытие показывает ответ по
 * каждому серверу. «Повторить» переключает вкладку и подставляет всё в форму. Журнал обновляется
 * сам, пока есть незавершённые задачи.
 */
export function RecentJobs({ initialJobId, targetKey = null, onClearTarget }: RecentJobsProps) {
  const { t, i18n } = useTranslation();
  const base = 'admin.reachability';
  const [kind, setKind] = useState<JobKind | ''>('');
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [limit, setLimit] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const openedFromLink = useRef<number | null>(null);
  const scrolledTo = useRef<number | null>(null);

  const jobs = useQuery({
    queryKey: [REACHABILITY_JOBS_KEY, kind, status, limit, targetKey],
    queryFn: () =>
      reachabilityApi.listJobs({
        kind: kind || undefined,
        status: status || undefined,
        target_key: targetKey ?? undefined,
        offset: 0,
        limit,
      }),
    staleTime: 10_000,
    refetchInterval: (query) => jobsRefetchInterval(query.state.data?.items),
  });
  const entries = useMemo(() => groupHistory(jobs.data?.items ?? []), [jobs.data]);

  // Задача из ссылки раскрывается один раз (у пачки — вся строка пачки) и прокручивается к себе.
  useEffect(() => {
    if (initialJobId === null || !jobs.data) return;
    if (openedFromLink.current !== initialJobId) {
      const entry = entries.find((item) =>
        item.kind === 'job'
          ? item.job.id === initialJobId
          : item.jobs.some((j) => j.id === initialJobId),
      );
      if (entry) {
        openedFromLink.current = initialJobId;
        setExpanded(entry.key);
      }
    }
    if (scrolledTo.current === initialJobId) return;
    const element = document.getElementById(`reachability-job-${initialJobId}`);
    if (element) {
      scrolledTo.current = initialJobId;
      element.scrollIntoView?.({ block: 'center' });
    }
  }, [initialJobId, jobs.data, entries]);

  const more = (count: number) => t(`${base}.history.more`, { count });
  const targetsLabel = (targets: Job['targets']) => {
    const keys = targets.map((target) => target.label || target.target_key);
    const shown = keys.slice(0, SHOWN_TARGETS).join(', ');
    return keys.length > SHOWN_TARGETS ? `${shown} ${more(keys.length - SHOWN_TARGETS)}` : shown;
  };
  const statusWord = (job: Job, outcome: Outcome): string =>
    job.status === 'done'
      ? t(`${base}.recent.outcome.${outcome}`)
      : t(`${base}.history.statuses.${job.status}`);
  const age = (at: string | null) => (at ? relativeAge(at, i18n.language) : '');

  const rowOf = (entry: HistoryEntry): RowView => {
    if (entry.kind === 'job') {
      const outcome = jobOutcome(entry.job);
      return {
        key: entry.key,
        anchorId: entry.job.id,
        tone: outcome,
        label: targetsLabel(entry.job.targets),
        word: statusWord(entry.job, outcome),
        units: t(`${base}.history.units`, { count: unitsCount(entry.job) }),
        age: age(entry.job.started_at ?? entry.job.created_at),
        cost: formatCredits(entry.job.cost_kopeks),
      };
    }
    const summary = batchSummary(entry.jobs);
    const targets = entry.jobs.flatMap((job) => job.targets);
    const word =
      summary.status === 'done'
        ? t(`${base}.recent.batchOutcome`, { ok: summary.ok, total: summary.targets })
        : t(
            `${base}.history.statuses.${summary.status === 'pending' ? 'running' : summary.status}`,
          );
    return {
      key: entry.key,
      anchorId: entry.jobs[0].id,
      tone: summary.tone,
      label:
        targets.length <= SHOWN_TARGETS
          ? targetsLabel(targets)
          : t(`${base}.recent.batchTargets`, { count: summary.targets }),
      word,
      units: t(`${base}.history.units`, { count: summary.units }),
      age: age(summary.startedAt),
      cost: formatCredits(summary.costKopeks),
    };
  };

  const repeatLink = (entry: HistoryEntry): string | null => {
    if (entry.kind === 'job') {
      return canRepeat(entry.job)
        ? buildReachabilityLink({ mode: repeatFromJob(entry.job).mode, repeatJobId: entry.job.id })
        : null;
    }
    return buildReachabilityLink({
      mode: 'hosts',
      targets: batchHosts(entry.jobs).map((ref) => ({ kind: 'host', ref })),
      repeatJobId: entry.jobs[0].id,
    });
  };

  const toggle = (key: string) => setExpanded((current) => (current === key ? null : key));
  const showFilters = (jobs.data?.total ?? 0) > FILTER_THRESHOLD || kind !== '' || status !== '';
  const targetLabel = targetKey
    ? (jobs.data?.items
        .flatMap((job) => job.targets)
        .find((target) => target.target_key === targetKey)?.label ?? targetKey)
    : null;

  return (
    <section aria-labelledby="reachability-recent" className="space-y-4">
      <SectionHeading
        id="reachability-recent"
        title={t(`${base}.recent.title`)}
        aside={
          showFilters ? (
            <button
              type="button"
              aria-expanded={filtersOpen}
              className="btn-ghost min-h-[36px] px-3 text-sm"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              {t(`${base}.recent.filter`)}
            </button>
          ) : undefined
        }
      />
      {targetLabel && (
        <div className="flex items-center gap-1.5">
          <span className="rounded-lg bg-accent-500/10 px-2.5 py-1.5 text-xs font-medium text-accent-400">
            {`${t(`${base}.recent.server`)}: ${targetLabel}`}
          </span>
          {onClearTarget && (
            <button
              type="button"
              aria-label={t(`${base}.recent.allServers`)}
              title={t(`${base}.recent.allServers`)}
              onClick={onClearTarget}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 hover:bg-dark-800 hover:text-dark-200"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      {showFilters && filtersOpen && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <ChoiceChips
            value={status}
            onChange={setStatus}
            label={t(`${base}.recent.filterStatus`)}
            showLabel
            options={STATUSES.map((item) => ({
              value: item,
              label: item ? t(`${base}.history.statuses.${item}`) : t(`${base}.recent.all`),
            }))}
          />
          <ChoiceChips
            value={kind}
            onChange={setKind}
            label={t(`${base}.recent.filterKind`)}
            showLabel
            options={KINDS.map((item) => ({
              value: item,
              label: item ? t(`${base}.kinds.${item}`) : t(`${base}.recent.all`),
            }))}
          />
        </div>
      )}

      {jobs.isLoading && <ListRowSkeleton count={3} actions={[{ width: 'w-16', pill: true }]} />}
      {jobs.isError && (
        <p className="text-sm text-error-400">{getApiErrorMessage(jobs.error, '')}</p>
      )}
      {jobs.data && entries.length === 0 && (
        <p className="rounded-xl border border-dashed border-dark-700/60 p-6 text-center text-sm text-dark-400">
          {t(`${base}.recent.empty`)}
        </p>
      )}

      {jobs.data && entries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-dark-700/60">
          <div className={cn('hidden px-3 py-2 text-xs text-dark-400', GRID)}>
            <span />
            <span>{t(`${base}.recent.columns.target`)}</span>
            <span>{t(`${base}.recent.columns.outcome`)}</span>
            <span>{t(`${base}.recent.columns.units`)}</span>
            <span>{t(`${base}.recent.columns.time`)}</span>
            <span className="text-right">{t(`${base}.recent.columns.cost`)}</span>
            <span />
          </div>
          <ul className="divide-y divide-dark-700/60">
            {entries.map((entry) => {
              const row = rowOf(entry);
              const open = expanded === entry.key;
              return (
                <HistoryRow
                  key={entry.key}
                  row={row}
                  open={open}
                  onToggle={() => toggle(entry.key)}
                >
                  {open && (
                    <ExpandedEntry
                      entry={entry}
                      repeatTo={repeatLink(entry)}
                      onClose={() => setExpanded(null)}
                    />
                  )}
                </HistoryRow>
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
          {t(`${base}.history.loadMore`)}
        </button>
      )}
    </section>
  );
}

interface HistoryRowProps {
  row: RowView;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

function HistoryRow({ row, open, onToggle, children }: HistoryRowProps) {
  return (
    <li id={`reachability-job-${row.anchorId}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={cn(
          'flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-dark-800/30 md:items-center',
          open && 'bg-dark-900/40',
          GRID,
        )}
      >
        <span
          aria-hidden="true"
          className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full md:mt-0', OUTCOME_DOT[row.tone])}
        />
        <span className="min-w-0 flex-1 md:contents">
          <span className="block text-sm font-medium text-dark-100 md:truncate">{row.label}</span>
          <span className="mt-0.5 block text-xs text-dark-400 md:hidden">
            {[row.age, row.word, row.units, row.cost].filter(Boolean).join(' · ')}
          </span>
          <span className="hidden text-xs text-dark-300 md:block">{row.word}</span>
          <span className="hidden text-xs text-dark-400 md:block">{row.units}</span>
          <span className="hidden text-xs text-dark-400 md:block">{row.age}</span>
          <span className="hidden text-xs tabular-nums text-dark-100 md:block md:text-right">
            {row.cost}
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
      {children}
    </li>
  );
}

interface ExpandedEntryProps {
  entry: HistoryEntry;
  repeatTo: string | null;
  onClose: () => void;
}

/** Раскрытая строка: ошибки словами, результат (у пачки — по всем серверам разом), «Повторить». */
function ExpandedEntry({ entry, repeatTo, onClose }: ExpandedEntryProps) {
  const { t } = useTranslation();
  const jobs = entry.kind === 'job' ? [entry.job] : entry.jobs;
  const shown = entry.kind === 'job' ? entry.job : mergeBatchJobs(entry.jobs);
  const errors = jobs
    .map((job) => job.error_message)
    .filter((message): message is string => !!message);
  return (
    <div className="space-y-3 border-t border-dark-700/60 bg-dark-900/40 p-3">
      {errors.map((message) => (
        <p key={message} className="text-sm text-error-400">
          {message}
        </p>
      ))}
      <JobResult job={shown} />
      <div className="flex flex-wrap gap-2 pt-1">
        {repeatTo && (
          <Link
            to={repeatTo}
            className="btn-secondary min-h-[40px] px-3 text-sm"
            onClick={() => window.scrollTo?.({ top: 0, behavior: 'smooth' })}
          >
            {t('admin.reachability.recent.repeat')}
          </Link>
        )}
        <button type="button" className="btn-ghost min-h-[40px] px-3 text-sm" onClick={onClose}>
          {t('admin.reachability.recent.close')}
        </button>
      </div>
    </div>
  );
}
