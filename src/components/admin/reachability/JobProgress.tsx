import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Job, reachabilityApi } from '@/api/reachability';
import { Card } from '@/components/data-display';
import { Button } from '@/components/primitives';
import { GeoResult } from './GeoResult';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobResult } from './JobResult';
import { ProgressUnits } from './ProgressUnits';
import { REACHABILITY_JOBS_KEY } from './jobsRefetch';
import { useReachabilityJob } from './useReachabilityJob';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';
import { REACHABILITY_SUMMARY_KEY } from './useTargets';

interface JobProgressProps {
  jobId: number;
  onReset: () => void;
}

const HINT_KEY: Record<Job['kind'], string> = {
  probe: 'hintProbe',
  vless: 'hintVless',
  scan: 'hintScan',
  geo: 'hintGeo',
};

function elapsedLabel(startedAt: string | null): string {
  if (!startedAt) return '0:00';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Экран прогресса — для обычных людей: простые слова, без кодов и сырых ответов; обновляется сам. */
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

  // Задача завершилась — баланс, журнал и матрица обновляются сами, без перезагрузки.
  useEffect(() => {
    if (phase === 'done' || phase === 'failed' || phase === 'cancelled') {
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOBS_KEY] });
      queryClient.invalidateQueries({ queryKey: [REACHABILITY_SUMMARY_KEY] });
    }
  }, [phase, queryClient]);

  const cancel = useMutation({
    mutationFn: () => reachabilityApi.cancelJob(jobId),
    onSuccess: () => refetch(),
  });

  if (!job) {
    return (
      <p className="text-sm text-dark-400">
        {phase === 'failed' ? error : t('admin.reachability.progress.submitting')}
      </p>
    );
  }

  const inFlight = phase === 'running' || phase === 'loading';
  const stageKey = job.phase ?? 'submitting';
  const canCancel =
    job.kind !== 'probe' &&
    (job.status === 'pending' || job.status === 'running') &&
    job.phase !== 'cancelling';

  return (
    <Card size="md" className="space-y-4">
      {inFlight && (
        <div>
          <p className="text-sm font-medium text-dark-100">
            {t(`admin.reachability.progress.${stageKey}`, {
              elapsed: elapsedLabel(job.started_at),
            })}
          </p>
          <p className="mt-1 text-xs text-dark-400">
            {t(`admin.reachability.progress.${HINT_KEY[job.kind]}`)}{' '}
            {t('admin.reachability.progress.canLeave')}
          </p>
          <div className="mt-3">
            {job.kind === 'geo' ? <GeoResult job={job} /> : <ProgressUnits job={job} />}
          </div>
          {canCancel && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                {t('admin.reachability.progress.cancel')}
              </Button>
            </div>
          )}
          {cancel.error && (
            <p className="mt-2 text-sm text-error-400">{getApiErrorMessage(cancel.error, '')}</p>
          )}
        </div>
      )}

      {phase === 'failed' && (
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-dark-100">
          <p className="font-medium">{t('admin.reachability.progress.failed')}</p>
          <p className="mt-1 text-dark-300">{error}</p>
        </div>
      )}

      {phase === 'cancelled' && (
        <p className="text-sm text-dark-300">{t('admin.reachability.progress.cancelled')}</p>
      )}

      {(phase === 'done' || phase === 'cancelled') && <JobResult job={job} />}

      {!inFlight && (
        <Button variant="ghost" onClick={onReset}>
          {t('admin.reachability.launch.newCheck')}
        </Button>
      )}
    </Card>
  );
}
