import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { dpicheckerApi, type Monitor, type MonitorRun } from '@/api/dpichecker';
import { Toggle } from '@/components/admin/Toggle';
import { CopyIcon } from '@/components/icons';
import { useToast } from '@/components/Toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { copyToClipboard } from '@/utils/clipboard';
import { buildLink } from './deepLink';
import { formatDate, toneOf } from './historyStyle';
import { NumberField, usd4 } from './TotalStep';

const RUNS_LIMIT = 10;
export const MONITORS_KEY = ['dpichecker', 'monitors'];

function RunLine({ run }: { run: MonitorRun }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Прогон — обычная проверка сервиса: кабинет берёт её себе и открывает как свою.
  const open = useMutation({
    mutationFn: (checkId: number) => dpicheckerApi.openRemote('check', checkId),
    onSuccess: (action) => navigate(buildLink({ tab: 'history', check: action.id })),
  });
  const status = run.check_status ?? run.status;
  const tone = toneOf(status);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-dark-800/60 py-2 last:border-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-sm tabular-nums text-dark-100">
          {formatDate(run.scheduled_for ?? run.created_at)}
        </span>
        <span className={cn('flex items-center gap-1.5 text-xs font-medium', tone.text)}>
          <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone.dot)} />
          {t(`admin.dpichecker.status.${status}`, { defaultValue: status })}
          {run.cost !== null && (
            <span className="font-normal tabular-nums text-dark-400">
              · {t('admin.dpichecker.monitors.runCost', { value: usd4(run.cost) })}
            </span>
          )}
        </span>
      </span>
      {run.check_id !== null && (
        <button
          type="button"
          className="btn-secondary min-h-[40px] px-3 text-sm"
          disabled={open.isPending}
          onClick={() => run.check_id !== null && open.mutate(run.check_id)}
        >
          {t('admin.dpichecker.monitors.runOpen')}
        </button>
      )}
      {open.isError && (
        <p className="w-full text-sm text-error-400">
          {getApiErrorMessage(open.error, t('admin.dpichecker.history.openFailed'))}
        </p>
      )}
    </li>
  );
}

/** Последние прогоны монитора; `resolveId` — номер своей строки (монитор с сайта берётся себе). */
export function MonitorRuns({
  monitor,
  resolveId,
}: {
  monitor: Monitor;
  resolveId: () => Promise<number>;
}) {
  const { t } = useTranslation();
  const runs = useQuery({
    queryKey: ['dpichecker', 'monitor-runs', monitor.id],
    queryFn: async () => dpicheckerApi.monitorRuns(await resolveId(), RUNS_LIMIT, 0),
  });
  if (runs.isLoading) return <Skeleton className="h-10 w-full" />;
  if (runs.isError)
    return (
      <p className="text-sm text-error-400">
        {getApiErrorMessage(runs.error, t('admin.dpichecker.monitors.runsFailed'))}
      </p>
    );
  if (!runs.data?.items.length)
    return <p className="text-sm text-dark-400">{t('admin.dpichecker.monitors.runsEmpty')}</p>;
  return (
    <ul>
      {runs.data.items.map((run) => (
        <RunLine key={run.id} run={run} />
      ))}
    </ul>
  );
}

/** Интервал, порог тревоги и «сообщать об успехе» — то, что сервис даёт поменять у живого монитора. */
export function MonitorSettings({
  monitor,
  resolveId,
  onDone,
}: {
  monitor: Monitor;
  resolveId: () => Promise<number>;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [value, setValue] = useState({
    interval_hours: monitor.interval_hours,
    alert_after_fails: monitor.alert_after_fails,
    notify_on_success: monitor.notify_on_success,
  });
  const save = useMutation({
    mutationFn: async () => dpicheckerApi.patchMonitor(await resolveId(), value),
    onSuccess: onDone,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: MONITORS_KEY }),
  });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <NumberField
          label={t('admin.dpichecker.form.schedule.interval')}
          value={value.interval_hours}
          min={1}
          max={168}
          onChange={(interval_hours) => setValue({ ...value, interval_hours })}
        />
        <NumberField
          label={t('admin.dpichecker.form.schedule.alertAfter')}
          value={value.alert_after_fails}
          min={1}
          max={20}
          onChange={(alert_after_fails) => setValue({ ...value, alert_after_fails })}
        />
        <label className="flex items-center gap-2 text-sm text-dark-200">
          <Toggle
            checked={value.notify_on_success}
            onChange={() => setValue({ ...value, notify_on_success: !value.notify_on_success })}
            aria-label={t('admin.dpichecker.form.schedule.notifyOnSuccess')}
          />
          {t('admin.dpichecker.form.schedule.notifyOnSuccess')}
        </label>
      </div>
      <button
        type="button"
        className="btn-primary min-h-[44px] px-5 text-sm"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {t('admin.dpichecker.monitors.save')}
      </button>
      {save.isError && (
        <p className="text-sm text-error-400">
          {getApiErrorMessage(save.error, t('admin.dpichecker.form.failed'))}
        </p>
      )}
    </div>
  );
}

/** Тревоги их бота — в группу: пока группа не привязана, показываем команду привязки. */
export function GroupLink({ code }: { code: string }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const command = `/link ${code}`;
  return (
    <div className="space-y-2 rounded-2xl border border-accent-500/30 bg-accent-500/10 p-3">
      <p className="text-sm font-medium text-dark-100">
        {t('admin.dpichecker.monitors.groupTitle')}
      </p>
      <p className="text-sm text-dark-200">{t('admin.dpichecker.monitors.groupHow')}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-dark-800 px-2 py-1 text-sm text-dark-100">{command}</code>
        <button
          type="button"
          className="btn-secondary inline-flex min-h-[40px] items-center gap-2 px-3 text-sm"
          onClick={() =>
            void copyToClipboard(command)
              .then(() =>
                showToast({ type: 'success', message: t('admin.dpichecker.monitors.copied') }),
              )
              .catch(() => showToast({ type: 'error', message: t('admin.dpichecker.form.failed') }))
          }
        >
          <CopyIcon className="h-4 w-4" />
          {t('admin.dpichecker.monitors.copy')}
        </button>
      </div>
    </div>
  );
}
