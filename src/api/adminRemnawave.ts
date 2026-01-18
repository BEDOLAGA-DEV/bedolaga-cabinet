import { apiClient } from './client'

// ============ Types ============

// Status & Connection
export interface ConnectionStatus {
  status: string
  message: string
  api_url?: string
  status_code?: number
  system_info?: Record<string, unknown>
}

export interface RemnaWaveStatusResponse {
  is_configured: boolean
  configuration_error?: string
  connection?: ConnectionStatus
}

// System Statistics
export interface SystemSummary {
  users_online: number
  total_users: number
  active_connections: number
  nodes_online: number
  users_last_day: number
  users_last_week: number
  users_never_online: number
  total_user_traffic: number
}

export interface ServerInfo {
  cpu_cores: number
  cpu_physical_cores: number
  memory_total: number
  memory_used: number
  memory_free: number
  memory_available: number
  uptime_seconds: number
}

export interface Bandwidth {
  realtime_download: number
  realtime_upload: number
  realtime_total: number
}

export interface TrafficPeriod {
  current: number
  previous: number
  difference?: string
}

export interface TrafficPeriods {
  last_2_days: TrafficPeriod
  last_7_days: TrafficPeriod
  last_30_days: TrafficPeriod
  current_month: TrafficPeriod
  current_year: TrafficPeriod
}

export interface SystemStatsResponse {
  system: SystemSummary
  users_by_status: Record<string, number>
  server_info: ServerInfo
  bandwidth: Bandwidth
  traffic_periods: TrafficPeriods
  nodes_realtime: Record<string, unknown>[]
  nodes_weekly: Record<string, unknown>[]
  last_updated?: string
}

// Nodes
export interface NodeInfo {
  uuid: string
  name: string
  address: string
  country_code?: string
  is_connected: boolean
  is_disabled: boolean
  is_node_online: boolean
  is_xray_running: boolean
  users_online?: number
  traffic_used_bytes?: number
  traffic_limit_bytes?: number
  last_status_change?: string
  last_status_message?: string
  xray_uptime?: string
  is_traffic_tracking_active: boolean
  traffic_reset_day?: number
  notify_percent?: number
  consumption_multiplier: number
  cpu_count?: number
  cpu_model?: string
  total_ram?: string
  created_at?: string
  updated_at?: string
  provider_uuid?: string
}

export interface NodesListResponse {
  items: NodeInfo[]
  total: number
}

export interface NodesOverview {
  total: number
  online: number
  offline: number
  disabled: number
  total_users_online: number
  nodes: NodeInfo[]
}

export interface NodeStatisticsResponse {
  node: NodeInfo
  realtime?: Record<string, unknown>
  usage_history: Record<string, unknown>[]
  last_updated?: string
}

export interface NodeActionResponse {
  success: boolean
  message?: string
  is_disabled?: boolean
}

// Squads
export interface SquadWithLocalInfo {
  uuid: string
  name: string
  members_count: number
  inbounds_count: number
  inbounds: Record<string, unknown>[]
  local_id?: number
  display_name?: string
  country_code?: string
  is_available?: boolean
  is_trial_eligible?: boolean
  price_kopeks?: number
  max_users?: number
  current_users?: number
  is_synced: boolean
}

export interface SquadsListResponse {
  items: SquadWithLocalInfo[]
  total: number
}

export interface SquadDetailResponse extends SquadWithLocalInfo {
  description?: string
  sort_order?: number
  active_subscriptions: number
}

export interface SquadOperationResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
}

// Migration
export interface MigrationPreviewResponse {
  squad_uuid: string
  squad_name: string
  current_users: number
  max_users?: number
  users_to_migrate: number
}

export interface MigrationStats {
  source_uuid: string
  target_uuid: string
  total: number
  updated: number
  panel_updated: number
  panel_failed: number
  source_removed: number
  target_added: number
}

export interface MigrationResponse {
  success: boolean
  message?: string
  error?: string
  data?: MigrationStats
}

// Inbounds
export interface InboundsListResponse {
  items: Record<string, unknown>[]
  total: number
}

// Auto Sync
export interface AutoSyncStatus {
  enabled: boolean
  times: string[]
  next_run?: string
  is_running: boolean
  last_run_started_at?: string
  last_run_finished_at?: string
  last_run_success?: boolean
  last_run_reason?: string
  last_run_error?: string
  last_user_stats?: Record<string, unknown>
  last_server_stats?: Record<string, unknown>
}

export interface AutoSyncRunResponse {
  started: boolean
  success?: boolean
  error?: string
  user_stats?: Record<string, unknown>
  server_stats?: Record<string, unknown>
  reason?: string
}

