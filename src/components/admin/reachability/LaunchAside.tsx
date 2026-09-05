import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Job,
  JobCreateRequest,
  JobKind,
  ReachabilityStatus,
  SkippedUnit,
  Unit,
} from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { type LaunchState, useLaunch } from './useLaunch';
import { formatCredits, formatKopeks, formatMoney } from './money';
import { useUnits } from './useUnits';

export interface LaunchProps {
  kind: JobKind;
  targetsCount: number;
  body: JobCreateRequest | null;
  status: ReachabilityStatus | undefined;
  onStarted: (job: Job) => void;
}

function unitNames(list: SkippedUnit[] | undefined, catalog: Unit[]): string {
  return (list ?? [])
    .map((skipped) => {
      const unit = catalog.find((item) => item.op_key === skipped.op_key);
      return unit ? `${unit.name} ${unit.region}` : skipped.op_key;
    })
    .filter(Boolean)
    .join(', ');
}

const RUN_KEY: Record<JobKind, string> = { probe: 'runProbe', vless: 'runVless', scan: 'runScan' };
const RUN_SHORT_KEY: Record<JobKind, string> = {
  probe: 'runShortProbe',
  vless: 'runShortVless',
  scan: 'runShortScan',
};

function runLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  kind: JobKind,
  count: number,
  price: string | null,
  short: boolean,
): string {
  if (count === 0 || (!short && price === null)) return t('admin.reachability.launch.runEmpty');
  const key = short ? RUN_SHORT_KEY[kind] : RUN_KEY[kind];
  return t(`admin.reachability.launch.${key}`, { count, price });
}

/** Строки итога: цели × симки, цена, остаток, пропуски. Общие для aside и нижней панели. */
function LaunchDetails({
  launch,
  targetsCount,
  unitsCount,
}: {
  launch: LaunchState;
  targetsCount: number;
  unitsCount: number;
}) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const skipped = launch.preview.data?.skipped;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-dark-400">{t('admin.reachability.launch.targetsRow')}</dt>
        <dd className="text-dark-100">
          {t('admin.reachability.launch.summaryTargets', { count: targetsCount })}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-dark-400">{t('admin.reachability.launch.unitsRow')}</dt>
        <dd className="text-dark-100">
          {t('admin.reachability.launch.summaryUnits', { count: unitsCount })}
        </dd>
      </div>
      <div className="flex justify-between gap-3 border-t border-dark-700/60 pt-1.5">
        <dt className="text-dark-400">{t('admin.reachability.launch.total')}</dt>
        <dd className="text-right">
          <span className="block font-semibold tabular-nums text-dark-50">
            {launch.isPricing ? '…' : formatCredits(launch.cost)}
          </span>
          {launch.cost !== null && !launch.isPricing && (
            <span className="block text-xs text-dark-400">≈ {formatKopeks(launch.cost)}</span>
          )}
        </dd>
      </div>
      {launch.balanceAfter !== null && (
        <div className="flex justify-between gap-3">
          <dt className="text-dark-400">{t('admin.reachability.launch.balanceAfter')}</dt>
          <dd className="tabular-nums text-dark-200">{formatMoney(launch.balanceAfter)}</dd>
        </div>
      )}
      {launch.preview.data && !launch.preview.data.estimate_is_exact && (
        <p className="text-xs text-warning-400">{t('admin.reachability.launch.estimate')}</p>
      )}
      {skipped && skipped.dpi_off.length > 0 && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.launch.skippedDpiOff', {
            units: unitNames(skipped.dpi_off, catalog),
          })}
        </p>
      )}
      {skipped && skipped.unavailable.length > 0 && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.launch.skippedUnavailable', {
            units: unitNames(skipped.unavailable, catalog),
          })}
        </p>
      )}
      {launch.preview.data?.warnings.map((warning) => (
        <p key={warning} className="text-xs text-warning-400">
          {warning}
        </p>
      ))}
    </dl>
  );
}

/** Десктоп: прилипающий блок «Запуск» справа от формы. */
export function LaunchAside(props: LaunchProps) {
  const { t } = useTranslation();
  const launch = useLaunch(props.body, props.status, props.onStarted);
  const unitsCount = props.body?.units.length ?? 0;
  const price = launch.cost === null ? null : formatCredits(launch.cost);
  return (
    <aside
      aria-labelledby="reachability-launch-title"
      className="rounded-2xl border border-dark-700/60 bg-dark-900/60 p-4 lg:sticky lg:top-4"
    >
      <h2 id="reachability-launch-title" className="text-lg font-semibold text-dark-100">
        {t('admin.reachability.launch.title')}
      </h2>
      <div className="mt-3">
        <LaunchDetails launch={launch} targetsCount={props.targetsCount} unitsCount={unitsCount} />
      </div>
      {launch.blocker && <p className="mt-3 text-sm text-warning-400">{launch.blocker}</p>}
      <Button
        variant="primary"
        className="mt-4 w-full"
        disabled={!launch.canRun}
        onClick={launch.run}
      >
        {launch.isPending
          ? t('admin.reachability.launch.running')
          : runLabel(t, props.kind, props.targetsCount, price, false)}
      </Button>
    </aside>
  );
}

/** Телефон и Mini App: панель над нижней навигацией, детали раскрываются тапом по итогу. */
export function LaunchBar(props: LaunchProps) {
  const { t } = useTranslation();
  const launch = useLaunch(props.body, props.status, props.onStarted);
  const [open, setOpen] = useState(false);
  const unitsCount = props.body?.units.length ?? 0;
  return (
    <div className="fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-40 px-3">
      <div className="mx-auto max-w-2xl rounded-2xl border border-dark-700 bg-dark-900 p-3 shadow-2xl">
        {open && (
          <div className="mb-3 border-b border-dark-700/60 pb-3">
            <LaunchDetails
              launch={launch}
              targetsCount={props.targetsCount}
              unitsCount={unitsCount}
            />
            {launch.blocker && <p className="mt-2 text-xs text-warning-400">{launch.blocker}</p>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate font-semibold tabular-nums text-dark-50">
                {launch.isPricing ? '…' : formatCredits(launch.cost)}
              </span>
              <span className="block truncate text-xs text-dark-400">
                {launch.blocker ??
                  t('admin.reachability.launch.formula', {
                    targets: t('admin.reachability.launch.summaryTargets', {
                      count: props.targetsCount,
                    }),
                    units: t('admin.reachability.launch.summaryUnits', { count: unitsCount }),
                  })}
              </span>
            </span>
            <ChevronDownIcon
              className={cn('h-4 w-4 shrink-0 text-dark-400', open ? '' : 'rotate-180')}
            />
          </button>
          <Button variant="primary" disabled={!launch.canRun} onClick={launch.run}>
            {launch.isPending
              ? t('admin.reachability.launch.running')
              : runLabel(t, props.kind, props.targetsCount, null, true)}
          </Button>
        </div>
      </div>
    </div>
  );
}
