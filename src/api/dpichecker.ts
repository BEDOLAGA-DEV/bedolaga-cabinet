import apiClient from './client';

// === Контракт бота: app/cabinet/schemas/dpichecker.py, ручки app/cabinet/routes/admin_dpichecker.py ===

export type Location = 'russia' | 'china' | 'iran' | 'turkmenistan';
export type CheckType = 'vpn' | 'ip' | 'mtproto';
export type ProbeMode = 'auto' | 'server' | 'noserver';
export type TargetSource = 'paste' | 'panel_subscription' | 'panel_hosts' | 'panel_nodes' | 'site';
export type ActionKind = 'check' | 'probe' | 'noisy' | 'monitor';

export const LOCATIONS: Location[] = ['russia', 'china', 'iran', 'turkmenistan'];

export interface Pop {
  id: number;
  location: Location;
  region: string;
  operator: string | null;
  is_healthy: boolean;
}

export interface PopGroups {
  districts: { code: string; name: string; pop_ids: number[] }[];
  republics: number[];
}

export interface NoisyQuota {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  unlimited: boolean | null;
  resets_at: string | null;
}

export interface DpiStatus {
  enabled: boolean;
  configured: boolean;
  balance: number | null;
  total_spent: number | null;
  noisy: NoisyQuota | null;
  monitors: { active: number; limit: number } | null;
  webhook_ready: boolean;
  /** Подписка по умолчанию для VPN «из панели» (настройка DPICHECKER_REFERENCE_SUBSCRIPTION). */
  reference: ReferenceStatus | null;
  /** Ключ неверный, IP не в белом списке и т.п. — уже словами. */
  error: string | null;
}

/**
 * Как у BSCHEKER: `short_uuid` — shortUuid или хвост ссылки подписки. Статус не разворачивает подписку
 * (у сервиса это до 10 с), поэтому `configs` — null, а ключи и ошибку показывает загрузка в форме.
 */
export interface ReferenceStatus {
  short_uuid: string | null;
  configs: number | null;
  error: string | null;
}

export interface TargetIn {
  value: string;
  name: string;
}

export interface PanelTarget extends TargetIn {
  ref: string;
}

export interface ActionOut {
  id: number;
  kind: ActionKind;
  check_type: CheckType | null;
  remote_id: number | null;
  status: string;
  admin_user_id: number | null;
  /** Имя админа, как его видно в кабинете; null — админ удалён или запуск не из кабинета. */
  admin_name?: string | null;
  location: Location | null;
  pop_count: number;
  resource_count: number;
  source: TargetSource;
  source_ref: string | null;
  label: string;
  target_names: string[];
  cost_usd: number | null;
  refunded_usd: number | null;
  error_code: string | null;
  created_at: string | null;
}

export interface CheckRow {
  pop_id: number | null;
  region: string;
  ok: boolean;
  latency_ms: number | null;
  speeds: { host: string; mbps: number | null }[];
  error: string | null;
  reason: string | null;
  verdict: string | null;
  error_code: string | null;
  port_story: string | null;
  mode: ProbeMode | null;
  /** Есть ли у точки интернет вообще (контрольный google.com) — у неудачных VPN-строк. */
  internet_ok: boolean | null;
  /** Прокси самой точки не поднялся — на карте это «прокси недоступен», а не «недоступно». */
  proxy_dead: boolean;
}

export interface CheckResource {
  index: number;
  name: string;
  /** Адрес/домен — только у IP; ключи VPN и ссылки MTProto бот наружу не отдаёт. */
  value: string | null;
  server_ip: string | null;
  total: number;
  ok_count: number;
  direct: { ok: boolean; latency_ms: number | null; error_code: string | null } | null;
  rows: CheckRow[];
}

export interface CheckView {
  id: number | null;
  status: string;
  check_type: CheckType;
  location: string | null;
  usd_cost: number | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress: { done?: number; total?: number; percent?: number };
  summary: {
    available: number;
    partial: number;
    unavailable: number;
    avg_latency_ms: number | null;
  };
  resources: CheckResource[];
}

export interface ParseResult {
  status?: 'ok' | 'fetch_failed';
  keys?: {
    uri: string;
    host: string;
    name: string;
    group: string | null;
    udp_only: boolean;
    hy2: boolean;
  }[];
  valid?: string[];
  invalid_count?: number;
  private_count?: number;
  private?: string[];
  duplicate_count?: number;
  overflow_count?: number;
  blacklisted?: string[];
}

