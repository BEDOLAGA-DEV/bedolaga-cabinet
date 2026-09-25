import {
  type Batch,
  type BatchCreateRequest,
  type GeoPreview,
  type Job,
  type JobCreateRequest,
  type JobKind,
  type ReachabilityStatus,
  type Skipped,
  reachabilityApi,
} from '@/api/reachability';
import { rememberSelection } from './unitSelection';

/** Общий вид превью для панели «Запуск»: одиночная задача и пачка серверов считаются одинаково. */
export interface LaunchPreview {
  targets: Array<{ label: string; target_key: string }>;
  units_resolved: string[];
  cost_kopeks: number | null;
  balance_kopeks: number | null;
  warnings: string[];
  estimate_is_exact: boolean;
  skipped: Skipped | null;
  estimated_minutes: number | null;
  /** Только у GEO: города, резерв, прогноз времени, потолок городов режима. */
  geo?: GeoPreview | null;
}

export interface Started {
  key: string;
  options?: Record<string, unknown>;
}

/** Чем панель «Запуск» отличается для задачи и для пачки: где считать, где создавать, как звать. */
export interface LaunchAdapter<B, R> {
  kind: JobKind;
  /** Слово в кнопке: «Проверить N целей» или «Проверить N серверов». */
  noun: 'targets' | 'servers';
  enabled(body: B): boolean;
  targetsCount(body: B): number;
  units(body: B): string[];
  preview(body: B): Promise<LaunchPreview>;
  create(body: B): Promise<R>;
  /** Ключ причины, почему сейчас нельзя запускать (что-то уже идёт); null — можно. */
  busy(status: ReachabilityStatus | undefined, body: B): Started | null;
  started(result: R): Started;
  remember(body: B): void;
}

export const jobAdapter: LaunchAdapter<JobCreateRequest, Job> = {
  kind: 'probe',
  noun: 'targets',
  enabled: (body) => body.targets.length > 0,
  targetsCount: (body) => body.targets.length,
  units: (body) => body.units,
  preview: async (body) => {
    const preview = await reachabilityApi.previewJob(body);
    return {
      targets: preview.targets.map((target) => ({
        label: target.label || target.target_key,
        target_key: target.target_key,
      })),
      units_resolved: preview.units_resolved,
      cost_kopeks: preview.cost_kopeks,
      balance_kopeks: preview.balance_kopeks,
      warnings: preview.warnings,
      estimate_is_exact: preview.estimate_is_exact,
      skipped: preview.skipped,
      estimated_minutes: null,
      geo: preview.geo ?? null,
    };
  },
  create: (body) => reachabilityApi.createJob(body),
  busy: (status, body) => {
    const busy = status?.active_jobs.find((job) => job.kind === body.kind);
    return busy
      ? { key: 'admin.reachability.launch.busy', options: { kind: busy.kind, id: busy.id } }
      : null;
  },
  started: (job) => ({ key: 'admin.reachability.launch.started', options: { id: job.id } }),
  remember: (body) => rememberSelection(body.kind, body.units),
};

/** Одиночная задача своего вида: кнопка и память «как в прошлый раз» зависят от вида. */
export function jobAdapterFor(kind: JobKind): LaunchAdapter<JobCreateRequest, Job> {
  return { ...jobAdapter, kind };
}

export const batchAdapter: LaunchAdapter<BatchCreateRequest, Batch> = {
  kind: 'probe',
  noun: 'servers',
  enabled: (body) => body.host_refs.length > 0,
  targetsCount: (body) => body.host_refs.length,
  units: (body) => body.units,
  preview: async (body) => {
    const preview = await reachabilityApi.previewBatch(body);
    return {
      targets: preview.targets.map((target) => ({
        label: target.label || target.target_key,
        target_key: target.target_key,
      })),
      units_resolved: preview.units_resolved,
      cost_kopeks: preview.cost_kopeks,
      balance_kopeks: preview.balance_kopeks,
      warnings: preview.warnings,
      estimate_is_exact: true,
      skipped: null,
      estimated_minutes: preview.estimated_minutes,
      geo: null,
    };
  },
  create: (body) => reachabilityApi.createBatch(body),
  busy: (status) => (status?.active_batch ? { key: 'admin.reachability.launch.busyBatch' } : null),
  started: () => ({ key: 'admin.reachability.batch.started' }),
  remember: (body) => rememberSelection('probe', body.units),
};
