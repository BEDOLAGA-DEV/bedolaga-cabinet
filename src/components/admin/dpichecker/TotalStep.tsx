import { useTranslation } from 'react-i18next';
import type { CheckType, Estimate, MonitorNotify, ProbeMode } from '@/api/dpichecker';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Toggle } from '@/components/admin/Toggle';
import { cn } from '@/lib/utils';
import { Segmented } from '../Segmented';

export type RunMode = 'once' | 'schedule';

export interface ScheduleValue {
  intervalHours: number;
  alertAfterFails: number;
  notifyOnSuccess: boolean;
  /** Куда тревоги шлёт бот DPI//CHECKER; итоги в админ-чат бота приходят в любом случае. */
  notify: MonitorNotify;
}

interface TotalStepProps {
  checkType: CheckType;
  pops: number;
  resources: number;
  estimate: Estimate | undefined;
  estimating: boolean;
  balance: number | null;
  probeMode: ProbeMode;
  onProbeMode: (mode: ProbeMode) => void;
  runMode: RunMode;
  onRunMode: (mode: RunMode) => void;
  schedule: ScheduleValue;
  onSchedule: (value: ScheduleValue) => void;
}

const PROBE_MODES: ProbeMode[] = ['auto', 'server', 'noserver'];
export const usd4 = (value: number | string | null | undefined) => Number(value ?? 0).toFixed(4);

function Stat({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-dark-800/50 px-3 py-2">
      <div className="text-xs text-dark-400">{label}</div>
      <div
        className={cn(
          'text-sm font-semibold tabular-nums',
          bad ? 'text-error-400' : 'text-dark-100',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-dark-400">
      {label}
      <input
        type="number"
        className="input w-28"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value, 10);
          if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)));
        }}
      />
    </label>
  );
}

/** «03 Итого»: точки, ресурсы, цена от сервиса, баланс; режим IP; разово или по расписанию. */
export function TotalStep(props: TotalStepProps) {
  const { t } = useTranslation();
  const { estimate, balance, schedule } = props;
  const cost = estimate?.estimated_cost ?? null;
  const short = cost !== null && balance !== null && cost > balance;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('admin.dpichecker.form.total.pops')} value={String(props.pops)} />
        <Stat label={t('admin.dpichecker.form.total.resources')} value={String(props.resources)} />
        <Stat
          label={t('admin.dpichecker.form.total.cost')}
          value={
            props.estimating && cost === null
              ? '…'
              : t('admin.dpichecker.money.usd', { value: usd4(cost) })
          }
          bad={short}
        />
        <Stat
          label={t('admin.dpichecker.form.total.balance')}
          value={t('admin.dpichecker.money.usd', { value: usd4(balance) })}
        />
      </div>
      {estimate && (
        <p className="text-xs text-dark-400">
          {t('admin.dpichecker.form.total.tariff', {
            pop: estimate.pop_price,
            resource: estimate.resource_price,
          })}
          {props.runMode === 'schedule' && ` · ${t('admin.dpichecker.form.schedule.perRun')}`}
        </p>
      )}

      {props.checkType === 'ip' && (
        <div className="space-y-1">
          <span className="text-sm font-medium text-dark-100">
            {t('admin.dpichecker.form.probeMode.label')}
          </span>
          <DropdownSelect
            value={props.probeMode}
            options={PROBE_MODES.map((mode) => ({
              value: mode,
              label: t(`admin.dpichecker.form.probeMode.${mode}`),
            }))}
            onChange={(value) => props.onProbeMode(value as ProbeMode)}
            className="w-full sm:w-96"
          />
          <p className="text-xs text-dark-400">{t('admin.dpichecker.form.probeMode.hint')}</p>
        </div>
      )}

      <div className="space-y-3">
        <Segmented
          value={props.runMode}
          options={[
            { value: 'once', label: t('admin.dpichecker.form.once') },
            { value: 'schedule', label: t('admin.dpichecker.form.scheduled') },
          ]}
          onChange={props.onRunMode}
          label={t('admin.dpichecker.form.runMode')}
          size="md"
        />
        {props.runMode === 'schedule' && (
          <div className="flex flex-wrap items-end gap-4">
            <NumberField
              label={t('admin.dpichecker.form.schedule.interval')}
              value={schedule.intervalHours}
              min={1}
              max={168}
              onChange={(intervalHours) => props.onSchedule({ ...schedule, intervalHours })}
            />
            <NumberField
              label={t('admin.dpichecker.form.schedule.alertAfter')}
              value={schedule.alertAfterFails}
              min={1}
              max={20}
              onChange={(alertAfterFails) => props.onSchedule({ ...schedule, alertAfterFails })}
            />
            <label className="flex items-center gap-2 text-sm text-dark-200">
              <Toggle
                checked={schedule.notifyOnSuccess}
                onChange={() =>
                  props.onSchedule({ ...schedule, notifyOnSuccess: !schedule.notifyOnSuccess })
                }
                aria-label={t('admin.dpichecker.form.schedule.notifyOnSuccess')}
              />
              {t('admin.dpichecker.form.schedule.notifyOnSuccess')}
            </label>
          </div>
        )}
        {props.runMode === 'schedule' && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-dark-100">
              {t('admin.dpichecker.form.schedule.notify')}
            </span>
            <Segmented
              value={schedule.notify}
              options={[
                { value: 'dm', label: t('admin.dpichecker.form.schedule.notifyDm') },
                { value: 'group', label: t('admin.dpichecker.form.schedule.notifyGroup') },
              ]}
              onChange={(notify) => props.onSchedule({ ...schedule, notify })}
              label={t('admin.dpichecker.form.schedule.notify')}
              size="md"
            />
            <p className="text-xs text-dark-400">
              {t('admin.dpichecker.form.schedule.notifyHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
