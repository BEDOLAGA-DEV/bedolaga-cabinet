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
  const own = monitor.action_id !== null;
  const refresh = () => void queryClient.invalidateQueries({ queryKey: KEY });
  const patch = useMutation({
    mutationFn: (body: { is_active: boolean }) =>
      dpicheckerApi.patchMonitor(monitor.action_id as number, body),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: () => dpicheckerApi.deleteMonitor(monitor.action_id as number),
    onSuccess: refresh,
  });
  const down = monitor.consecutive_fails > 0;
  return (
    <section className="bento-card space-y-2 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-dark-100">
            {monitor.label ?? t('admin.dpichecker.monitors.foreign')}
          </h3>
          <p className="text-xs text-dark-400">
            {[
              t(`admin.dpichecker.tabs.${monitor.check_type}`),
              t(`admin.dpichecker.locations.${monitor.location}`),
              t('admin.dpichecker.result.points', { count: monitor.pop_ids.length }),
              t('admin.dpichecker.monitors.every', { hours: monitor.interval_hours }),
            ].join(' · ')}
          </p>
        </div>
        {own && canRun && (
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
      {!monitor.is_active && monitor.paused_reason && (
        <p className="text-xs text-warning-400">
          {t(`admin.dpichecker.monitors.paused.${monitor.paused_reason}`, {
            defaultValue: t('admin.dpichecker.monitors.paused.other'),
          })}
        </p>
      )}
      {own && canRun && (
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

/** Мониторы: свои — пауза и отключение; созданные на сайте DPI//CHECKER — только посмотреть. */
export function MonitorsTab() {
  const { t } = useTranslation();
  const canRun = usePermissionStore((state) => state.hasPermission('dpichecker:run'));
  const query = useQuery({ queryKey: KEY, queryFn: dpicheckerApi.listMonitors });
  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-300">{t('admin.dpichecker.monitors.intro')}</p>
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
      {query.data?.length === 0 && (
        <p className="text-sm text-dark-400">{t('admin.dpichecker.monitors.empty')}</p>
      )}
      {query.data?.map((monitor) => (
        <MonitorCard key={monitor.id} monitor={monitor} canRun={canRun} />
      ))}
    </div>
  );
}
