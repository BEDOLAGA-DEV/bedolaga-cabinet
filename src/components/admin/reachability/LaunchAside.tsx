import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { SkippedUnit } from '@/api/reachability';
import { ChevronDownIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { HIDDEN_UNDER_KEYBOARD, useVirtualKeyboard } from '@/hooks/useVirtualKeyboard';
import { cn } from '@/lib/utils';
import { LaunchConfirm } from './LaunchConfirm';
import type { LaunchState } from './useLaunch';
import { formatCredits, formatKopeks, formatMoney } from './money';
import { unitNames } from './unitLabel';
import { useUnits } from './useUnits';

export interface LaunchProps {
  launch: LaunchState;
  /** Строка под итогом: «Списывается только за проверенные симки…». */
  hint?: string;
  /** GEO: сервис отказал «слишком много городов» и предложил потолок — кнопка ставит его в форму. */
  onApplyCityLimit?: (limit: number) => void;
}

/** Число из отказа бота «…сервис предлагает потолок N городов». */
const SUGGESTED_LIMIT = /потолок (\d+)/;

function suggestedCityLimit(launch: LaunchState): number | null {
  if (launch.kind !== 'geo' || !launch.blocker) return null;
  const match = SUGGESTED_LIMIT.exec(launch.blocker);
  return match ? Number(match[1]) : null;
}

function ApplyCityLimit({
  launch,
  onApply,
}: {
  launch: LaunchState;
  onApply?: (n: number) => void;
}) {
  const { t } = useTranslation();
  const limit = suggestedCityLimit(launch);
  if (limit === null || !onApply || launch.confirming) return null;
  return (
    <Button variant="secondary" className="mt-2" onClick={() => onApply(limit)}>
      {t('admin.reachability.geo.launch.applyLimit', { count: limit })}
    </Button>
  );
}

function skippedNames(list: SkippedUnit[] | undefined, catalog: Parameters<typeof unitNames>[1]) {
  const opKeys = (list ?? [])
    .map((skipped) => skipped.op_key)
    .filter((opKey): opKey is string => Boolean(opKey));
  return unitNames(opKeys, catalog);
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Ключ подписи кнопки: по виду задачи, для пачки серверов — своё слово. */
function runKey(launch: LaunchState, short: boolean): string {
  const suffix = short ? 'Short' : '';
  if (launch.noun === 'servers') return `run${suffix}Hosts`;
  if (launch.kind === 'geo') return `run${suffix}Geo`;
  if (launch.kind === 'vless') return `run${suffix}Vless`;
  if (launch.kind === 'scan') return `run${suffix}Scan`;
  return `run${suffix}Probe`;
}

/** Подпись главной кнопки: «Запускаем…» → «Списать …» на втором шаге → «Проверить N …». */
export function primaryLabel(t: Translate, launch: LaunchState, short: boolean): string {
  if (launch.isPending) return t('admin.reachability.launch.running');
  if (launch.confirming) {
    return t('admin.reachability.launch.confirmCharge', { price: formatCredits(launch.cost) });
  }
  const price = launch.cost === null ? null : formatCredits(launch.cost);
  if (launch.targetsCount === 0 || (!short && price === null)) {
    return t('admin.reachability.launch.runEmpty');
  }
  // GEO считает города, не цели: «Проверить 89 городов».
  const count =
    launch.kind === 'geo' ? (launch.geo?.n_nodes ?? launch.targetsCount) : launch.targetsCount;
  return t(`admin.reachability.launch.${runKey(launch, short)}`, { count, price });
}

/** Строки итога: цели × симки, цена, остаток, время, пропуски. Общие для aside и нижней панели. */
function LaunchDetails({ launch }: { launch: LaunchState }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const skipped = launch.preview?.skipped ?? undefined;
  const targetsKey = launch.noun === 'servers' ? 'summaryServers' : 'summaryTargets';
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-dark-400">{t('admin.reachability.launch.targetsRow')}</dt>
        <dd className="text-dark-100">
          {t(`admin.reachability.launch.${targetsKey}`, { count: launch.targetsCount })}
        </dd>
      </div>
      {launch.kind === 'geo' ? (
        <div className="flex justify-between gap-3">
          <dt className="text-dark-400">{t('admin.reachability.geo.launch.citiesRow')}</dt>
          <dd className="text-right text-dark-100">
            {launch.isPricing ? '…' : (launch.geo?.n_nodes ?? '—')}
            {launch.geo?.max_nodes ? (
              <span className="block text-xs text-dark-400">
                {t('admin.reachability.geo.launch.maxNodes', { count: launch.geo.max_nodes })}
              </span>
            ) : null}
          </dd>
        </div>
      ) : (
        <div className="flex justify-between gap-3">
          <dt className="text-dark-400">{t('admin.reachability.launch.unitsRow')}</dt>
          <dd className="text-dark-100">
            {t('admin.reachability.launch.summaryUnits', { count: launch.unitsCount })}
          </dd>
        </div>
      )}
      {!launch.blocker && (
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
      )}
      {!launch.blocker && launch.balanceAfter !== null && (
        <div className="flex justify-between gap-3">
          <dt className="text-dark-400">{t('admin.reachability.launch.balanceAfter')}</dt>
          <dd className="tabular-nums text-dark-200">{formatMoney(launch.balanceAfter)}</dd>
        </div>
      )}
      {!launch.blocker && launch.eta !== null && (
        <div className="flex justify-between gap-3">
          <dt className="text-dark-400">{t('admin.reachability.launch.timeRow')}</dt>
          <dd className="text-dark-200">
            {t('admin.reachability.batch.minutes', { count: launch.eta })}
          </dd>
        </div>
      )}
      {launch.preview &&
        !launch.preview.estimate_is_exact &&
        launch.preview.warnings.length === 0 && (
          <p className="text-xs text-warning-400">{t('admin.reachability.launch.estimate')}</p>
        )}
      {skipped && skipped.dpi_off.length > 0 && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.launch.skippedDpiOff', {
            units: skippedNames(skipped.dpi_off, catalog),
          })}
        </p>
      )}
      {skipped && skipped.unavailable.length > 0 && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.launch.skippedUnavailable', {
            units: skippedNames(skipped.unavailable, catalog),
          })}
        </p>
      )}
      {launch.preview?.warnings.map((warning) => (
        <p key={warning} className="text-xs text-warning-400">
          {warning}
        </p>
      ))}
    </dl>
  );
}

