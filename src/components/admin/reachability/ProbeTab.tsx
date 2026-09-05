import { useCallback, useMemo, useState } from 'react';
import type { HostTarget, NodeTarget, Probes, ReachabilityStatus } from '@/api/reachability';
import { CustomTargetInput } from './CustomTargetInput';
import { HostsTargetList } from './HostsTargetList';
import { JobProgress } from './JobProgress';
import { LaunchPanel } from './LaunchPanel';
import { NodesTargetList } from './NodesTargetList';
import { ProbesPicker } from './ProbesPicker';
import { UnitPicker } from './UnitPicker';
import type { DeepLinkTarget } from './deepLink';
import { buildProbeBody } from './jobBodies';
import { type DpiFilter, defaultDpiFor } from './unitSelection';

export interface ProbeTabProps {
  status: ReachabilityStatus | undefined;
  preselected: DeepLinkTarget[];
}

const DEFAULT_PROBES: Probes = { icmp: false, tcp: true, sni: true };

function toggleBy<T extends { uuid: string }>(list: T[], item: T): T[] {
  return list.some((entry) => entry.uuid === item.uuid)
    ? list.filter((entry) => entry.uuid !== item.uuid)
    : [...list, item];
}

export function ProbeTab({ status, preselected }: ProbeTabProps) {
  const [hosts, setHosts] = useState<HostTarget[]>([]);
  const [nodes, setNodes] = useState<NodeTarget[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const [dpiOverride, setDpiOverride] = useState<DpiFilter | null>(null);
  const [probes, setProbes] = useState<Probes>(DEFAULT_PROBES);
  const [jobId, setJobId] = useState<number | null>(null);

  const toggleHost = useCallback(
    (host: HostTarget) => setHosts((list) => toggleBy(list, host)),
    [],
  );
  const toggleNode = useCallback(
    (node: NodeTarget) => setNodes((list) => toggleBy(list, node)),
    [],
  );

  // Режим Белого списка следует за назначением выбранных хостов, пока админ не выбрал сам.
  const dpi = dpiOverride ?? defaultDpiFor(hosts.map((host) => host.purpose));
  const preselectedHosts = useMemo(
    () => preselected.filter((item) => item.kind === 'host').map((item) => item.ref),
    [preselected],
  );
  const preselectedNodes = useMemo(
    () => preselected.filter((item) => item.kind === 'node').map((item) => item.ref),
    [preselected],
  );

  const body = useMemo(
    () =>
      buildProbeBody({
        hosts: hosts.map((host) => host.uuid),
        nodes: nodes.map((node) => node.uuid),
        custom,
        units,
        dpi,
        probes,
      }),
    [hosts, nodes, custom, units, dpi, probes],
  );

  if (jobId !== null) {
    return <JobProgress jobId={jobId} onReset={() => setJobId(null)} />;
  }

  return (
    <div className="space-y-4">
      <HostsTargetList selected={hosts} onToggle={toggleHost} preselected={preselectedHosts} />
      <NodesTargetList selected={nodes} onToggle={toggleNode} preselected={preselectedNodes} />
      <CustomTargetInput values={custom} onChange={setCustom} />
      <UnitPicker
        kind="probe"
        dpi={dpi}
        onDpiChange={setDpiOverride}
        selected={units}
        onChange={setUnits}
      />
      <ProbesPicker probes={probes} onChange={setProbes} locked={nodes.length ? ['icmp'] : []} />
      <LaunchPanel body={body} status={status} onStarted={(job) => setJobId(job.id)} />
    </div>
  );
}