export interface Estimate {
  pops: number;
  resources: number;
  hysteria2_keys: number;
  pop_price: number;
  resource_price: number;
  estimated_cost: number;
  estimated_max_minutes: number;
  balance: number;
  affordable: boolean;
}

export interface CheckCreate {
  check_type: CheckType;
  location: Location;
  pop_ids: number[];
  targets: TargetIn[];
  source: TargetSource;
  source_ref?: string | null;
  label?: string;
  probe_mode?: ProbeMode;
}

export interface MonitorCreate extends CheckCreate {
  interval_hours: number;
  alert_after_fails: number;
  notify_on_success: boolean;
}

export interface MonitorPatch {
  is_active?: boolean;
  interval_hours?: number;
  alert_after_fails?: number;
  notify_on_success?: boolean;
}

export interface Monitor {
  id: number;
  check_type: CheckType;
  location: Location;
  pop_ids: number[];
  resources: string[];
  interval_hours: number;
  is_active: boolean;
  paused_reason: string | null;
  notify_on_success: boolean;
  alert_after_fails: number;
  last_status: string | null;
  last_checked_at: string | null;
  consecutive_fails: number;
  next_run_at: string | null;
  created_at: string | null;
  /** Своя строка кабинета; null — монитор создан на сайте DPI//CHECKER. */
  action_id: number | null;
  label: string | null;
  /** Удалён у сервиса (DELETE там не стирает, а ставит паузу) — только посмотреть. */
  deleted: boolean;
}

export interface MonitorRun {
  id: number;
  check_id: number | null;
  status: string;
  cost: number | null;
  scheduled_for: string | null;
  created_at: string | null;
  check_status: string | null;
  completed_at: string | null;
}

export interface ScanCreate {
  target: string;
  source?: 'paste' | 'panel_hosts' | 'panel_nodes';
  source_ref?: string | null;
  label?: string;
}

export interface NoisyScan {
  id: number;
  status: string;
  cidr: string | null;
  raw_target: string;
  result_count: number | null;
  analysis: {
    bad_ru: { ip: string; domain: string; pattern: string }[];
    grouped: { count: number; label: string }[];
    vpn_like: { ip: string; domain: string }[];
    own_ip_bad: unknown;
    bad_foreign: { ip: string; domain: string }[];
  } | null;
}

export interface ProbeScan {
  id: number;
  status: string;
  stage: 'queued' | 'scan' | 'foreign' | 'russia' | 'report' | string;
  cidr: string | null;
  raw_target: string;
  verdict: string | null;
  blocked_ips: number | null;
  tested_ips: number | null;
  traffic_bytes: string | null;
  fixed_cost: number | null;
  traffic_cost: number | null;
  error: string | null;
  results: {
    scanned: number;
    kept: number;
    in_subnet: number;
    foreign_ok: number;
    tested: number;
    drops: { ip: string; domain: string; reason: string }[];
    assessment: {
      per_ip: {
        ip: string;
        domain: string;
        state: string;
        pops_green: number;
        pops_yellow: number;
        pops_red: number;
        pops_total: number;
      }[];
      per_pop: { pop_id: number; name: string; tested: number; blocked: number; stalled: number }[];
    };
  } | null;
}

export interface CheremshaItem {
  resource: string;
  is_domain: boolean;
  resolved_ips: string[];
  domain_hit: boolean;
  rkn_subnet_hit: string | null;
  cdn_hit: string | null;
  blocked: boolean;
  asn: string | null;
  asn_org: string | null;
  country: string | null;
}

export interface CheremshaResult {
  loaded: boolean;
  last_refresh: string | null;
  results: CheremshaItem[];
  invalid: string[];
  truncated: boolean;
  max: number;
}

export interface HistoryParams {
  kind?: ActionKind;
  check_type?: CheckType;
  mine?: boolean;
  limit?: number;
  offset?: number;
}

/** Сколько запусков у каждого фильтра истории (с учётом «только мои»). */
export type HistoryCounts = Partial<Record<'all' | CheckType | 'noisy' | 'probe', number>>;

export interface HistoryPage {
  items: ActionOut[];
  total: number;
  counts?: HistoryCounts;
}

const BASE = '/cabinet/admin/dpichecker';
// Разбор подписки и long-poll проверки держат запрос дольше обычных 30 секунд.
const LONG_TIMEOUT_MS = 90_000;