// Sync
export interface SyncResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
}

// ============ API ============

export const adminRemnawaveApi = {
  // Status & Connection
  getStatus: async (): Promise<RemnaWaveStatusResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/status')
    return response.data
  },

  // System Statistics
  getSystemStats: async (): Promise<SystemStatsResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/system')
    return response.data
  },

  // Nodes
  getNodes: async (): Promise<NodesListResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/nodes')
    return response.data
  },

  getNodesOverview: async (): Promise<NodesOverview> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/nodes/overview')
    return response.data
  },

  getNodesRealtime: async (): Promise<Record<string, unknown>[]> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/nodes/realtime')
    return response.data
  },

  getNode: async (uuid: string): Promise<NodeInfo> => {
    const response = await apiClient.get(`/cabinet/admin/remnawave/nodes/${uuid}`)
    return response.data
  },

  getNodeStatistics: async (uuid: string): Promise<NodeStatisticsResponse> => {
    const response = await apiClient.get(`/cabinet/admin/remnawave/nodes/${uuid}/statistics`)
    return response.data
  },

  nodeAction: async (uuid: string, action: 'enable' | 'disable' | 'restart'): Promise<NodeActionResponse> => {
    const response = await apiClient.post(`/cabinet/admin/remnawave/nodes/${uuid}/action`, { action })
    return response.data
  },

  restartAllNodes: async (): Promise<NodeActionResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/nodes/restart-all')
    return response.data
  },

  // Squads
  getSquads: async (): Promise<SquadsListResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/squads')
    return response.data
  },

  getSquad: async (uuid: string): Promise<SquadDetailResponse> => {
    const response = await apiClient.get(`/cabinet/admin/remnawave/squads/${uuid}`)
    return response.data
  },

  createSquad: async (data: { name: string; inbound_uuids?: string[] }): Promise<SquadOperationResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/squads', data)
    return response.data
  },

  updateSquad: async (uuid: string, data: { name?: string; inbound_uuids?: string[] }): Promise<SquadOperationResponse> => {
    const response = await apiClient.patch(`/cabinet/admin/remnawave/squads/${uuid}`, data)
    return response.data
  },

  deleteSquad: async (uuid: string): Promise<SquadOperationResponse> => {
    const response = await apiClient.delete(`/cabinet/admin/remnawave/squads/${uuid}`)
    return response.data
  },

  squadAction: async (uuid: string, data: {
    action: 'add_all_users' | 'remove_all_users' | 'delete' | 'rename' | 'update_inbounds'
    name?: string
    inbound_uuids?: string[]
  }): Promise<SquadOperationResponse> => {
    const response = await apiClient.post(`/cabinet/admin/remnawave/squads/${uuid}/action`, data)
    return response.data
  },

  // Migration
  getMigrationPreview: async (uuid: string): Promise<MigrationPreviewResponse> => {
    const response = await apiClient.get(`/cabinet/admin/remnawave/squads/${uuid}/migration-preview`)
    return response.data
  },

  migrateSquad: async (sourceUuid: string, targetUuid: string): Promise<MigrationResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/squads/migrate', {
      source_uuid: sourceUuid,
      target_uuid: targetUuid,
    })
    return response.data
  },

  // Inbounds
  getInbounds: async (): Promise<InboundsListResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/inbounds')
    return response.data
  },

  // Auto Sync
  getAutoSyncStatus: async (): Promise<AutoSyncStatus> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/sync/auto/status')
    return response.data
  },

  toggleAutoSync: async (enabled: boolean): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/auto/toggle', { enabled })
    return response.data
  },

  runAutoSync: async (): Promise<AutoSyncRunResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/auto/run')
    return response.data
  },

  // Manual Sync
  syncFromPanel: async (mode: 'all' | 'new_only' | 'update_only' = 'all'): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/from-panel', { mode })
    return response.data
  },

  syncToPanel: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/to-panel')
    return response.data
  },

  syncServers: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/servers')
    return response.data
  },

  validateSubscriptions: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/subscriptions/validate')
    return response.data
  },

  cleanupSubscriptions: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/subscriptions/cleanup')
    return response.data
  },

  syncSubscriptionStatuses: async (): Promise<SyncResponse> => {
    const response = await apiClient.post('/cabinet/admin/remnawave/sync/subscriptions/statuses')
    return response.data
  },

  getSyncRecommendations: async (): Promise<SyncResponse> => {
    const response = await apiClient.get('/cabinet/admin/remnawave/sync/recommendations')
    return response.data
  },
}

export default adminRemnawaveApi
