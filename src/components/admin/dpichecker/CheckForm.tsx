import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import {
  type CheckType,
  dpicheckerApi,
  type Location,
  type Pop,
  type ProbeMode,
} from '@/api/dpichecker';
import { usePlatform } from '@/platform';
import { useNativeDialog } from '@/platform/hooks/useNativeDialog';
import { getApiErrorMessage } from '@/utils/api-error';
import { buildLink, type Tab } from './deepLink';
import { activeTargets, canPay } from './formState';
import { PopPicker } from './PopPicker';
import { type PanelKind, TargetsStep, type TargetsValue } from './TargetsStep';
import { type RunMode, type ScheduleValue, TotalStep, usd4 } from './TotalStep';
import { DPI_STATUS_KEY, useDpiStatus } from './useDpiStatus';
import { useDebouncedValue } from '../reachability/useDebouncedValue';
import { effectiveSelection } from './popSelection';

const TOPUP_URL = 'https://dpichecker.st/topup';
const ESTIMATE_DEBOUNCE_MS = 400;
const DEFAULT_SCHEDULE: ScheduleValue = {
  intervalHours: 6,
  alertAfterFails: 2,
  notifyOnSuccess: false,
  notify: 'dm',
};

/** Шаг формы — заголовок без номера «01/02», как разделы формы BSCHEKER (номера владельцу непонятны). */
function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bento-card space-y-3 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-dark-100">{title}</h2>
      {children}
    </section>
  );
}

interface CheckFormProps {
  checkType: CheckType;
  prefill?: { kind: PanelKind; ref: string } | null;
}

/**
 * Проверка VPN / IP / MTProto в три шага, как на dpichecker.st: «Что проверяем» → «Откуда
 * проверяем» → «Итого» с ценой от сервиса и оплатой после подтверждения суммы. Тот же экран
 * создаёт монитор («По расписанию»): каждый его прогон стоит как такая проверка.
 */
