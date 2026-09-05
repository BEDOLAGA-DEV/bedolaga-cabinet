export const TAB_KEYS = ['summary', 'probe', 'vless', 'scan', 'history'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export interface DeepLinkTarget {
  kind: 'host' | 'node';
  ref: string;
}

export interface DeepLink {
  tab: TabKey;
  targets: DeepLinkTarget[];
  userId: number | null;
  shortUuid: string | null;
}

export const REACHABILITY_PATH = '/admin/reachability';

function isTab(value: string | null): value is TabKey {
  return (TAB_KEYS as readonly string[]).includes(value ?? '');
}

function isTargetKind(value: string): value is DeepLinkTarget['kind'] {
  return value === 'host' || value === 'node';
}

function parseTarget(raw: string): DeepLinkTarget | null {
  const separator = raw.indexOf(':');
  if (separator <= 0) return null;
  const kind = raw.slice(0, separator);
  const ref = raw.slice(separator + 1);
  return isTargetKind(kind) && ref !== '' ? { kind, ref } : null;
}

function defaultTab(input: Pick<DeepLink, 'targets' | 'userId' | 'shortUuid'>): TabKey {
  if (input.targets.length) return 'probe';
  if (input.userId || input.shortUuid) return 'vless';
  return 'summary';
}

/**
 * `?tab=&target=host:<uuid>&target=node:<uuid>&user=<id>&sub=<shortUuid>`.
 * Цель без tab открывает «Проверку», пользователь или подписка — «VLESS-тест».
 */
export function parseReachabilityDeepLink(params: URLSearchParams): DeepLink {
  const targets = params
    .getAll('target')
    .map(parseTarget)
    .filter((target): target is DeepLinkTarget => target !== null);
  const userRaw = params.get('user');
  const userId = userRaw && /^\d+$/.test(userRaw) ? Number(userRaw) : null;
  const shortUuid = params.get('sub') || null;
  const tabParam = params.get('tab');
  const tab = isTab(tabParam) ? tabParam : defaultTab({ targets, userId, shortUuid });
  return { tab, targets, userId, shortUuid };
}

export function buildReachabilityLink(input: Partial<DeepLink>): string {
  const targets = input.targets ?? [];
  const userId = input.userId ?? null;
  const shortUuid = input.shortUuid ?? null;
  const params = new URLSearchParams();
  params.set('tab', input.tab ?? defaultTab({ targets, userId, shortUuid }));
  for (const target of targets) params.append('target', `${target.kind}:${target.ref}`);
  if (userId) params.set('user', String(userId));
  if (shortUuid) params.set('sub', shortUuid);
  return `${REACHABILITY_PATH}?${params.toString()}`;
}
