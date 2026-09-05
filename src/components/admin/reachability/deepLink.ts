import type { JobKind } from '@/api/reachability';

export const KIND_KEYS: readonly JobKind[] = ['probe', 'vless', 'scan'];

export interface DeepLinkTarget {
  kind: 'host' | 'node';
  ref: string;
}

export interface DeepLink {
  kind: JobKind;
  targets: DeepLinkTarget[];
  userId: number | null;
  shortUuid: string | null;
  /** Задача, которую раскрыть в «моих проверках». */
  jobId: number | null;
}

export const REACHABILITY_PATH = '/admin/reachability';

function isKind(value: string | null): value is JobKind {
  return (KIND_KEYS as readonly string[]).includes(value ?? '');
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

function parseId(raw: string | null): number | null {
  return raw && /^\d+$/.test(raw) ? Number(raw) : null;
}

function defaultKind(input: Pick<DeepLink, 'targets' | 'userId' | 'shortUuid'>): JobKind {
  if (input.targets.length) return 'probe';
  if (input.userId || input.shortUuid) return 'vless';
  return 'probe';
}

/**
 * `?kind=&target=host:<uuid>&target=node:<uuid>&user=<id>&sub=<shortUuid>&job=<id>`.
 * Цель без kind открывает проверку хостов, пользователь или подписка — подписку.
 */
export function parseReachabilityDeepLink(params: URLSearchParams): DeepLink {
  const targets = params
    .getAll('target')
    .map(parseTarget)
    .filter((target): target is DeepLinkTarget => target !== null);
  const userId = parseId(params.get('user'));
  const shortUuid = params.get('sub') || null;
  const kindParam = params.get('kind');
  const kind = isKind(kindParam) ? kindParam : defaultKind({ targets, userId, shortUuid });
  return { kind, targets, userId, shortUuid, jobId: parseId(params.get('job')) };
}

export function buildReachabilityLink(input: Partial<DeepLink>): string {
  const targets = input.targets ?? [];
  const userId = input.userId ?? null;
  const shortUuid = input.shortUuid ?? null;
  const params = new URLSearchParams();
  params.set('kind', input.kind ?? defaultKind({ targets, userId, shortUuid }));
  for (const target of targets) params.append('target', `${target.kind}:${target.ref}`);
  if (userId) params.set('user', String(userId));
  if (shortUuid) params.set('sub', shortUuid);
  if (input.jobId) params.set('job', String(input.jobId));
  return `${REACHABILITY_PATH}?${params.toString()}`;
}
