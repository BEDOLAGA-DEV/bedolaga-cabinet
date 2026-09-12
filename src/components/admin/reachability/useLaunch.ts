import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoPreview, JobKind, ReachabilityStatus } from '@/api/reachability';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { useNotify } from '@/platform/hooks/useNotify';
import { getApiErrorMessage } from '@/utils/api-error';
import { REACHABILITY_JOBS_KEY } from './jobsRefetch';
import type { LaunchAdapter, LaunchPreview } from './launchAdapters';
import { type LaunchSummary, formatList, launchSummary } from './launchSummary';
import { formatMoney } from './money';
import { REACHABILITY_STATUS_KEY } from './useReachabilityStatus';

export const REACHABILITY_PREVIEW_KEY = 'admin-reachability-preview';

/** Родной попап Telegram вмещает 256 символов — в Mini App списки короче. */
const LISTED_WEB = 5;
const LISTED_NATIVE = 2;

export interface LaunchState {
  kind: JobKind;
  noun: 'targets' | 'servers';
  targetsCount: number;
  unitsCount: number;
  preview: LaunchPreview | undefined;
  previewError: unknown;
  cost: number | null;
  balance: number | null;
  balanceAfter: number | null;
  /** Оценка времени: у пачки — из превью, у GEO — из прогноза сервиса; у остальных нет. */
  eta: number | null;
  /** GEO: числа сервиса из расчёта; у остальных видов null. */
  geo: GeoPreview | null;
  /** Почему запускать нельзя; null — можно. */
  blocker: string | null;
  isPricing: boolean;
  isPending: boolean;
  canRun: boolean;
  /** Браузер: показан второй шаг «Списать / Отмена» в панели. В Mini App всегда false. */
  confirming: boolean;
  /** Сводка для второго шага; null — цена ещё не посчитана. */
  summary: LaunchSummary | null;
  /**
   * Mini App: родной попап со сводкой, затем создание. Браузер: первый вызов включает второй
   * шаг в панели, второй — отправляет. Отказ ничего не отправляет.
   */
  run: () => Promise<void>;
  /** Браузер: убрать второй шаг. */
  cancel: () => void;
}

/**
 * Панель «Запуск» одинакова для одиночной задачи и пачки серверов: бесплатное превью на каждое
 * изменение, причины «нельзя», подтверждение перед списанием, память симок после запуска.
 */
export function useLaunch<B, R>(
  body: B | null,
  status: ReachabilityStatus | undefined,
  onStarted: (result: R) => void,
  adapter: LaunchAdapter<B, R>,
): LaunchState {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const dialog = useNativeDialog();
  const notify = useNotify();
  const enabled = body !== null && adapter.enabled(body);
  const preview = useQuery<LaunchPreview>({
    queryKey: [REACHABILITY_PREVIEW_KEY, adapter.kind, adapter.noun, body],
    queryFn: () => adapter.preview(body as B),
    enabled,
    staleTime: 0,
    retry: false,
  });
  const create = useMutation({
    mutationFn: (request: B) => adapter.create(request),
    onSuccess: (result, request) => {
      adapter.remember(request);
      queryClient.invalidateQueries({ queryKey: REACHABILITY_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: [REACHABILITY_JOBS_KEY] });
      const started = adapter.started(result);
      notify.success(t(started.key, started.options));
      onStarted(result);
    },
    onError: (error) =>
      notify.error(getApiErrorMessage(error, t('admin.reachability.progress.failed'))),
  });

  const targetsCount = body ? adapter.targetsCount(body) : 0;
  const unitsCount = body ? adapter.units(body).length : 0;
  const busy = body ? adapter.busy(status, body) : null;
  const limit = status?.cost_limit_kopeks ?? 0;
  const cost = preview.data?.cost_kopeks ?? null;
  const balance = preview.data?.balance_kopeks ?? status?.balance_kopeks ?? null;
  const balanceAfter = cost !== null && balance !== null ? balance - cost : null;
  const geo = preview.data?.geo ?? null;
  const eta =
    adapter.kind === 'geo'
      ? geo?.estimated_sec
        ? Math.max(1, Math.ceil(geo.estimated_sec / 60))
        : null
      : (preview.data?.estimated_minutes ?? null);

  let blocker: string | null = null;
  if (!body || targetsCount === 0) blocker = t('admin.reachability.launch.noTargets');
  // Симок у GEO нет: города и провайдеры выбирает сервис.
  else if (adapter.kind !== 'geo' && unitsCount === 0)
    blocker = t('admin.reachability.launch.noUnitsChosen');
  else if (busy)
    blocker = t(busy.key, {
      ...busy.options,
      kind: t(`admin.reachability.kinds.${String(busy.options?.kind ?? adapter.kind)}`),
    });
  else if (preview.isError)
    blocker = `${t('admin.reachability.launch.previewFailed')}: ${getApiErrorMessage(preview.error, '')}`;
  else if (preview.data && preview.data.units_resolved.length === 0)
    blocker = t('admin.reachability.launch.noUnits');
  else if (limit > 0 && cost !== null && cost > limit)
    blocker = t('admin.reachability.launch.overLimit', { limit: formatMoney(limit) });
  else if (balance !== null && cost !== null && cost > balance)
    blocker = t('admin.reachability.launch.overBalance');

  const confirmText = (summary: LaunchSummary): string => {
    const listed = dialog.isNative ? LISTED_NATIVE : LISTED_WEB;
    const more = (count: number) => t('admin.reachability.launch.confirmMore', { count });
    const price = formatMoney(summary.cost);
    return [
      t('admin.reachability.launch.confirmQuestion', {
        kind: t(`admin.reachability.kinds.${adapter.kind}`),
      }),
      t(
        adapter.noun === 'servers'
          ? 'admin.reachability.launch.confirmServers'
          : 'admin.reachability.launch.confirmTargets',
        {
          count: summary.targets.length,
          list: formatList(summary.targets, listed, more),
        },
      ),
      adapter.kind === 'geo'
        ? t('admin.reachability.geo.launch.confirmCities', { count: geo?.n_nodes ?? 0 })
        : t('admin.reachability.launch.confirmUnits', {
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

  // Второй шаг привязан к конкретному набору целей и симок: изменился набор — шаг сброшен.
  const bodyKey = JSON.stringify(body);
  const [armedFor, setArmedFor] = useState<string | null>(null);
  const confirming = armedFor !== null && armedFor === bodyKey;
  const cancel = () => setArmedFor(null);

  const run = async () => {
    if (!body || !preview.data || !canRun) return;
    if (dialog.isNative) {
      const confirmed = await dialog.confirm(
        confirmText(launchSummary(preview.data)),
        t('admin.reachability.launch.confirmTitle'),
      );
      if (confirmed) create.mutate(body);
      return;
    }
    if (!confirming) {
      setArmedFor(bodyKey);
      return;
    }
    setArmedFor(null);
    create.mutate(body);
  };

  return {
    kind: adapter.kind,
    noun: adapter.noun,
    targetsCount,
    unitsCount,
    preview: preview.data,
    previewError: preview.error,
    cost,
    balance,
    balanceAfter,
    eta,
    geo,
    blocker,
    isPricing,
    isPending: create.isPending,
    canRun,
    confirming,
    summary: preview.data ? launchSummary(preview.data) : null,
    run,
    cancel,
  };
}
