/** Адрес раздела DPI//CHECKER: вкладка, открытая проверка/скан, источник цели из панели. */

export const TABS = [
  'vpn',
  'ip',
  'mtproto',
  'noisy',
  'probe',
  'cheremsha',
  'monitors',
  'history',
] as const;
export type Tab = (typeof TABS)[number];

export const SOURCES = ['node', 'user', 'host'] as const;
export type LinkSource = (typeof SOURCES)[number];

export interface DpiLink {
  tab: Tab;
  check: number | null;
  scan: number | null;
  source: LinkSource | null;
  ref: string | null;
}

const BASE_PATH = '/admin/dpichecker';

function positiveInt(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : null;
}

export function readLink(search: URLSearchParams): DpiLink {
  const tab = search.get('tab');
  const source = search.get('source');
  const knownSource = (SOURCES as readonly string[]).includes(source ?? '')
    ? (source as LinkSource)
    : null;
  return {
    tab: (TABS as readonly string[]).includes(tab ?? '') ? (tab as Tab) : 'vpn',
    check: positiveInt(search.get('check')),
    scan: positiveInt(search.get('scan')),
    source: knownSource,
    ref: knownSource ? search.get('ref') : null,
  };
}

export function buildLink(link: Partial<DpiLink>): string {
  const params = new URLSearchParams();
  if (link.tab) params.set('tab', link.tab);
  if (link.check) params.set('check', String(link.check));
  if (link.scan) params.set('scan', String(link.scan));
  if (link.source && link.ref) {
    params.set('source', link.source);
    params.set('ref', link.ref);
  }
  const query = params.toString();
  return query ? `${BASE_PATH}?${query}` : BASE_PATH;
}