export function CheckForm({ checkType, prefill = null }: CheckFormProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openLink, platform } = usePlatform();
  const dialog = useNativeDialog();
  const { data: status } = useDpiStatus();

  const [targets, setTargets] = useState<TargetsValue>({
    resources: [],
    source: 'paste',
    sourceRef: null,
  });
  const [location, setLocation] = useState<Location>('russia');
  const [pops, setPops] = useState<Pop[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [probeMode, setProbeMode] = useState<ProbeMode>('auto');
  const [runMode, setRunMode] = useState<RunMode>('once');
  const [schedule, setSchedule] = useState<ScheduleValue>(DEFAULT_SCHEDULE);
  const [confirming, setConfirming] = useState(false);
  // Два клика подряд успевают до перерисовки (isPending ещё false) — второй запуск списал бы деньги.
  const inFlight = useRef(false);

  const chosen = activeTargets(targets.resources);
  const popIds = effectiveSelection(selected, pops);
  // Строкой: объект, созданный заново на каждой отрисовке, будил бы задержку без конца.
  const priceKey = useDebouncedValue(
    JSON.stringify({ popIds, values: chosen.map((target) => target.value), location }),
    ESTIMATE_DEBOUNCE_MS,
  );
  const priceInput = JSON.parse(priceKey) as {
    popIds: number[];
    values: string[];
    location: Location;
  };
  const estimate = useQuery({
    queryKey: ['dpichecker', 'estimate', checkType, priceKey],
    queryFn: () =>
      dpicheckerApi.estimate({
        check_type: checkType,
        location: priceInput.location,
        pop_ids: priceInput.popIds,
        resources: priceInput.values,
      }),
    enabled: priceInput.popIds.length > 0 && priceInput.values.length > 0,
  });
  const cost = estimate.data?.estimated_cost ?? null;
  const balance = status?.balance ?? null;
  const payable = canPay({ pops: popIds.length, resources: targets.resources, cost, balance });
  const short = cost !== null && balance !== null && cost > balance;

  const launch = useMutation({
    onSettled: () => {
      inFlight.current = false;
    },
    mutationFn: () => {
      const body = {
        check_type: checkType,
        location,
        pop_ids: popIds,
        targets: chosen,
        source: targets.source,
        source_ref: targets.sourceRef,
        probe_mode: probeMode,
      };
      return runMode === 'schedule'
        ? dpicheckerApi.createMonitor({
            ...body,
            interval_hours: schedule.intervalHours,
            alert_after_fails: schedule.alertAfterFails,
            notify_on_success: schedule.notifyOnSuccess,
            notify: schedule.notify,
          })
        : dpicheckerApi.launchCheck(body);
    },
    onSuccess: (action) => {
      void queryClient.invalidateQueries({ queryKey: DPI_STATUS_KEY });
      setConfirming(false);
      navigate(
        runMode === 'schedule'
          ? buildLink({ tab: 'monitors' })
          : buildLink({ tab: checkType as Tab, check: action.id }),
      );
    },
    onError: () => setConfirming(false),
  });

  const confirmLabel =
    runMode === 'schedule'
      ? t('admin.dpichecker.form.confirmMonitor', { value: usd4(cost) })
      : t('admin.dpichecker.form.confirmPay', { value: usd4(cost) });
  const startPay = useCallback(async () => {
    if (!payable || launch.isPending) return;
    // В Mini App — родной попап Telegram, в браузере — второй шаг в той же панели.
    if (platform === 'telegram') {
      if ((await dialog.confirm(confirmLabel)) && !inFlight.current) {
        inFlight.current = true;
        launch.mutate();
      }
      return;
    }
    setConfirming(true);
  }, [payable, launch, platform, dialog, confirmLabel]);

  const onPops = useCallback((loaded: Pop[]) => setPops(loaded), []);
  const hasTargets = chosen.length > 0;

  return (
    <div className="space-y-4">
      <Step title={t('admin.dpichecker.form.step1')}>
        <TargetsStep
          checkType={checkType}
          value={targets}
          onChange={setTargets}
          prefill={prefill}
        />
      </Step>
      {hasTargets && (
        <Step title={t('admin.dpichecker.form.step2')}>
          <PopPicker
            location={location}
            onLocation={setLocation}
            selected={selected}
            onSelected={setSelected}
            onPops={onPops}
          />
        </Step>
      )}
      {hasTargets && popIds.length > 0 && (
        <Step title={t('admin.dpichecker.form.step3')}>
          <TotalStep
            checkType={checkType}
            pops={popIds.length}
            resources={chosen.length}
            estimate={estimate.data}
            estimating={estimate.isFetching}
            balance={balance}
            probeMode={probeMode}
            onProbeMode={setProbeMode}
            runMode={runMode}
            onRunMode={setRunMode}
            schedule={schedule}
            onSchedule={setSchedule}
          />
          {estimate.isError && (
            <p className="text-sm text-error-400">
              {getApiErrorMessage(estimate.error, t('admin.dpichecker.form.estimateFailed'))}
            </p>
          )}
          {launch.isError && (
            <p className="text-sm text-error-400">
              {getApiErrorMessage(launch.error, t('admin.dpichecker.form.failed'))}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            {!confirming && (
              <button
                type="button"
                className="btn-primary min-h-[44px] px-5 text-sm"
                disabled={!payable || launch.isPending}
                onClick={() => void startPay()}
              >
                {runMode === 'schedule'
                  ? t('admin.dpichecker.form.createMonitor')
                  : t('admin.dpichecker.form.pay')}
              </button>
            )}
            {confirming && (
              <>
                <button
                  type="button"
                  className="btn-primary min-h-[44px] px-5 text-sm"
                  disabled={launch.isPending}
                  onClick={() => {
                    if (inFlight.current) return;
                    inFlight.current = true;
                    launch.mutate();
                  }}
                >
                  {confirmLabel}
                </button>
                <button
                  type="button"
                  className="btn-ghost min-h-[44px] px-4 text-sm"
                  disabled={launch.isPending}
                  onClick={() => setConfirming(false)}
                >
                  {t('admin.dpichecker.form.cancel')}
                </button>
              </>
            )}
            {short && (
              <button
                type="button"
                className="btn-secondary min-h-[44px] px-4 text-sm"
                onClick={() => openLink(TOPUP_URL)}
              >
                {t('admin.dpichecker.header.topup')}
              </button>
            )}
          </div>
        </Step>
      )}
    </div>
  );
}
