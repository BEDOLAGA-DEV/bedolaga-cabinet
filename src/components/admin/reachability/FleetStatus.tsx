import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUnits } from './useUnits';

/** Живое состояние флота: сколько симок в эфире с Белым списком и без. */
export function FleetStatus({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { data: units, isLoading } = useUnits();
  if (isLoading || !units) return null;
  const alive = units.filter((unit) => unit.probeable);
  const bs = alive.filter((unit) => unit.dpi === 'on').length;
  const regular = alive.length - bs;
  return (
    <p className={cn('flex items-center gap-2 text-xs text-dark-400', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          alive.length > 0 ? 'bg-success-500' : 'bg-warning-500',
        )}
      />
      {alive.length > 0
        ? t('admin.reachability.fleet.onAir', { bs, regular })
        : t('admin.reachability.fleet.offline')}
    </p>
  );
}
