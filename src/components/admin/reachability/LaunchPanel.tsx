import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  type Job,
  type JobCreateRequest,
  type ReachabilityStatus,
  type SkippedUnit,
  reachabilityApi,
} from '@/api/reachability';
import { Card } from '@/components/data-display';
import { Button } from '@/components/primitives';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { type LaunchSummary, formatList, launchSummary } from './launchSummary';
import { formatCredits, formatKopeks, formatMoney } from './money';
import { rememberSelection } from './unitSelection';
import { useJobPreview } from './useJobPreview';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

interface LaunchPanelProps {
  body: JobCreateRequest | null;
  status: ReachabilityStatus | undefined;
  onStarted: (job: Job) => void;
}

/** Родной попап Telegram вмещает 256 символов — в Mini App списки короче. */
const LISTED_WEB = 5;
const LISTED_NATIVE = 2;

function unitNames(list: SkippedUnit[] | undefined): string {
  return (list ?? [])
    .map((unit) => unit.op_key)
    .filter(Boolean)
    .join(', ');
}

export function LaunchPanel({ body, status, onStarted }: LaunchPanelProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dialog = useNativeDialog();
  const notify = useNotify();
  const preview = useJobPreview(body);
  const create = useMutation({
    mutationFn: (request: JobCreateRequest) => reachabilityApi.createJob(request),
    onSuccess: (job, request) => {
      rememberSelection(request.kind, request.units);
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
      notify.success(t('admin.reachability.launch.started', { id: job.id }));
      onStarted(job);
    },
    onError: (error) =>
      notify.error(getApiErrorMessage(error, t('admin.reachability.progress.failed'))),
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
    blocker = t('admin.reachability.launch.overLimit', { limit: formatMoney(limit) });
  else if (balance !== null && cost !== null && cost > balance)
    blocker = t('admin.reachability.launch.overBalance');

  const confirmText = (summary: LaunchSummary, kind: JobCreateRequest['kind']): string => {
    const listed = dialog.isNative ? LISTED_NATIVE : LISTED_WEB;
    const more = (count: number) => t('admin.reachability.launch.confirmMore', { count });
    const price = formatMoney(summary.cost);
    return [
      t('admin.reachability.launch.confirmQuestion', {
        kind: t(`admin.reachability.kinds.${kind}`),
      }),
      t('admin.reachability.launch.confirmTargets', {
        count: summary.targets.length,
        list: formatList(summary.targets, listed, more),
      }),
      t('admin.reachability.launch.confirmUnits', {
        count: summary.units.length,
        list: formatList(summary.units, listed, more),
      }),
      summary.exact
        ? t('admin.reachability.launch.confirmPrice', { price })
        : t('admin.reachability.launch.confirmEstimate', { price }),
      summary.balanceAfter === null
        ? null
        : t('admin.reachability.launch.confirmBalanceAfter', {
            balance: formatMoney(summary.balanceAfter),
          }),
    ]
      .filter((line): line is string => line !== null)
      .join('\n');
  };

  // Списание — только после родного диалога со сводкой; отказ ничего не отправляет.
  const handleRun = async () => {
    if (!body || !preview.data) return;
    const confirmed = await dialog.confirm(
      confirmText(launchSummary(preview.data), body.kind),
      t('admin.reachability.launch.confirmTitle'),
    );
    if (confirmed) create.mutate(body);
  };

  const skipped = preview.data?.skipped;

  return (
    <Card size="md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-dark-400">
            {t('admin.reachability.launch.price')}
          </p>
          <p className="text-2xl font-bold text-dark-50">
            {preview.isFetching ? '…' : formatCredits(cost)}
          </p>
          {cost !== null && !preview.isFetching && (
            <p className="text-sm text-dark-300">≈ {formatKopeks(cost)}</p>
          )}
          {preview.data && !preview.data.estimate_is_exact && (
            <p className="text-xs text-warning-400">{t('admin.reachability.launch.estimate')}</p>
          )}
          <p className="mt-1 text-xs text-dark-400">
            {t('admin.reachability.launch.balance')}: {formatMoney(balance)}
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full sm:w-auto"
          disabled={
            Boolean(blocker) || preview.isFetching || !preview.data || create.isPending || !body
          }
          onClick={handleRun}
        >
          {create.isPending
            ? t('admin.reachability.launch.running')
            : t('admin.reachability.launch.run', { price: formatCredits(cost) })}
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
    </Card>
  );
}
