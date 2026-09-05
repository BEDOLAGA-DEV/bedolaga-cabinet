import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  type Job,
  type JobCreateRequest,
  type ReachabilityStatus,
  type SkippedUnit,
  reachabilityApi,
} from '@/api/reachability';
import { Button } from '@/components/primitives';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatKopeks } from './money';
import { useJobPreview } from './useJobPreview';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

interface LaunchPanelProps {
  body: JobCreateRequest | null;
  status: ReachabilityStatus | undefined;
  onStarted: (job: Job) => void;
}

function unitNames(list: SkippedUnit[] | undefined): string {
  return (list ?? [])
    .map((unit) => unit.op_key)
    .filter(Boolean)
    .join(', ');
}

export function LaunchPanel({ body, status, onStarted }: LaunchPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const preview = useJobPreview(body);
  const create = useMutation({
    mutationFn: (request: JobCreateRequest) => reachabilityApi.createJob(request),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
      onStarted(job);
    },
  });

  const busy = status?.active_jobs.find((job) => job.kind === body?.kind);
  const limit = status?.cost_limit_kopeks ?? 0;
  const cost = preview.data?.cost_kopeks ?? null;
  const balance = preview.data?.balance_kopeks ?? status?.balance_kopeks ?? null;

  let blocker: string | null = null;
  if (!body || body.targets.length === 0) blocker = t('admin.reachability.launch.noTargets');
  else if (busy)
    blocker = t('admin.reachability.launch.busy', {
      kind: t(`admin.reachability.kinds.${busy.kind}`),
      id: busy.id,
    });
  else if (preview.isError)
    blocker = `${t('admin.reachability.launch.previewFailed')}: ${getApiErrorMessage(preview.error, '')}`;
  else if (preview.data && preview.data.units_resolved.length === 0)
    blocker = t('admin.reachability.launch.noUnits');
  else if (limit > 0 && cost !== null && cost > limit)
    blocker = t('admin.reachability.launch.overLimit', { limit: formatKopeks(limit) });
  else if (balance !== null && cost !== null && cost > balance)
    blocker = t('admin.reachability.launch.overBalance');

  const skipped = preview.data?.skipped;

  return (
    <section className="rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-dark-400">
            {t('admin.reachability.launch.price')}
          </p>
          <p className="text-2xl font-bold text-dark-50">
            {preview.isFetching ? '…' : formatKopeks(cost)}
          </p>
          {preview.data && !preview.data.estimate_is_exact && (
            <p className="text-xs text-warning-400">{t('admin.reachability.launch.estimate')}</p>
          )}
          <p className="mt-1 text-xs text-dark-400">
            {t('admin.reachability.launch.balance')}: {formatKopeks(balance)}
          </p>
        </div>
        <Button
          variant="primary"
          disabled={Boolean(blocker) || preview.isFetching || create.isPending || !body}
          onClick={() => body && create.mutate(body)}
        >
          {create.isPending
            ? t('admin.reachability.launch.running')
            : t('admin.reachability.launch.run', { price: formatKopeks(cost) })}
        </Button>
      </div>

      {blocker && <p className="mt-3 text-sm text-warning-400">{blocker}</p>}
      {create.isError && (
        <p className="mt-3 text-sm text-error-400">
          {getApiErrorMessage(create.error, t('admin.reachability.progress.failed'))}
        </p>
      )}

      {preview.data && (
        <ul className="mt-3 space-y-1 text-xs text-dark-400">
          {skipped && skipped.dpi_off.length > 0 && (
            <li>
              {t('admin.reachability.launch.skippedDpiOff', { units: unitNames(skipped.dpi_off) })}
            </li>
          )}
          {skipped && skipped.unavailable.length > 0 && (
            <li>
              {t('admin.reachability.launch.skippedUnavailable', {
                units: unitNames(skipped.unavailable),
              })}
            </li>
          )}
          {preview.data.warnings.map((warning) => (
            <li key={warning} className="text-warning-400">
              {warning}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
