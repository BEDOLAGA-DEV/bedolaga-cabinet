import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi, type Monitor } from '@/api/dpichecker';
import { Toggle } from '@/components/admin/Toggle';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { usePermissionStore } from '@/store/permissions';
import { getApiErrorMessage } from '@/utils/api-error';

const KEY = ['dpichecker', 'monitors'];

function when(value: string | null): string {
  return value
    ? new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
    : '—';
}

function MonitorCard({ monitor, canRun }: { monitor: Monitor; canRun: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fromSite = monitor.action_id === null;
  const manageable = canRun && !monitor.deleted;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: KEY });
  // Монитор с сайта кабинет сначала берёт себе (своя строка), дальше — как созданный здесь.
  const ownId = async () => monitor.action_id ?? (await dpicheckerApi.adoptMonitor(monitor.id)).id;
  const patch = useMutation({
    mutationFn: async (body: { is_active: boolean }) =>
      dpicheckerApi.patchMonitor(await ownId(), body),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => dpicheckerApi.deleteMonitor(await ownId()),
    onSettled: refresh,
  });
  const down = monitor.consecutive_fails > 0;
  return (
    <section className="bento-card space-y-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-dark-100">
            {monitor.label ?? t('admin.dpichecker.monitors.untitled', { id: monitor.id })}
          </h3>
          {fromSite && (
            <p className="text-xs text-dark-400">{t('admin.dpichecker.monitors.foreign')}</p>
          )}
          <p className="text-xs text-dark-400">
            {[
              t(`admin.dpichecker.tabs.${monitor.check_type}`),
              t(`admin.dpichecker.locations.${monitor.location}`),
              t('admin.dpichecker.result.points', { count: monitor.pop_ids.length }),
              t('admin.dpichecker.monitors.every', { hours: monitor.interval_hours }),
            ].join(' · ')}
          </p>
        </div>
        {manageable && (
          <Toggle
            checked={monitor.is_active}
            onChange={() => patch.mutate({ is_active: !monitor.is_active })}
            disabled={patch.isPending}
            aria-label={t('admin.dpichecker.monitors.active')}
          />
        )}
      </div>
      <p className={cn('text-sm', down ? 'text-error-400' : 'text-dark-200')}>
        {monitor.last_status
          ? t(`admin.dpichecker.status.${monitor.last_status}`, {
              defaultValue: monitor.last_status,
            })
          : t('admin.dpichecker.monitors.noRuns')}
        {down && ` · ${t('admin.dpichecker.monitors.fails', { count: monitor.consecutive_fails })}`}
      </p>
      <p className="text-xs text-dark-400">
        {t('admin.dpichecker.monitors.lastNext', {
          last: when(monitor.last_checked_at),
          next: when(monitor.next_run_at),
        })}
      </p>
      {!monitor.deleted && !monitor.is_active && monitor.paused_reason && (
        <p className="text-xs text-warning-400">
          {t(`admin.dpichecker.monitors.paused.${monitor.paused_reason}`, {
            defaultValue: t('admin.dpichecker.monitors.paused.other'),
          })}
        </p>
      )}
      {manageable && (
        <div className="flex flex-wrap gap-2 pt-1">
          {!confirmDelete ? (
            <button
              type="button"
              className="btn-ghost min-h-[40px] px-3 text-sm"
              onClick={() => setConfirmDelete(true)}
            >
              {t('admin.dpichecker.monitors.delete')}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-danger min-h-[40px] px-3 text-sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                {t('admin.dpichecker.monitors.deleteConfirm')}
              </button>
              <button
                type="button"
                className="btn-ghost min-h-[40px] px-3 text-sm"
                onClick={() => setConfirmDelete(false)}
              >
                {t('admin.dpichecker.form.cancel')}
              </button>
            </>
          )}
        </div>
      )}
      {(patch.error || remove.error) && (
        <p className="text-sm text-error-400">
          {getApiErrorMessage(patch.error ?? remove.error, t('admin.dpichecker.form.failed'))}
        </p>
      )}
    </section>
  );
}

/**
 * Мониторы: проверка по расписанию. Любым живым монитором аккаунта можно управлять — и созданным
 * на сайте DPI//CHECKER; удалённые у сервиса (DELETE там ставит паузу) — в свёрнутом «Отключённые».
 */
export function MonitorsTab() {
  const { t } = useTranslation();
  const canRun = usePermissionStore((state) => state.hasPermission('dpichecker:run'));
  const query = useQuery({ queryKey: KEY, queryFn: dpicheckerApi.listMonitors });
  const live = query.data?.filter((monitor) => !monitor.deleted) ?? [];
  const gone = query.data?.filter((monitor) => monitor.deleted) ?? [];
  return (
    <div className="space-y-4">
      <section className="bento-card space-y-2 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-dark-100">
          {t('admin.dpichecker.monitors.howTitle')}
        </h2>
        <ol className="list-decimal space-y-1 ps-5 text-sm text-dark-200">
          <li>{t('admin.dpichecker.monitors.how.create')}</li>
          <li>{t('admin.dpichecker.monitors.how.runs')}</li>
          <li>{t('admin.dpichecker.monitors.how.alerts')}</li>
          <li>{t('admin.dpichecker.monitors.how.manage')}</li>
        </ol>
      </section>
      {query.isLoading && (
        <SkeletonGroup className="space-y-3">
          <Skeleton variant="card" className="h-28 w-full" />
          <Skeleton variant="card" className="h-28 w-full" />
        </SkeletonGroup>
      )}
      {query.isError && (
        <p className="text-sm text-error-400">
          {getApiErrorMessage(query.error, t('admin.dpichecker.result.loadFailed'))}
        </p>
      )}
      {query.data && live.length === 0 && (
        <p className="text-sm text-dark-400">{t('admin.dpichecker.monitors.empty')}</p>
      )}
      {live.map((monitor) => (
        <MonitorCard key={monitor.id} monitor={monitor} canRun={canRun} />
      ))}
      {gone.length > 0 && (
        <details className="group space-y-3">
          <summary className="cursor-pointer select-none text-sm text-dark-400 hover:text-dark-200">
            {t('admin.dpichecker.monitors.deletedBlock', { count: gone.length })}
          </summary>
          <div className="mt-3 space-y-3">
            {gone.map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} canRun={canRun} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
