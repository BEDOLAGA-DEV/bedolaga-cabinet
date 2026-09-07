import type { Dpi, JobCreateRequest, Probes, TargetIn, VlessCore } from '@/api/reachability';

/** Чистая сборка тела ``POST /jobs`` из состояния вкладок; null — запускать нечего. */

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const CIDR24_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/24$/;

export interface ProbeSelection {
  hosts: string[];
  nodes: string[];
  custom: string[];
  units: string[];
  dpi: Dpi;
  probes: Probes;
  /** Свои имена из поля «SNI-хост»; уходят только при включённой SNI-пробе. */
  sniHosts: string[];
}

export function buildProbeBody(selection: ProbeSelection): JobCreateRequest | null {
  const targets: JobCreateRequest['targets'] = [
    ...selection.hosts.map((ref) => ({ kind: 'host' as const, ref })),
    ...selection.nodes.map((ref) => ({ kind: 'node' as const, ref })),
    ...selection.custom.map((value) => ({ kind: 'custom' as const, value })),
  ];
  if (targets.length === 0) return null;
  return {
    kind: 'probe',
    targets,
    units: selection.units,
    dpi: selection.dpi,
    // Нода проверяется только по ping: без ICMP её лег останется «неизвестно».
    probes: { ...selection.probes, icmp: selection.probes.icmp || selection.nodes.length > 0 },
    core: '',
    sni_hosts: selection.probes.sni ? selection.sniHosts : [],
  };
}

export interface VlessSelection {
  /** Готовые цели: конфиги подписки панели или из поля «Конфиг или подписка». */
  targets: TargetIn[];
  units: string[];
  dpi: Dpi;
  core: VlessCore;
}

export function buildVlessBody(selection: VlessSelection): JobCreateRequest | null {
  if (selection.targets.length === 0) return null;
  return {
    kind: 'vless',
    targets: selection.targets,
    units: selection.units,
    dpi: selection.dpi,
    probes: { icmp: false, tcp: false, sni: false },
    core: selection.core,
    sni_hosts: [],
  };
}

export interface ScanSelection {
  cidr: string;
  units: string[];
  dpi: Dpi;
  probes: Probes;
  sniHosts: string[];
}

export function isCidr24(value: string): boolean {
  return CIDR24_RE.test(value.trim());
}

export function buildScanBody(selection: ScanSelection): JobCreateRequest | null {
  const cidr = selection.cidr.trim();
  if (!isCidr24(cidr)) return null;
  return {
    kind: 'scan',
    targets: [{ kind: 'cidr', value: cidr }],
    units: selection.units,
    dpi: selection.dpi,
    probes: selection.probes,
    core: '',
    sni_hosts: selection.probes.sni ? selection.sniHosts : [],
  };
}

/** Подсеть /24 адреса хоста; для доменов и IPv6 — null (сервер сам их не разрешает). */
export function cidrFromAddress(address: string): string | null {
  const match = IPV4_RE.exec(address.trim());
  if (!match) return null;
  const octets = match.slice(1, 5).map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`;
}
