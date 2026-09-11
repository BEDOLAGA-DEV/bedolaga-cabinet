import apiClient from './client';

// === Типы контракта (бот: app/cabinet/schemas/reachability.py) ===

export type JobKind = 'probe' | 'vless' | 'scan' | 'geo';
export type Dpi = 'on' | 'off' | 'any';
export type Purpose = 'bs' | 'regular' | 'unknown';
export type Verdict = 'reachable' | 'blocked' | 'down' | 'unknown' | 'cancelled';
export type JobStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
export type JobPhase = 'submitting' | 'waiting' | 'retrieving' | 'polling' | 'cancelling';
export type TargetKind = 'host' | 'node' | 'subscription_config' | 'custom' | 'cidr';

export interface Unit {
  op_key: string;
  operator: string;
  name: string;
  region: string;
  region_code: string;
  dpi: string;
  channel_state: string;
  probeable: boolean;
  /** false — симки уже нет в каталоге, но по ней есть леги в сводке. */
  in_catalog: boolean;
}

export interface ActiveJob {
  id: number;
  kind: JobKind;
  phase: JobPhase | null;
  started_by_user_id: number | null;
  started_at: string | null;
}

export interface ReferenceStatus {
  short_uuid: string | null;
  configs: number;
  rejected: number;
  error: string | null;
}

export interface ReachabilityStatus {
  enabled: boolean;
  configured: boolean;
  healthy: boolean;
  health_message: string | null;
  balance_kopeks: number | null;
  bonus_kopeks: number | null;
  tier: string | null;
  tier_expires_at: string | null;
  min_interval_sec: number | null;
  active_jobs: ActiveJob[];
  reference: ReferenceStatus | null;
  cost_limit_kopeks: number;
  /** Ядро Xray → номер версии, как показывает оригинал bsbord.com. */
  cores: Record<string, string>;
  /** «SNI-хост по умолчанию» из настроек бота — подставляется в поле SNI. */
  default_sni: string | null;
  /** Идущая проверка серверов: её экран открывается снова после перезагрузки страницы. */
  active_batch: ActiveBatch | null;
}

export interface HostTarget {
  uuid: string;
  remark: string;
  address: string;
  port: number | null;
  sni: string | null;
  is_disabled: boolean;
  tag: string | null;
  purpose: Purpose;
  purpose_guessed: boolean;
  excluded: boolean;
  node_uuids: string[];
  target_key: string;
}

export interface NodeTarget {
  uuid: string;
  name: string;
  address: string;
  is_connected: boolean;
  is_disabled: boolean;
  host_uuids: string[];
  target_key: string;
}

export interface SubscriptionConfig {
  index: number;
  protocol: string | null;
  label: string;
  address: string;
  port: number | null;
  sni: string | null;
  target_key: string;
  purpose: Purpose;
}

export interface RejectedConfig {
  reason: string;
  preview: string;
  /** Причина словами («Подписка истекла 01.09.2024»), если бот её знает. */
  detail?: string | null;
}

export interface SubscriptionConfigs {
  short_uuid: string;
  configs: SubscriptionConfig[];
  rejected: RejectedConfig[];
  /** Панель на что-то жалуется: истекла, отключена, трафик исчерпан. */
  note?: string | null;
}

/** Конфиг из поля «Конфиг или подписка» — с готовой целью для задачи. */
export interface ParsedConfig extends SubscriptionConfig {
  target: TargetIn;
}

export interface ParsedSource {
  kind: 'links' | 'subscription';
  label: string;
  count: number;
  note?: string | null;
}

export interface ParsedInput {
  configs: ParsedConfig[];
  rejected: RejectedConfig[];
  sources: ParsedSource[];
}

export interface TargetIn {
  kind: TargetKind;
  ref?: string;
  value?: string;
  short_uuid?: string;
  /** Подписка по URL (чужая панель) из поля «Конфиг или подписка». */
  url?: string;
  index?: number;
  /** Ключ цели на момент разбора — бот сверит, не изменилась ли подписка. */
  target_key?: string;
}

