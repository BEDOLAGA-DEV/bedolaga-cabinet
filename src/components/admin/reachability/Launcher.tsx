import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  HostTarget,
  JobKind,
  NodeTarget,
  Probes,
  ReachabilityStatus,
  VlessCore,
} from '@/api/reachability';
import { JobProgress } from './JobProgress';
import { KindSwitch } from './KindSwitch';
import { LaunchAside, LaunchBar } from './LaunchAside';
import { OperatorPicker } from './OperatorPicker';
import { ProbeTargets } from './ProbeTargets';
import { ProbesRow } from './ProbesRow';
import { ScanTargets } from './ScanTargets';
import { SectionHeading } from './SectionHeading';
import { SubscriptionTargets } from './SubscriptionTargets';
import type { DeepLink } from './deepLink';
import { buildProbeBody, buildScanBody, buildVlessBody, isCidr24 } from './jobBodies';
import { parseTargets } from './targetsInput';
import { dpiForSelection } from './unitSelection';
import { useSubscriptionConfigs } from './useTargets';
import { useUnits } from './useUnits';

interface LauncherProps {
  status: ReachabilityStatus | undefined;
  link: DeepLink;
  onKindChange: (kind: JobKind) => void;
}

const PROBE_DEFAULT: Probes = { icmp: false, tcp: true, sni: true };
const SCAN_DEFAULT: Probes = { icmp: true, tcp: true, sni: false };

function toggleBy<T extends { uuid: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.uuid === item.uuid)
    ? list.filter((entry) => entry.uuid !== item.uuid)
    : [...list, item];
}

/** Один запуск на все виды проверки: цели по виду, операторы, пробы, итог и кнопка. */
export function Launcher({ status, link, onKindChange }: LauncherProps) {
  const { t } = useTranslation();
  const kind = link.kind;
  const { data: catalog = [] } = useUnits();

  const [hosts, setHosts] = useState<HostTarget[]>([]);
  const [nodes, setNodes] = useState<NodeTarget[]>([]);
  const [own, setOwn] = useState('');
  const [source, setSource] = useState({ userId: link.userId, shortUuid: link.shortUuid });
  const [configIndexes, setConfigIndexes] = useState<number[]>([]);
  const [core, setCore] = useState<VlessCore>('');
  const [cidr, setCidr] = useState('');
  const [units, setUnits] = useState<string[]>([]);
  const [probes, setProbes] = useState<Probes>(PROBE_DEFAULT);
  const [scanProbes, setScanProbes] = useState<Probes>(SCAN_DEFAULT);
  const [jobId, setJobId] = useState<number | null>(null);

  const configs = useSubscriptionConfigs(source.userId, source.shortUuid);
  const toggleHost = useCallback(
    (host: HostTarget) => setHosts((list) => toggleBy(list, host)),
    [],
  );
  const toggleNode = useCallback(
    (node: NodeTarget) => setNodes((list) => toggleBy(list, node)),
    [],
  );
  const toggleConfig = (index: number) =>
    setConfigIndexes((list) =>
      list.includes(index) ? list.filter((item) => item !== index) : [...list, index],
    );
  const changeSource = (next: { userId: number | null; shortUuid: string | null }) => {
    setSource(next);
    setConfigIndexes([]);
  };

  const dpi = dpiForSelection(catalog, units);
  const preselectedHosts = useMemo(
    () => link.targets.filter((item) => item.kind === 'host').map((item) => item.ref),
    [link.targets],
  );
  const preselectedNodes = useMemo(
    () => link.targets.filter((item) => item.kind === 'node').map((item) => item.ref),
    [link.targets],
  );
  const ownTargets = useMemo(() => parseTargets(own).targets, [own]);
  const probeProbes: Probes = { ...probes, icmp: probes.icmp || nodes.length > 0 };

  const body = useMemo(() => {
    if (kind === 'probe') {
      return buildProbeBody({
        hosts: hosts.map((host) => host.uuid),
        nodes: nodes.map((node) => node.uuid),
        custom: ownTargets,
        units,
        dpi,
        probes,
      });
    }
    if (kind === 'vless') {
      return buildVlessBody({
        shortUuid: configs.data?.short_uuid ?? null,
        indexes: configIndexes,
        units,
        dpi,
        core,
      });
    }
    return buildScanBody({ cidr, units, dpi, probes: { ...scanProbes, sni: false } });
  }, [
    kind,
    hosts,
    nodes,
    ownTargets,
    units,
    dpi,
    probes,
    configs.data,
    configIndexes,
    core,
    cidr,
    scanProbes,
  ]);

  const targetsCount =
    kind === 'probe'
      ? hosts.length + nodes.length + ownTargets.length
      : kind === 'vless'
        ? configIndexes.length
        : isCidr24(cidr)
          ? 1
          : 0;

  if (jobId !== null) {
    return (
      <div className="space-y-6">
        <KindSwitch value={kind} onChange={onKindChange} />
        <JobProgress jobId={jobId} onReset={() => setJobId(null)} />
      </div>
    );
  }

  const launchProps = {
    kind,
    targetsCount,
    body,
    status,
    onStarted: (job: { id: number }) => setJobId(job.id),
  };

  return (
    <div className="space-y-6">
      <KindSwitch value={kind} onChange={onKindChange} />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-8">
        <div className="space-y-8">
          {kind === 'probe' && (
            <ProbeTargets
              hosts={hosts}
              onToggleHost={toggleHost}
              nodes={nodes}
              onToggleNode={toggleNode}
              own={own}
              onOwnChange={setOwn}
              preselectedHosts={preselectedHosts}
              preselectedNodes={preselectedNodes}
            />
          )}
          {kind === 'vless' && (
            <SubscriptionTargets
              userId={source.userId}
              shortUuid={source.shortUuid}
              onSource={changeSource}
              data={configs.data}
              isLoading={configs.isLoading}
              error={configs.error}
              selected={configIndexes}
              onToggle={toggleConfig}
              core={core}
              onCoreChange={setCore}
            />
          )}
          {kind === 'scan' && <ScanTargets cidr={cidr} onChange={setCidr} />}

          <OperatorPicker kind={kind} selected={units} onChange={setUnits} />

          {kind !== 'vless' && (
            <section aria-labelledby="reachability-probes" className="space-y-3">
              <SectionHeading
                id="reachability-probes"
                title={t('admin.reachability.sections.probes')}
              />
              {kind === 'probe' ? (
                <ProbesRow
                  probes={probeProbes}
                  onChange={setProbes}
                  locked={nodes.length ? ['icmp'] : []}
                />
              ) : (
                <ProbesRow
                  probes={{ ...scanProbes, sni: false }}
                  onChange={setScanProbes}
                  locked={['sni']}
                />
              )}
            </section>
          )}
        </div>
        <div className="hidden lg:block">
          <LaunchAside {...launchProps} />
        </div>
        <div className="lg:hidden">
          <LaunchBar {...launchProps} />
        </div>
      </div>
    </div>
  );
}
