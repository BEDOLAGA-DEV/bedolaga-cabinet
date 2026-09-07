import { useTranslation } from 'react-i18next';
import type { Batch } from '@/api/reachability';
import { StopIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { formatCredits } from '../money';
import { type TargetProgress, batchEtaMinutes, batchTargets, spentSoFar } from './batchProgress';
import type { FleetRow } from './fleet';

interface BatchProgressProps {
  batch: Batch;
  onStop: () => void;
  stopping: boolean;
  /** Оценка на всю пачку из превью (или из запуска); null — остаток не считаем. */
  estimatedMinutes: number | null;
}

/**
 * Вместо сводки, пока идёт проверка: «Проверяем 12 серверов», полоса, «Готово 5 из 12 · ещё около
 * 10 минут», «Остановить». Списывается только за проверенные симки, страницу можно закрыть.
 */
export function BatchProgress({ batch, onStop, stopping, estimatedMinutes }: BatchProgressProps) {
  const { t } = useTranslation();
  const base = 'admin.reachability.batch';
  const eta = batchEtaMinutes(batch, estimatedMinutes);
  const percent =
    batch.total_targets > 0 ? Math.round((batch.done_targets / batch.total_targets) * 100) : 0;
  const line =
    eta === null
      ? t(`${base}.progressDone`, { done: batch.done_targets, total: batch.total_targets })
      : t(`${base}.progressLine`, {
          done: batch.done_targets,
          total: batch.total_targets,
          eta: t(`${base}.minutes`, { count: eta }),
        });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight text-dark-50 md:text-3xl">
          {t(`${base}.progressTitle`, { count: batch.total_targets })}
        </h2>
        <Button
          variant="secondary"
          leftIcon={<StopIcon className="h-4 w-4" />}
          loading={stopping}
          onClick={onStop}
        >
          {t(stopping ? `${base}.stopping` : `${base}.stop`)}
        </Button>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={batch.total_targets}
        aria-valuenow={batch.done_targets}
        aria-label={line}
        className="h-2 w-full overflow-hidden rounded-full bg-dark-700/60"
      >
        <span
          className="block h-full rounded-full bg-accent-500 transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-medium text-dark-200">{line}</p>
        <p className="text-xs text-dark-400">
          {t(`${base}.canLeave`)} {t(`${base}.onlyChecked`)}
        </p>
      </div>
    </section>
  );
}

const ORDER: Record<TargetProgress['state'], number> = { done: 0, checking: 1, queued: 2 };
const ASIDE_ROWS = 8;

/** Правая колонка на десктопе: какие серверы уже ответили, какие проверяем, какие ждут очереди. */
export function BatchAside({ batch, rows }: { batch: Batch; rows: FleetRow[] }) {
  const { t } = useTranslation();
  const base = 'admin.reachability';
  const labels = new Map(rows.map((row) => [row.key, row.label]));
  const items = [...batchTargets(batch).entries()]
    .sort(([, a], [, b]) => ORDER[a.state] - ORDER[b.state])
    .slice(0, ASIDE_ROWS);

  const words = (progress: TargetProgress): { text: string; tone: string } => {
    if (progress.state === 'queued')
      return { text: t(`${base}.batch.queued`), tone: 'text-dark-500' };
    if (progress.state === 'checking') {
      const count =
        progress.total > 0
          ? ` · ${t(`${base}.fleet.ofUnits`, { ok: progress.ok, total: progress.total })}`
          : '';
      return progress.done > 0
        ? { text: `${t(`${base}.fleet.state.checking`)}${count}`, tone: 'text-accent-400' }
        : { text: t(`${base}.fleet.state.checking`), tone: 'text-accent-400' };
    }
    const count =
      progress.total > 0
        ? ` · ${t(`${base}.fleet.ofUnits`, { ok: progress.ok, total: progress.total })}`
        : '';
    return { text: `${t(`${base}.fleet.justNow`)}${count}`, tone: 'text-dark-300' };
  };

  return (
    <section className="space-y-3 rounded-2xl border border-dark-700/40 bg-dark-900/60 p-5">
      <h3 className="text-[13px] font-semibold text-dark-400">{t(`${base}.batch.aside`)}</h3>
      <ul className="divide-y divide-dark-700/30">
        {items.map(([key, progress]) => {
          const { text, tone } = words(progress);
          return (
            <li key={key} className="flex min-h-[40px] items-center gap-2.5 py-1.5">
              {progress.state === 'checking' ? (
                <Spinner className="h-3.5 w-3.5 shrink-0 text-accent-400" />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    progress.state === 'done' ? 'bg-success-400' : 'bg-dark-500',
                  )}
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-dark-100">
                {labels.get(key) ?? key}
              </span>
              <span className={cn('text-[13px]', tone)}>{text}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-dark-400">
        {t(`${base}.batch.spentSoFar`, { price: formatCredits(spentSoFar(batch)) })}
      </p>
    </section>
  );
}