export interface Probes {
  icmp: boolean;
  tcp: boolean;
  sni: boolean;
}

export type VlessCore = '' | 'stable' | 'prerelease';

export interface JobCreateRequest {
  kind: JobKind;
  targets: TargetIn[];
  units: string[];
  dpi: Dpi;
  probes: Probes;
  core: VlessCore;
  /** Свои имена для TLS-SNI (до 5); пусто — имена целей или дефолт из настроек. */
  sni_hosts: string[];
  /** GEO-РФ: откуда проверять и каким методом; для остальных видов не уходит. */
  geo?: GeoOptions;
}

// === GEO-РФ: проверка из городов глазами домашних и мобильных провайдеров ===

export type GeoNetwork = 'res' | 'mob';
export type GeoScopeKind = 'all' | 'district' | 'region' | 'cities';
export type GeoProbeMode = 'tls' | 'tcp';

export interface GeoCityRef {
  region: string;
  city: string;
  isp?: string;
}

export interface GeoScope {
  kind: GeoScopeKind;
  district?: string;
  region?: string;
  cities?: GeoCityRef[];
}

/** Блок «Откуда» и «Метод» вкладки GEO — как уходит в бот. */
export interface GeoOptions {
  network: GeoNetwork;
  scope: GeoScope;
  isp: string | null;
  city_limit: number;
  probe_mode: GeoProbeMode;
  heavy: boolean;
  /** Повтор через тот же выход: sid строки прошлого прогона и ожидаемый exit_ip; только с одним городом. */
  session?: string;
  expect_exit_ip?: string;
}

/** Числа сервиса из расчёта: города, потолок трафика, резерв, прогноз времени, потолок городов режима. */
export interface GeoPreview {
  n_nodes: number | null;
  cap_mb: number | null;
  reserve_credits: number | null;
  estimated_sec: number | null;
  max_nodes: number | null;
}

export interface GeoDistrict {
  code: string;
  name: string;
}

export interface GeoRegion {
  token: string;
  name: string;
  district: string;
}

export interface GeoIsp {
  token: string;
  name: string;
  cities: number;
}

export interface GeoCity {
  region: string;
  region_ru: string;
  district: string;
  city: string;
  city_ru: string;
  isps: string[];
}

export interface GeoCatalog {
  networks: string[];
  districts: GeoDistrict[];
  regions: GeoRegion[];
  isps: GeoIsp[];
  cities: GeoCity[];
  cities_total: number | null;
  cities_truncated: boolean;
}

export interface GeoCatalogParams {
  network: GeoNetwork;
  q?: string;
  isp?: string;
  region?: string;
  district?: string;
  cities_limit?: number;
}

export type SkippedUnit = Partial<Unit> & { op_key?: string };

export interface Skipped {
  dpi_off: SkippedUnit[];
  unavailable: SkippedUnit[];
  unknown: string[];
  blocked_targets: Array<{ target?: string; reason?: string }>;
}

export interface TargetOut {
  kind: TargetKind;
  label: string;
  address: string;
  port: number | null;
  target_key: string;
  sni: string | null;
  ref: Record<string, unknown>;
  purpose: Purpose;
}

export interface PreviewResponse {
  kind: JobKind;
  targets: TargetOut[];
  units_resolved: string[];
  skipped: Skipped;
  cost_kopeks: number | null;
  estimate_is_exact: boolean;
  warnings: string[];
  balance_kopeks: number | null;
  /** Только у GEO: расчёт сервиса по городам и резерву. */
  geo?: GeoPreview | null;
}

export interface Leg {
  id: number;
  target_key: string;
  target_kind: TargetKind | null;
  target_ref: string | null;
  op_key: string;
  operator: string | null;
  region: string | null;
  dpi: string | null;
  verdict: Verdict;
  matches_expectation: boolean | null;
  raw: Record<string, unknown> | null;
  checked_at: string;
}

