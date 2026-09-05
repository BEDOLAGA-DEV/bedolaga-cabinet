import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { reachabilityApi } from '@/api/reachability';
import { XCloseIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobResult } from './JobResult';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';

interface JobDetailsModalProps {
  jobId: number | null;
  onClose: () => void;
}

/**
 * Детали задачи из истории. Обычная модалка по образцу GeoCheckModal:
 * портал, ловушка фокуса, закрытие по фону и Escape, safe-зоны Mini App.
 */
export function JobDetailsModal({ jobId, onClose }: JobDetailsModalProps) {
  if (jobId === null) return null;
  return <JobDetailsDialog jobId={jobId} onClose={onClose} />;
}

function JobDetailsDialog({ jobId, onClose }: { jobId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const dialogRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });
  const job = useQuery({
    queryKey: [REACHABILITY_JOB_KEY, jobId, 'details'],
    queryFn: () => reachabilityApi.getJob(jobId),
    staleTime: 10_000,
  });
  const title = t('admin.reachability.history.details', { id: jobId });

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reachability-job-title"
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-4xl flex-col overflow-y-auto rounded-2xl border border-dark-700 bg-dark-900 p-4 shadow-2xl sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 id="reachability-job-title" className="text-lg font-semibold text-dark-100">
              {title}
            </h3>
            {job.data && (
              <p className="flex flex-wrap gap-x-3 text-xs text-dark-400">
                <span>{t(`admin.reachability.kinds.${job.data.kind}`)}</span>
                <span>{t(`admin.reachability.history.statuses.${job.data.status}`)}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close', 'Закрыть')}
            className="-mr-1.5 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
          >
            <XCloseIcon />
          </button>
        </div>

        {job.isLoading && (
          <SkeletonGroup aria-label={title}>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </SkeletonGroup>
        )}
        {job.isError && (
          <p className="text-sm text-error-400">{getApiErrorMessage(job.error, '')}</p>
        )}
        {job.data && (
          <div className="space-y-4">
            {job.data.error_message && (
              <p className="text-sm text-error-400">
                {job.data.error_message}
                {job.data.error_code ? ` [${job.data.error_code}]` : ''}
              </p>
            )}
            <JobResult job={job.data} />
            <details className="rounded-xl border border-dark-700/60 bg-dark-950/40 p-3">
              <summary className="cursor-pointer text-xs text-dark-400">
                {t('admin.reachability.history.rawJson')}
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto text-xs text-dark-200">
                {JSON.stringify(job.data.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
