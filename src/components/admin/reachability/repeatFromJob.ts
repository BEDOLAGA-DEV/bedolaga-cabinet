import type { Job, Probes } from '@/api/reachability';
import type { LaunchMode } from './deepLink';

/** Состояние формы запуска, собранное из прошлой задачи: «Повторить» в журнале. */
export interface RepeatState {
  mode: LaunchMode;
  hosts: string[];
  nodes: string[];
  addresses: string;
  cidr: string;
  shortUuid: string | null;
  configIndexes: number[];
  units: string[];
  probes: Probes | null;
  sniHosts: string;
}

function refString(ref: Record<string, unknown> | undefined, key: string): string | null {
  const value = ref?.[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

export function repeatFromJob(job: Job): RepeatState {
  const targets = job.targets ?? [];
  const hosts = targets
    .filter((target) => target.kind === 'host')
    .map((target) => refString(target.ref, 'host_uuid'))
    .filter((uuid): uuid is string => uuid !== null);
  const nodes = targets
    .filter((target) => target.kind === 'node')
    .map((target) => refString(target.ref, 'node_uuid'))
    .filter((uuid): uuid is string => uuid !== null);
  const custom = targets.filter((target) => target.kind === 'custom');
  const cidr = targets.find((target) => target.kind === 'cidr');
  const configs = targets.filter((target) => target.kind === 'subscription_config');
  const mode: LaunchMode =
    job.kind === 'scan'
      ? 'cidr'
      : job.kind === 'vless'
        ? 'vless'
        : custom.length > 0 && hosts.length === 0 && nodes.length === 0
          ? 'ip'
          : 'hosts';
  return {
    mode,
    hosts,
    nodes,
    addresses: custom.map((target) => target.target_key).join('\n'),
    cidr: cidr?.target_key ?? '',
    shortUuid: configs.length > 0 ? refString(configs[0].ref, 'short_uuid') : null,
    configIndexes: configs
      .map((target) => target.ref?.index)
      .filter((index): index is number => typeof index === 'number'),
    units: [...(job.units_requested ?? [])],
    probes: job.probes ? { ...job.probes } : null,
    sniHosts: (job.sni_hosts ?? []).join(', '),
  };
}