export interface Job {
  id: number;
  kind: JobKind;
  status: JobStatus;
  phase: JobPhase | null;
  trigger: string;
  started_by_user_id: number | null;
  external_id: number | null;
  targets: TargetOut[];
  units_requested: string[] | null;
  units_resolved: string[] | null;
  units_effective: string[] | null;
  skipped: Skipped | null;
  dpi: Dpi;
  estimated_kopeks: number | null;
  estimate_is_exact: boolean;
  cost_kopeks: number | null;
  refunded_kopeks: number | null;
  result: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  retryable: boolean | null;
  attempts: number;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  legs: Leg[];
  /** Из тела запроса к API: заказанные пробы и SNI-имена. */
  probes: Probes | null;
  sni_hosts: string[];
  /** Пачка (проверка многих серверов одной кнопкой), в которую входит задача. */
  batch_id: number | null;
}

export interface JobList {
  items: Job[];
  total: number;
  offset: number;
  limit: number;
}

export interface JobListParams {
  kind?: JobKind;
  status?: JobStatus;
  target_key?: string;
  user_id?: number;
  offset?: number;
  limit?: number;
}

// === Пачка: проверка многих серверов одной кнопкой ===

export type BatchStatus = JobStatus;
export type ScopeKind = 'problems' | 'stale' | 'all' | 'manual';

/** Симка в частичном результате идущей пробы: ждёт, проверяем или уже есть вердикт. */
export interface PartialLeg {
  target: string;
  operator: string | null;
  region: string | null;
  dpi: string | null;
  state: 'queued' | 'pending' | 'running' | 'done' | string;
  verdict: Verdict | null;
  latency_ms: number | null;
}

export interface ProbePartial {
  done: number;
  total: number;
  elapsed_sec: number | null;
  legs: PartialLeg[];
}

export interface BatchJob {
  id: number;
  status: JobStatus;
  phase: JobPhase | null;
  target_keys: string[];
  cost_kopeks: number | null;
  partial: ProbePartial | null;
}

export interface Batch {
  id: number;
  status: BatchStatus;
  phase: string | null;
  scope: { kind: ScopeKind; host_refs: string[] };
  total_targets: number;
  done_targets: number;
  estimated_kopeks: number | null;
  cost_kopeks: number | null;
  error_message: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  jobs: BatchJob[];
}

export interface BatchList {
  items: Batch[];
  total: number;
  offset: number;
  limit: number;
}

export interface BatchCreateRequest {
  host_refs: string[];
  units: string[];
  dpi: Dpi;
  probes: Probes;
  sni_hosts: string[];
  scope_kind: ScopeKind;
}

export interface BatchPreview {
  targets: TargetOut[];
  units_resolved: string[];
  chunks: number;
  cost_kopeks: number | null;
  estimated_minutes: number;
  warnings: string[];
  balance_kopeks: number | null;
}

export interface ActiveBatch {
  id: number;
  total_targets: number;
  done_targets: number;
  started_at: string | null;
}

export interface SummaryCell {
  verdict: Verdict;
  matches_expectation: boolean | null;
  checked_at: string;
  job_id: number;
}

export interface SummaryRow {
  target_key: string;
  kind: TargetKind | null;
  ref: string | null;
  label: string;
  purpose: Purpose;
  purpose_guessed: boolean;
  /** false — цели уже нет в панели, строка построена по старым легам. */
  in_panel: boolean;
  cells: Record<string, SummaryCell>;
}

export interface Summary {
  dpi: Dpi;
  units: Unit[];
  rows: SummaryRow[];
  panel_error: string | null;
}

export interface PrefUpdate {
  target_kind: 'host' | 'node';
  target_ref: string;
  purpose?: Purpose;
  excluded?: boolean;
  note?: string;
}