/** Десктоп: прилипающий блок «Запуск» справа от формы. */
export function LaunchAside({ launch, hint, onApplyCityLimit }: LaunchProps) {
  const { t } = useTranslation();
  return (
    <aside
      aria-labelledby="reachability-launch-title"
      className={cn(
        'rounded-2xl border bg-dark-900/60 p-4 transition-colors lg:sticky lg:top-4',
        launch.confirming ? 'border-accent-500/40' : 'border-dark-700/60',
      )}
    >
      <h2 id="reachability-launch-title" className="text-lg font-semibold text-dark-100">
        {t('admin.reachability.launch.title')}
      </h2>
      <div className="mt-3">
        {launch.confirming ? <LaunchConfirm launch={launch} /> : <LaunchDetails launch={launch} />}
      </div>
      {launch.blocker && !launch.confirming && (
        <p className="mt-3 text-sm text-dark-400">{launch.blocker}</p>
      )}
      <ApplyCityLimit launch={launch} onApply={onApplyCityLimit} />
      <div className="mt-4 flex gap-2">
        {launch.confirming && (
          <Button variant="secondary" onClick={launch.cancel}>
            {t('common.cancel')}
          </Button>
        )}
        <Button
          variant="primary"
          className="min-w-0 flex-1"
          disabled={!launch.canRun}
          onClick={launch.run}
        >
          {primaryLabel(t, launch, false)}
        </Button>
      </div>
      {hint && !launch.confirming && <p className="mt-3 text-xs text-dark-500">{hint}</p>}
    </aside>
  );
}

/**
 * Телефон и Mini App: панель у низа экрана, детали раскрываются тапом по итогу.
 * Пока открыта экранная клавиатура, прячется — иначе всплывает над клавиатурой.
 */
export function LaunchBar({ launch, onApplyCityLimit }: LaunchProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const keyboardOpen = useVirtualKeyboard();
  const showDetails = open || launch.confirming;
  const targetsKey = launch.noun === 'servers' ? 'summaryServers' : 'summaryTargets';
  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[var(--mobile-nav-clearance)] z-40 px-3 transition-opacity duration-200',
        keyboardOpen && HIDDEN_UNDER_KEYBOARD,
      )}
    >
      <div
        className={cn(
          'mx-auto max-w-2xl rounded-2xl border bg-dark-900 p-3 shadow-2xl transition-colors',
          launch.confirming ? 'border-accent-500/50' : 'border-dark-700',
        )}
      >
        {showDetails && (
          <div className="mb-3 border-b border-dark-700/60 pb-3">
            {launch.confirming ? (
              <LaunchConfirm launch={launch} />
            ) : (
              <LaunchDetails launch={launch} />
            )}
            {launch.blocker && !launch.confirming && (
              <p className="mt-2 text-xs text-dark-400">{launch.blocker}</p>
            )}
            <ApplyCityLimit launch={launch} onApply={onApplyCityLimit} />
          </div>
        )}
        <div className="flex items-center gap-3">
          {launch.confirming ? (
            <Button variant="secondary" className="flex-1" onClick={launch.cancel}>
              {t('common.cancel')}
            </Button>
          ) : (
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
                      targets: t(`admin.reachability.launch.${targetsKey}`, {
                        count: launch.targetsCount,
                      }),
                      units:
                        launch.kind === 'geo'
                          ? t('admin.reachability.geo.result.cities', {
                              count: launch.geo?.n_nodes ?? 0,
                            })
                          : t('admin.reachability.launch.summaryUnits', {
                              count: launch.unitsCount,
                            }),
                    })}
                </span>
              </span>
              <ChevronDownIcon
                className={cn('h-4 w-4 shrink-0 text-dark-400', open ? '' : 'rotate-180')}
              />
            </button>
          )}
          <Button variant="primary" disabled={!launch.canRun} onClick={launch.run}>
            {primaryLabel(t, launch, true)}
          </Button>
        </div>
      </div>
    </div>
  );
}