export const dpicheckerApi = {
  getStatus: async (): Promise<DpiStatus> => (await apiClient.get(`${BASE}/status`)).data,

  getPops: async (location: Location): Promise<{ pops: Pop[]; groups: PopGroups }> =>
    (await apiClient.get(`${BASE}/pops`, { params: { location } })).data,

  getOptimal: async (location: Location): Promise<number[]> =>
    (await apiClient.get(`${BASE}/pops/optimal`, { params: { location } })).data.pop_ids,

  parse: async (checkType: CheckType, text: string): Promise<ParseResult> =>
    (
      await apiClient.post(
        `${BASE}/parse`,
        { check_type: checkType, text },
        { timeout: LONG_TIMEOUT_MS },
      )
    ).data,

  panelTargets: async (body: {
    kind: 'subscription' | 'hosts' | 'nodes';
    user_id?: number;
    uuids?: string[];
  }): Promise<PanelTarget[]> =>
    (await apiClient.post(`${BASE}/targets/panel`, body, { timeout: LONG_TIMEOUT_MS })).data
      .targets,

  estimate: async (body: {
    check_type: CheckType;
    location: Location;
    pop_ids: number[];
    resources: string[];
  }): Promise<Estimate> => (await apiClient.post(`${BASE}/estimate`, body)).data,

  launchCheck: async (body: CheckCreate): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/checks`, body)).data,

  listChecks: async (params: HistoryParams = {}): Promise<HistoryPage> =>
    (await apiClient.get(`${BASE}/checks`, { params })).data,

  getCheck: async (id: number, wait = 0): Promise<{ action: ActionOut; check: CheckView }> =>
    (
      await apiClient.get(`${BASE}/checks/${id}`, {
        params: { wait },
        timeout: LONG_TIMEOUT_MS,
      })
    ).data,

  cancelCheck: async (id: number): Promise<ActionOut> =>
    (await apiClient.delete(`${BASE}/checks/${id}`)).data,

  /** Сервис не ответил на запуск — спросить ещё раз тем же ключом: второго списания не будет. */
  resubmit: async (id: number): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/checks/${id}/resubmit`)).data,

  /** Короткая подписанная ссылка на CSV — качается без Authorization (Telegram downloadFile). */
  downloadLink: async (
    kind: 'report' | 'noisy',
    id: number,
  ): Promise<{ url: string; file_name: string }> =>
    (await apiClient.post(`${BASE}/files/${kind}/${id}/link`)).data,

  checkMap: async (id: number): Promise<Blob> =>
    (await apiClient.get(`${BASE}/checks/${id}/map.png`, { responseType: 'blob' })).data as Blob,

  launchProbe: async (body: ScanCreate): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/probe`, body)).data,

  launchNoisy: async (body: ScanCreate): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/noisy`, body)).data,

  getScan: async (id: number): Promise<{ action: ActionOut; scan: NoisyScan | ProbeScan }> =>
    (await apiClient.get(`${BASE}/scans/${id}`)).data,

  cheremsha: async (resources: string[]): Promise<CheremshaResult> =>
    (await apiClient.get(`${BASE}/cheremsha`, { params: { resource: resources.join(',') } })).data,

  listMonitors: async (): Promise<Monitor[]> =>
    (await apiClient.get(`${BASE}/monitors`)).data.items,

  createMonitor: async (body: MonitorCreate): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/monitors`, body)).data,

  /** Монитор с сайта DPI//CHECKER — под управление кабинета; дальше правится по номеру своей строки. */
  adoptMonitor: async (remoteId: number): Promise<ActionOut> =>
    (await apiClient.post(`${BASE}/monitors/remote/${remoteId}/adopt`)).data,

  patchMonitor: async (actionId: number, patch: MonitorPatch): Promise<Monitor> =>
    (await apiClient.patch(`${BASE}/monitors/${actionId}`, patch)).data,

  deleteMonitor: async (actionId: number): Promise<unknown> =>
    (await apiClient.delete(`${BASE}/monitors/${actionId}`)).data,

  monitorRuns: async (
    actionId: number,
    limit = 25,
    offset = 0,
  ): Promise<{ items: MonitorRun[]; total: number }> =>
    (await apiClient.get(`${BASE}/monitors/${actionId}/runs`, { params: { limit, offset } })).data,
};