export interface Pref {
  target_kind: 'host' | 'node';
  target_ref: string;
  purpose: Purpose;
  excluded: boolean;
  note: string | null;
}

export interface UnitsParams {
  dpi?: Dpi;
  operator?: string;
  region?: string;
}

const BASE = '/cabinet/admin/reachability';
const PARSE_TIMEOUT_MS = 180_000;

export const reachabilityApi = {
  getStatus: async (): Promise<ReachabilityStatus> => (await apiClient.get(`${BASE}/status`)).data,

  getUnits: async (params: UnitsParams = {}): Promise<Unit[]> =>
    (await apiClient.get(`${BASE}/units`, { params })).data.units,

  getHosts: async (includeDisabled = false): Promise<HostTarget[]> =>
    (
      await apiClient.get(`${BASE}/targets/hosts`, {
        params: { include_disabled: includeDisabled },
      })
    ).data.items,

  getNodes: async (): Promise<NodeTarget[]> =>
    (await apiClient.get(`${BASE}/targets/nodes`)).data.items,

  getSubscriptionConfigs: async (params: {
    shortUuid?: string;
    userId?: number;
  }): Promise<SubscriptionConfigs> =>
    (
      await apiClient.get(`${BASE}/targets/subscription`, {
        params: { short_uuid: params.shortUuid, user_id: params.userId },
      })
    ).data,

  // Чужую подписку бот скачивает сам: у подписки на тысячи серверов это десятки мегабайт
  // с чужого сервера — обычных 30 секунд на запрос не хватает.
  parseInput: async (rawInput: string): Promise<ParsedInput> =>
    (
      await apiClient.post(
        `${BASE}/targets/parse`,
        { raw_input: rawInput },
        { timeout: PARSE_TIMEOUT_MS },
      )
    ).data,

  /** Справочник GEO: округа, регионы, провайдеры; города — по фильтру или поиску (бесплатно). */
  getGeoCatalog: async (params: GeoCatalogParams): Promise<GeoCatalog> =>
    (await apiClient.get(`${BASE}/geo/catalog`, { params })).data,

  updatePref: async (body: PrefUpdate): Promise<Pref> =>
    (await apiClient.put(`${BASE}/targets/prefs`, body)).data,

  previewJob: async (body: JobCreateRequest): Promise<PreviewResponse> =>
    (await apiClient.post(`${BASE}/jobs/preview`, body)).data,

  createJob: async (body: JobCreateRequest): Promise<Job> =>
    (await apiClient.post(`${BASE}/jobs`, body)).data,

  listJobs: async (params: JobListParams = {}): Promise<JobList> =>
    (await apiClient.get(`${BASE}/jobs`, { params })).data,

  getJob: async (id: number): Promise<Job> => (await apiClient.get(`${BASE}/jobs/${id}`)).data,

  cancelJob: async (id: number): Promise<Job> =>
    (await apiClient.post(`${BASE}/jobs/${id}/cancel`)).data,

  getSummary: async (dpi: Dpi = 'on'): Promise<Summary> =>
    (await apiClient.get(`${BASE}/summary/hosts`, { params: { dpi } })).data,

  previewBatch: async (body: BatchCreateRequest): Promise<BatchPreview> =>
    (await apiClient.post(`${BASE}/batches/preview`, body)).data,

  createBatch: async (body: BatchCreateRequest): Promise<Batch> =>
    (await apiClient.post(`${BASE}/batches`, body)).data,

  listBatches: async (params: { offset?: number; limit?: number } = {}): Promise<BatchList> =>
    (await apiClient.get(`${BASE}/batches`, { params })).data,

  getBatch: async (id: number): Promise<Batch> =>
    (await apiClient.get(`${BASE}/batches/${id}`)).data,

  cancelBatch: async (id: number): Promise<Batch> =>
    (await apiClient.post(`${BASE}/batches/${id}/cancel`)).data,
};
