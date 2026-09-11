import type { JobKind } from '@/api/reachability';

/** Вкладка запуска — как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка, GEO из городов. */
export type LaunchMode = 'hosts' | 'ip' | 'cidr' | 'vless' | 'geo';
/** Вкладки страницы: пять запусков и история проверок. */
export type PageTab = LaunchMode | 'history';

export const MODE_KEYS: readonly LaunchMode[] = ['hosts', 'ip', 'cidr', 'vless', 'geo'];
export const TAB_KEYS: readonly PageTab[] = [...MODE_KEYS, 'history'];

/** Старые значения `?kind=` из сохранённых ссылок: проверка хостов и скан подсети. */
const LEGACY_MODES: Record<string, LaunchMode> = { probe: 'hosts', scan: 'cidr' };

/** Хосты и свои адреса — одна и та же probe-задача бота, CIDR — скан, GEO — свой вид. */
const JOB_KIND: Record<LaunchMode, JobKind> = {
  hosts: 'probe',
  ip: 'probe',
  cidr: 'scan',
  vless: 'vless',
  geo: 'geo',
};

export function jobKindOf(mode: LaunchMode): JobKind {
  return JOB_KIND[mode];
}

export interface DeepLinkTarget {
  kind: 'host' | 'node';
  ref: string;
}

export interface DeepLink {
  mode: PageTab;
  targets: DeepLinkTarget[];
  userId: number | null;
  shortUuid: string | null;
  /** Задача, которую раскрыть в истории; без вкладки открывает историю. */
  jobId: number | null;
  /** «Повторить»: задача, чьи цели, симки и пробы подставить в форму. */
  repeatJobId: number | null;
  /** Идущая проверка: экран ожидания переживает перезагрузку страницы. */
  runningJobId: number | null;
  /** Открытая карточка сервера (target_key); во вкладке «История» — фильтр по серверу. */
  serverKey: string | null;
  /** Идущая пачка проверок серверов: её прогресс возвращается после перезагрузки. */
  batchId: number | null;
}

export const REACHABILITY_PATH = '/admin/reachability';
/** Раздел BSCHEKER в настройках кабинета (подпункт дерева `sys_reachability`). */
export const REACHABILITY_SETTINGS_PATH = '/admin/settings?section=sys_reachability';
/** Сайт сервиса: ключ API и тариф. */
export const BSBORD_URL = 'https://bsbord.com';

function parseMode(value: string | null): PageTab | null {
  if (value === null) return null;
  if ((TAB_KEYS as readonly string[]).includes(value)) return value as PageTab;
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

function defaultMode(input: Pick<DeepLink, 'targets' | 'userId' | 'shortUuid' | 'jobId'>): PageTab {
  if (input.targets.length) return 'hosts';
  if (input.userId || input.shortUuid) return 'vless';
  if (input.jobId) return 'history';
  return 'hosts';
}

/**
 * `?kind=&target=host:<uuid>&target=node:<uuid>&user=<id>&sub=<shortUuid>&job=<id>`.
 * Цель без kind открывает хосты панели, пользователь или подписка — подписку, задача — историю.
 */
export function parseReachabilityDeepLink(params: URLSearchParams): DeepLink {
  const targets = params
    .getAll('target')
    .map(parseTarget)
    .filter((target): target is DeepLinkTarget => target !== null);
  const userId = parseId(params.get('user'));
  const shortUuid = params.get('sub') || null;
  const jobId = parseId(params.get('job'));
  const mode = parseMode(params.get('kind')) ?? defaultMode({ targets, userId, shortUuid, jobId });
  return {
    mode,
    targets,
    userId,
    shortUuid,
    jobId,
    repeatJobId: parseId(params.get('repeat')),
    runningJobId: parseId(params.get('running')),
    serverKey: params.get('server') || null,
    batchId: parseId(params.get('batch')),
  };
}

export function buildReachabilityLink(input: Partial<DeepLink>): string {
  const targets = input.targets ?? [];
  const userId = input.userId ?? null;
  const shortUuid = input.shortUuid ?? null;
  const jobId = input.jobId ?? null;
  const params = new URLSearchParams();
  params.set('kind', input.mode ?? defaultMode({ targets, userId, shortUuid, jobId }));
  for (const target of targets) params.append('target', `${target.kind}:${target.ref}`);
  if (userId) params.set('user', String(userId));
  if (shortUuid) params.set('sub', shortUuid);
  if (input.jobId) params.set('job', String(input.jobId));
  if (input.repeatJobId) params.set('repeat', String(input.repeatJobId));
  if (input.runningJobId) params.set('running', String(input.runningJobId));
  if (input.serverKey) params.set('server', input.serverKey);
  if (input.batchId) params.set('batch', String(input.batchId));
  return `${REACHABILITY_PATH}?${params.toString()}`;
}
