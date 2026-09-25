import type {
  BatchCreateRequest,
  Dpi,
  Probes,
  ReachabilityStatus,
  ScopeKind,
} from '@/api/reachability';
import { DEFAULT_SNI_HOST, parseSniHosts, recallSniHosts } from '../sniNames';
import type { FleetRow } from './fleet';

/** Пробы для проверки серверов: TCP и TLS-SNI, без ICMP (ping режут чаще, чем сам сервер). */
export const FLEET_PROBES: Probes = { icmp: false, tcp: true, sni: true };

/** Симки по назначению выбранных серверов: все под Белый список → с ним, все обычные → без, смесь → любые. */
export function dpiForRows(rows: readonly FleetRow[]): Dpi {
  if (rows.length > 0 && rows.every((row) => row.purpose === 'bs')) return 'on';
  if (rows.length > 0 && rows.every((row) => row.purpose === 'regular')) return 'off';
  return 'any';
}

/** Тело пачки: что именно уйдёт в бот при запуске выбранных серверов. */
export function batchBody(
  rows: readonly FleetRow[],
  scopeKind: ScopeKind,
  status: ReachabilityStatus | undefined,
  manualUnits: readonly string[] | null = null,
): BatchCreateRequest {
  const sni = parseSniHosts(recallSniHosts() ?? status?.default_sni ?? DEFAULT_SNI_HOST).names;
  return {
    host_refs: rows.map((row) => row.ref).filter((ref): ref is string => ref !== null),
    units: manualUnits ? [...manualUnits] : [],
    dpi: dpiForRows(rows),
    probes: { ...FLEET_PROBES },
    sni_hosts: sni,
    scope_kind: scopeKind,
  };
}
