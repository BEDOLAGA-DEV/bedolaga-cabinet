import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Job, reachabilityApi } from '@/api/reachability';
import { Button } from '@/components/primitives';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobResult } from './JobResult';
import { useReachabilityJob } from './useReachabilityJob';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

interface JobProgressProps {
  jobId: number;
  onReset: () => void;
}

const HINT_KEY: Record<Job['kind'], string> = {
  probe: 'hintProbe',
  vless: 'hintVless',
  scan: 'hintScan',
};

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return '0:00';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function JobProgress({ jobId, onReset }: JobProgressProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { job, phase, error, refetch } = useReachabilityJob(jobId);
  const [, tick] = useState(0);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done' || phase === 'failed' || phase === 'cancelled') {
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
    }
  }, [phase, queryClient]);

  const cancel = useMutation({
    mutationFn: () => reachabilityApi.cancelJob(jobId),
    onSuccess: () => refetch(),
  });
  const retrieve = useMutation({
    mutationFn: () => reachabilityApi.retrieveJob(jobId),
    onSuccess: () => refetch(),
  });

  if (!job) {
    return (
      <p className="text-sm text-dark-400">
        {phase === 'failed' ? error : t('admin.reachability.progress.submitting')}
      </p>
    );
  }

  const inFlight = phase === 'running' || phase === 'loading' || phase === 'stalled';
  const stageKey = job.phase ?? 'submitting';
  const canCancel =
    job.kind !== 'probe' &&
    (job.status === 'pending' || job.status === 'running') &&
    job.phase !== 'cancelling';
  const canRetrieve = job.kind === 'probe' && (job.phase === 'retrieving' || phase === 'stalled');
  const actionError = cancel.error ?? retrieve.error;

  return (
    <section className="space-y-4 rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
      {inFlight && (
        <div>
          <p className="text-sm font-medium text-dark-100">
            {phase === 'stalled'
              ? t('admin.reachability.progress.stalled')
              : t(`admin.reachability.progress.${stageKey}`, {
                  elapsed: elapsedLabel(job.started_at),
                })}
          </p>
          <p className="mt-1 text-xs text-dark-400">
            {t(`admin.reachability.progress.${HINT_KEY[job.kind]}`)}
          </p>
          {phase !== 'stalled' && (
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-dark-700">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-500" />
            </div>
          )}
          <div className="mt-3 flex gap-2">
            {canCancel && (
              <Button
                variant="secondary"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                {t('admin.reachability.progress.cancel')}
              </Button>
            )}
            {canRetrieve && (
              <Button
                variant="secondary"
                onClick={() => retrieve.mutate()}
                disabled={retrieve.isPending}
              >
                {t('admin.reachability.progress.retrieve')}
              </Button>
            )}
          </div>
          {actionError && (
            <p className="mt-2 text-sm text-error-400">{getApiErrorMessage(actionError, '')}</p>
          )}
        </div>
      )}

      {phase === 'failed' && (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-dark-100">
          <p className="font-medium">{t('admin.reachability.progress.failed')}</p>
          <p className="mt-1 text-dark-300">
            {error}{' '}
            {job.error_code && (
              <span className="font-mono text-xs text-dark-500">[{job.error_code}]</span>
            )}
          </p>
        </div>
      )}

      {phase === 'cancelled' && (
        <p className="text-sm text-dark-300">{t('admin.reachability.progress.cancelled')}</p>
      )}

      {(phase === 'done' || phase === 'cancelled') && <JobResult job={job} />}

      {!inFlight && (
        <Button variant="ghost" onClick={onReset}>
          {t('admin.reachability.progress.retry')}
        </Button>
      )}
    </section>
  );
}
