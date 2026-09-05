import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { reachabilityApi } from '@/api/reachability';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/primitives';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';
import { JobResult } from './JobResult';
import { REACHABILITY_JOB_KEY } from './useReachabilityJob';

interface JobDetailsSheetProps {
  jobId: number | null;
  onClose: () => void;
}

export function JobDetailsSheet({ jobId, onClose }: JobDetailsSheetProps) {
  const { t } = useTranslation();
  const job = useQuery({
    queryKey: [REACHABILITY_JOB_KEY, jobId, 'details'],
    queryFn: () => reachabilityApi.getJob(jobId as number),
    enabled: jobId !== null,
    staleTime: 10_000,
  });

  return (
    <Sheet open={jobId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent showCloseButton>
        <SheetHeader>
          <SheetTitle>{t('admin.reachability.history.details', { id: jobId ?? '' })}</SheetTitle>
        </SheetHeader>
        {job.isLoading && (
          <SkeletonGroup aria-label={t('admin.reachability.history.details', { id: jobId ?? '' })}>
            <Skeleton className="h-24 w-full rounded-2xl" />
          </SkeletonGroup>
        )}
        {job.isError && (
          <p className="text-sm text-error-400">{getApiErrorMessage(job.error, '')}</p>
        )}
        {job.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
              <span>{t(`admin.reachability.kinds.${job.data.kind}`)}</span>
              <span>{t(`admin.reachability.history.statuses.${job.data.status}`)}</span>
              {job.data.error_message && (
                <span className="text-error-400">
                  {job.data.error_message}
                  {job.data.error_code ? ` [${job.data.error_code}]` : ''}
                </span>
              )}
            </div>
            <JobResult job={job.data} />
            <details className="rounded-xl border border-dark-700/60 bg-dark-900 p-3">
              <summary className="cursor-pointer text-xs text-dark-400">
                {t('admin.reachability.history.rawJson')}
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto text-xs text-dark-200">
                {JSON.stringify(job.data.result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
