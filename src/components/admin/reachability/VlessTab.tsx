import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReachabilityStatus, VlessCore } from '@/api/reachability';
import { JobProgress } from './JobProgress';
import { LaunchPanel } from './LaunchPanel';
import { SubscriptionConfigs } from './SubscriptionConfigs';
import { SubscriptionSourcePicker } from './SubscriptionSourcePicker';
import { UnitPicker } from './UnitPicker';
import { buildVlessBody } from './jobBodies';
import { type DpiFilter, defaultDpiFor } from './unitSelection';
import { useSubscriptionConfigs } from './useTargets';

export interface VlessTabProps {
  status: ReachabilityStatus | undefined;
  userId: number | null;
  shortUuid: string | null;
}

const CORES: Array<{ value: VlessCore; key: string }> = [
  { value: '', key: 'coreAuto' },
  { value: 'stable', key: 'coreStable' },
  { value: 'prerelease', key: 'corePrerelease' },
];

export function VlessTab(props: VlessTabProps) {
  const { t } = useTranslation();
  const [source, setSource] = useState({ userId: props.userId, shortUuid: props.shortUuid });
  const [selected, setSelected] = useState<number[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [dpiOverride, setDpiOverride] = useState<DpiFilter | null>(null);
  const [core, setCore] = useState<VlessCore>('');
  const [jobId, setJobId] = useState<number | null>(null);
  const configs = useSubscriptionConfigs(source.userId, source.shortUuid);

  const chosen = useMemo(
    () => (configs.data?.configs ?? []).filter((config) => selected.includes(config.index)),
    [configs.data, selected],
  );
  const dpi = dpiOverride ?? defaultDpiFor(chosen.map((config) => config.purpose));
  const body = useMemo(
    () =>
      buildVlessBody({
        shortUuid: configs.data?.short_uuid ?? null,
        indexes: selected,
        units,
        dpi,
        core,
      }),
    [configs.data, selected, units, dpi, core],
  );

  const changeSource = (next: { userId: number | null; shortUuid: string | null }) => {
    setSource(next);
    setSelected([]);
  };
  const toggle = (index: number) =>
    setSelected((list) =>
      list.includes(index) ? list.filter((item) => item !== index) : [...list, index],
    );

  if (jobId !== null) {
    return <JobProgress jobId={jobId} onReset={() => setJobId(null)} />;
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-dark-700/60 bg-dark-800/60 p-4">
        <h2 className="text-lg font-semibold text-dark-100">
          {t('admin.reachability.subscription.title')}
        </h2>
        <SubscriptionSourcePicker
          userId={source.userId}
          shortUuid={source.shortUuid}
          onSource={changeSource}
        />
        <SubscriptionConfigs
          data={configs.data}
          isLoading={configs.isLoading}
          error={configs.error}
          selected={selected}
          onToggle={toggle}
        />
        <label className="flex items-center gap-2 text-sm text-dark-200">
          <span className="text-xs uppercase tracking-wide text-dark-400">
            {t('admin.reachability.subscription.core')}
          </span>
          <select
            value={core}
            onChange={(event) => setCore(event.target.value as VlessCore)}
            className="rounded-lg border border-dark-700 bg-dark-900 px-2 py-1 text-xs text-dark-100"
          >
            {CORES.map((item) => (
              <option key={item.value} value={item.value}>
                {t(`admin.reachability.subscription.${item.key}`)}
              </option>
            ))}
          </select>
        </label>
      </section>
      <UnitPicker
        kind="vless"
        dpi={dpi}
        onDpiChange={setDpiOverride}
        selected={units}
        onChange={setUnits}
      />
      <LaunchPanel body={body} status={props.status} onStarted={(job) => setJobId(job.id)} />
    </div>
  );
}
