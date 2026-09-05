import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  type Job,
  type JobCreateRequest,
  type ReachabilityStatus,
  reachabilityApi,
} from '@/api/reachability';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { type LaunchSummary, formatList, launchSummary } from './launchSummary';
import { formatMoney } from './money';
import { rememberSelection } from './unitSelection';
import { useJobPreview } from './useJobPreview';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

/** Родной попап Telegram вмещает 256 символов — в Mini App списки короче. */
const LISTED_WEB = 5;
const LISTED_NATIVE = 2;

export interface LaunchState {
  preview: ReturnType<typeof useJobPreview>;
  cost: number | null;
  balance: number | null;
  balanceAfter: number | null;
  /** Почему запускать нельзя; null — можно. */
  blocker: string | null;
  isPricing: boolean;
  isPending: boolean;
  canRun: boolean;
  /** Подтверждение со сводкой, затем POST /jobs. Отказ ничего не отправляет. */
  run: () => Promise<void>;
}

export function useLaunch(
  body: JobCreateRequest | null,
  status: ReachabilityStatus | undefined,
  onStarted: (job: Job) => void,
): LaunchState {
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
  const balanceAfter = cost !== null && balance !== null ? balance - cost : null;

  let blocker: string | null = null;
  if (!body || body.targets.length === 0) blocker = t('admin.reachability.launch.noTargets');
  else if (body.units.length === 0) blocker = t('admin.reachability.launch.noUnitsChosen');
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

  const isPricing = preview.isFetching;
  const canRun = blocker === null && !isPricing && Boolean(preview.data) && !create.isPending;

  const run = async () => {
    if (!body || !preview.data || !canRun) return;
    const confirmed = await dialog.confirm(
      confirmText(launchSummary(preview.data), body.kind),
      t('admin.reachability.launch.confirmTitle'),
    );
    if (confirmed) create.mutate(body);
  };

  return {
    preview,
    cost,
    balance,
    balanceAfter,
    blocker,
    isPricing,
    isPending: create.isPending,
    canRun,
    run,
  };
}
