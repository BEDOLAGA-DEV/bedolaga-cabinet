import apiClient from './client';

// === Типы контракта (бот: app/cabinet/schemas/reachability.py) ===

export type JobKind = 'probe' | 'vless' | 'scan';
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
}

export interface SubscriptionConfigs {
  short_uuid: string;
  configs: SubscriptionConfig[];
  rejected: RejectedConfig[];
}

export interface TargetIn {
  kind: TargetKind;
  ref?: string;
  value?: string;
  short_uuid?: string;
  index?: number;
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

  retrieveJob: async (id: number): Promise<Job> =>
    (await apiClient.post(`${BASE}/jobs/${id}/retrieve`)).data,

  getSummary: async (dpi: Dpi = 'on'): Promise<Summary> =>
    (await apiClient.get(`${BASE}/summary/hosts`, { params: { dpi } })).data,
};
