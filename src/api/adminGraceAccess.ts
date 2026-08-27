import apiClient from './client';

/**
 * Grace access — temporary restricted VPN for an expired or traffic-limited
 * subscription, so the user can still reach the payment page and renew.
 *
 * The keys behind this screen also exist as twelve separate rows on the generic
 * settings page. They are grouped here because they only make sense together:
 * turning the mode on without a squad UUID makes the bot start with grace
 * disabled, and the only trace is one line in the startup log.
 */

export type GraceAccessMode = 'false' | 'observe' | 'true' | 'drain';

export interface GraceAccessConfig {
  mode: GraceAccessMode;
  duration_hours: number;
  expired_squad_uuid: string;
  limited_squad_uuid: string;
  external_squad_uuid: string;
  traffic_gb: number;
  trial_enabled: boolean;
  daily_enabled: boolean;
  free_enabled: boolean;
  reconcile_interval_seconds: number;
  reconcile_batch_size: number;
  candidate_lookback_minutes: number;
}

export interface GraceAccessRuntimeState {
  /** What the process is doing now — the mode is captured at startup. */
  running_mode: string;
  configured_mode: string;
  restart_required: boolean;
}

export interface GraceAccessStats {
  states: Record<string, number>;
  open: number;
  open_errors: number;
  completed_errors: number;
}

export interface GraceAccessIssue {
  field: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface GraceSessionError {
  id: string;
  subscription_id: number;
  state: string;
  completion_reason: string | null;
  last_error: string;
}

export interface GraceAccessOverview {
  config: GraceAccessConfig;
  /** Fields pinned in .env: the file wins after a restart, so they are read-only here. */
  env_locked: string[];
  /** Fields the runtime reads only at startup. */
  restart_only: string[];
  runtime: GraceAccessRuntimeState;
  stats: GraceAccessStats;
  issues: GraceAccessIssue[];
  recent_errors: GraceSessionError[];
}

export type GraceAccessUpdate = Partial<GraceAccessConfig>;

export interface GraceSessionUser {
  id: number;
  telegram_id: number | null;
  username: string | null;
  full_name: string;
}

export interface GraceSessionItem {
  id: string;
  subscription_id: number;
  remnawave_id: number | null;
  reason: string;
  state: string;
  started_at: string;
  grace_until: string;
  updated_at: string;
  completion_reason: string | null;
  last_error: string | null;
  user: GraceSessionUser | null;
}

export interface GraceSessionsPage {
  items: GraceSessionItem[];
  total: number;
  page: number;
  limit: number;
}

export type GraceSessionFilter =
  | 'open'
  | 'pending'
  | 'active'
  | 'restoring'
  | 'completed'
  | 'errors';

export interface GraceSquadOption {
  uuid: string;
  name: string;
  members_count: number;
}

export interface GraceSquadsResponse {
  /** False when the panel could not be reached — the UUID stays a manual field. */
  available: boolean;
  items: GraceSquadOption[];
}

export const adminGraceAccessApi = {
  getOverview: async (): Promise<GraceAccessOverview> => {
    const response = await apiClient.get<GraceAccessOverview>('/cabinet/admin/grace-access');
    return response.data;
  },

  update: async (payload: GraceAccessUpdate): Promise<GraceAccessOverview> => {
    const response = await apiClient.put<GraceAccessOverview>(
      '/cabinet/admin/grace-access',
      payload,
    );
    return response.data;
  },

  getSquads: async (): Promise<GraceSquadsResponse> => {
    const response = await apiClient.get<GraceSquadsResponse>('/cabinet/admin/grace-access/squads');
    return response.data;
  },

  getSessions: async (params: {
    state?: GraceSessionFilter;
    page?: number;
    limit?: number;
  }): Promise<GraceSessionsPage> => {
    const response = await apiClient.get<GraceSessionsPage>(
      '/cabinet/admin/grace-access/sessions',
      { params },
    );
    return response.data;
  },
};
