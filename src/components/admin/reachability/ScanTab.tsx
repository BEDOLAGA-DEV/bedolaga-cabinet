import { useMemo, useState } from 'react';
import type { Probes, ReachabilityStatus } from '@/api/reachability';
import { CidrInput } from './CidrInput';
import { JobProgress } from './JobProgress';
import { LaunchPanel } from './LaunchPanel';
import { ProbesPicker } from './ProbesPicker';
import { UnitPicker } from './UnitPicker';
import { buildScanBody } from './jobBodies';
import type { DpiFilter } from './unitSelection';
import { useHosts } from './useTargets';

export interface ScanTabProps {
  status: ReachabilityStatus | undefined;
}

const DEFAULT_PROBES: Probes = { icmp: true, tcp: true, sni: false };

export function ScanTab({ status }: ScanTabProps) {
  const [cidr, setCidr] = useState('');
  const [units, setUnits] = useState<string[]>([]);
  const [dpi, setDpi] = useState<DpiFilter>('on');
  const [probes, setProbes] = useState<Probes>(DEFAULT_PROBES);
  const [jobId, setJobId] = useState<number | null>(null);
  const { data: hosts = [] } = useHosts(false);

  const body = useMemo(
    () => buildScanBody({ cidr, units, dpi, probes: { ...probes, sni: false } }),
    [cidr, units, dpi, probes],
  );

  if (jobId !== null) {
    return <JobProgress jobId={jobId} onReset={() => setJobId(null)} />;
  }

  return (
    <div className="space-y-4">
      <CidrInput value={cidr} onChange={setCidr} hosts={hosts} />
      <UnitPicker kind="scan" dpi={dpi} onDpiChange={setDpi} selected={units} onChange={setUnits} />
      <ProbesPicker probes={{ ...probes, sni: false }} onChange={setProbes} locked={['sni']} />
      <LaunchPanel body={body} status={status} onStarted={(job) => setJobId(job.id)} />
    </div>
  );
}
