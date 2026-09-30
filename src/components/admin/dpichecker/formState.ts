import type { CheckType, PanelTarget, ParseResult, TargetIn } from '@/api/dpichecker';

/** Ресурс формы: ключ/адрес/прокси, имя для людей, включён ли в проверку. */
export interface Resource {
  value: string;
  name: string;
  on: boolean;
  /** UDP-ключ сервис не проверяет — на сайте он показан выключенным. */
  disabledReason?: 'udp_only';
}

export type NoteKey = 'invalid' | 'private' | 'overflow' | 'duplicate' | 'blacklisted';
export interface ParseNote {
  key: NoteKey;
  count?: number;
  items?: string[];
}

export interface ParsedForm {
  resources: Resource[];
  notes: ParseNote[];
  error?: 'fetchFailed';
}

function vpnName(name: string, group: string | null): string {
  return group && group !== name ? `${name} · ${group}` : name;
}

/** Ответ разбора сервиса → ресурсы и заметки «что отброшено и почему» (тексты сайта). */
export function fromParse(checkType: CheckType, parsed: ParseResult): ParsedForm {
  if (checkType === 'vpn') {
    if (parsed.status === 'fetch_failed') return { resources: [], notes: [], error: 'fetchFailed' };
    const resources = (parsed.keys ?? []).map((key) => {
      const base = { value: key.uri, name: vpnName(key.name, key.group) };
      return key.udp_only
        ? { ...base, on: false, disabledReason: 'udp_only' as const }
        : { ...base, on: true };
    });
    return { resources, notes: [] };
  }
  const resources = (parsed.valid ?? []).map((value) => ({ value, name: value, on: true }));
  const notes: ParseNote[] = [];
  const counted: Array<[NoteKey, number | undefined]> = [
    ['invalid', parsed.invalid_count],
    ['private', parsed.private_count],
    ['overflow', parsed.overflow_count],
    ['duplicate', parsed.duplicate_count],
  ];
  for (const [key, count] of counted) {
    if (count) notes.push({ key, count });
  }
  if (parsed.blacklisted?.length) notes.push({ key: 'blacklisted', items: parsed.blacklisted });
  return { resources, notes };
}

export function fromPanel(targets: PanelTarget[]): Resource[] {
  return targets.map((target) => ({ value: target.value, name: target.name, on: true }));
}

export function activeTargets(resources: Resource[]): TargetIn[] {
  return resources
    .filter((resource) => resource.on && !resource.disabledReason)
    .map((resource) => ({ value: resource.value, name: resource.name }));
}

export function canPay(input: {
  pops: number;
  resources: Resource[];
  cost: number | null;
  balance: number | null;
}): boolean {
  const { pops, resources, cost, balance } = input;
  if (pops === 0 || activeTargets(resources).length === 0 || cost === null) return false;
  return balance === null || cost <= balance;
}
