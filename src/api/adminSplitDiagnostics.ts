import apiClient from './client';

export const splitDiagnosticQueueKeys = [
  'collection_pending',
  'collection_attention',
  'settlement_pending',
  'settlement_errors',
  'delivery_pending',
  'delivery_attention',
  'renewal_pending',
  'enrollment_pending',
  'reverse_pending',
  'node_tail_pending',
  'node_tail_attention',
  'node_tail_delayed',
  'topology_attention',
  'connection_drop_pending',
  'connection_drop_unknown',
] as const;
export type SplitDiagnosticQueue = (typeof splitDiagnosticQueueKeys)[number];
export interface SplitDiagnosticScope {
  number: number;
  collection_phase: 'building' | 'collecting' | 'settling' | 'complete' | 'attention' | null;
  last_success_at: string | null;
  pause_until: string | null;
  /** General durable accounting check; never a purchase authorization. */
  diagnostic_ready: boolean;
  /** Null when this HTTP process has no local runtime observation. */
  local_runtime_ready: boolean | null;
  queues: Partial<Record<SplitDiagnosticQueue, number>>;
  oldest_pending_at: string | null;
  warnings: string[];
}
export interface SplitDiagnosticsResponse {
  checked_at: string;
  freshness_seconds: number;
  local_runtime_running: boolean | null;
  force_disconnect_enabled: boolean;
  active_bindings: number;
  bindings_truncated: boolean;
  unbound_enrollments: number;
  scopes: SplitDiagnosticScope[];
}
export async function getSplitDiagnostics(): Promise<SplitDiagnosticsResponse> {
  const response = await apiClient.get<SplitDiagnosticsResponse>(
    '/cabinet/admin/remnawave/split-diagnostics',
  );
  return response.data;
}
