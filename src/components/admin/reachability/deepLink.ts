import type { JobKind } from '@/api/reachability';

/** Вкладка запуска — как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка. */
export type LaunchMode = 'hosts' | 'ip' | 'cidr' | 'vless';

export const MODE_KEYS: readonly LaunchMode[] = ['hosts', 'ip', 'cidr', 'vless'];

/** Старые значения `?kind=` из сохранённых ссылок: проверка хостов и скан подсети. */
const LEGACY_MODES: Record<string, LaunchMode> = { probe: 'hosts', scan: 'cidr' };

/** Хосты и свои адреса — одна и та же probe-задача бота, CIDR — скан. */
const JOB_KIND: Record<LaunchMode, JobKind> = {
  hosts: 'probe',
  ip: 'probe',
  cidr: 'scan',
  vless: 'vless',
};

export function jobKindOf(mode: LaunchMode): JobKind {
  return JOB_KIND[mode];
}

export interface DeepLinkTarget {
  kind: 'host' | 'node';
  ref: string;
}

export interface DeepLink {
  mode: LaunchMode;
  targets: DeepLinkTarget[];
  userId: number | null;
  shortUuid: string | null;
  /** Задача, которую раскрыть в «моих проверках». */
  jobId: number | null;
  /** «Повторить»: задача, чьи цели, симки и пробы подставить в форму. */
  repeatJobId: number | null;
}

export const REACHABILITY_PATH = '/admin/reachability';
/** Раздел BSCHEKER в настройках кабинета (подпункт дерева `sys_reachability`). */
export const REACHABILITY_SETTINGS_PATH = '/admin/settings?section=sys_reachability';
/** Сайт сервиса: ключ API и тариф. */
export const BSBORD_URL = 'https://bsbord.com';

function parseMode(value: string | null): LaunchMode | null {
  if (value === null) return null;
  if ((MODE_KEYS as readonly string[]).includes(value)) return value as LaunchMode;
  return LEGACY_MODES[value] ?? null;
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

function defaultMode(input: Pick<DeepLink, 'targets' | 'userId' | 'shortUuid'>): LaunchMode {
  if (input.targets.length) return 'hosts';
  if (input.userId || input.shortUuid) return 'vless';
  return 'hosts';
}

/**
 * `?kind=&target=host:<uuid>&target=node:<uuid>&user=<id>&sub=<shortUuid>&job=<id>`.
 * Цель без kind открывает хосты панели, пользователь или подписка — подписку.
 */
export function parseReachabilityDeepLink(params: URLSearchParams): DeepLink {
  const targets = params
    .getAll('target')
    .map(parseTarget)
    .filter((target): target is DeepLinkTarget => target !== null);
  const userId = parseId(params.get('user'));
  const shortUuid = params.get('sub') || null;
  const mode = parseMode(params.get('kind')) ?? defaultMode({ targets, userId, shortUuid });
  return {
    mode,
    targets,
    userId,
    shortUuid,
    jobId: parseId(params.get('job')),
    repeatJobId: parseId(params.get('repeat')),
  };
}

export function buildReachabilityLink(input: Partial<DeepLink>): string {
  const targets = input.targets ?? [];
  const userId = input.userId ?? null;
  const shortUuid = input.shortUuid ?? null;
  const params = new URLSearchParams();
  params.set('kind', input.mode ?? defaultMode({ targets, userId, shortUuid }));
  for (const target of targets) params.append('target', `${target.kind}:${target.ref}`);
  if (userId) params.set('user', String(userId));
  if (shortUuid) params.set('sub', shortUuid);
  if (input.jobId) params.set('job', String(input.jobId));
  if (input.repeatJobId) params.set('repeat', String(input.repeatJobId));
  return `${REACHABILITY_PATH}?${params.toString()}`;
}
