import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReachabilityStatus, VlessCore } from '@/api/reachability';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { Card } from '@/components/data-display';
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
      <Card size="md" className="space-y-3">
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
        <label className="flex flex-col gap-1 text-sm text-dark-200 sm:w-64">
          <span className="text-xs uppercase tracking-wide text-dark-400">
            {t('admin.reachability.subscription.core')}
          </span>
          <DropdownSelect
            value={core}
            onChange={(value) => setCore(value as VlessCore)}
            options={CORES.map((item) => ({
              value: item.value,
              label: t(`admin.reachability.subscription.${item.key}`),
            }))}
          />
        </label>
      </Card>
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
