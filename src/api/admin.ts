import apiClient from './client'

export interface AdminTicketUser {
  id: number
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
}

export interface AdminTicketMessage {
  id: number
  message_text: string
  is_from_admin: boolean
  has_media: boolean
  media_type: string | null
  media_file_id: string | null
  media_caption: string | null
  created_at: string
}

export interface AdminTicket {
  id: number
  title: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  closed_at: string | null
  messages_count: number
  user: AdminTicketUser | null
  last_message: AdminTicketMessage | null
}

export interface AdminTicketDetail {
  id: number
  title: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  closed_at: string | null
  is_reply_blocked: boolean
  user: AdminTicketUser | null
  messages: AdminTicketMessage[]
}

export interface AdminTicketStats {
  total: number
  open: number
  pending: number
  answered: number
  closed: number
}

export interface TicketSettings {
  sla_enabled: boolean
  sla_minutes: number
  sla_check_interval_seconds: number
  sla_reminder_cooldown_minutes: number
  support_system_mode: string  // tickets, contact, both
  cabinet_user_notifications_enabled: boolean
  cabinet_admin_notifications_enabled: boolean
}

export interface TicketSettingsUpdate {
  sla_enabled?: boolean
  sla_minutes?: number
  sla_check_interval_seconds?: number
  sla_reminder_cooldown_minutes?: number
  support_system_mode?: string
  cabinet_user_notifications_enabled?: boolean
  cabinet_admin_notifications_enabled?: boolean
}

export interface AdminTicketListResponse {
  items: AdminTicket[]
  total: number
  page: number
  per_page: number
  pages: number
}

export const adminApi = {
  // Check if current user is admin
  checkIsAdmin: async (): Promise<{ is_admin: boolean }> => {
    const response = await apiClient.get('/cabinet/auth/me/is-admin')
    return response.data
  },

  // Get ticket statistics
  getTicketStats: async (): Promise<AdminTicketStats> => {
    const response = await apiClient.get('/cabinet/admin/tickets/stats')
    return response.data
  },

  // Get all tickets
  getTickets: async (params: {
    page?: number
    per_page?: number
    status?: string
    priority?: string
  } = {}): Promise<AdminTicketListResponse> => {
    const response = await apiClient.get('/cabinet/admin/tickets', { params })
    return response.data
  },

  // Get single ticket with messages
  getTicket: async (ticketId: number): Promise<AdminTicketDetail> => {
    const response = await apiClient.get(`/cabinet/admin/tickets/${ticketId}`)
    return response.data
  },

  // Reply to ticket
  replyToTicket: async (ticketId: number, message: string): Promise<AdminTicketMessage> => {
    const response = await apiClient.post(`/cabinet/admin/tickets/${ticketId}/reply`, { message })
    return response.data
  },

  // Update ticket status
  updateTicketStatus: async (ticketId: number, status: string): Promise<AdminTicketDetail> => {
    const response = await apiClient.post(`/cabinet/admin/tickets/${ticketId}/status`, { status })
    return response.data
  },

  // Update ticket priority
  updateTicketPriority: async (ticketId: number, priority: string): Promise<AdminTicketDetail> => {
    const response = await apiClient.post(`/cabinet/admin/tickets/${ticketId}/priority`, { priority })
    return response.data
  },

  // Get ticket settings
  getTicketSettings: async (): Promise<TicketSettings> => {
    const response = await apiClient.get('/cabinet/admin/tickets/settings')
    return response.data
  },

  // Update ticket settings
  updateTicketSettings: async (settings: TicketSettingsUpdate): Promise<TicketSettings> => {
    const response = await apiClient.patch('/cabinet/admin/tickets/settings', settings)
    return response.data
  },
}

// ============ Dashboard Stats Types ============

export interface NodeStatus {
  uuid: string
  name: string
  address: string
  is_connected: boolean
  is_disabled: boolean
  users_online: number
  traffic_used_bytes?: number
  uptime?: string
}

export interface NodesOverview {
  total: number
  online: number
  offline: number
  disabled: number
  total_users_online: number
  nodes: NodeStatus[]
}

export interface RevenueData {
  date: string
  amount_kopeks: number
  amount_rubles: number
}

export interface SubscriptionStats {
  total: number
  active: number
  trial: number
  paid: number
  expired: number
  purchased_today: number
  purchased_week: number
  purchased_month: number
  trial_to_paid_conversion: number
}

export interface FinancialStats {
  income_today_kopeks: number
  income_today_rubles: number
  income_month_kopeks: number
  income_month_rubles: number
  income_total_kopeks: number
  income_total_rubles: number
  subscription_income_kopeks: number
  subscription_income_rubles: number
}

export interface ServerStats {
  total_servers: number
  available_servers: number
  servers_with_connections: number
  total_revenue_kopeks: number
  total_revenue_rubles: number
}

export interface TariffStatItem {
  tariff_id: number
  tariff_name: string
  active_subscriptions: number
  trial_subscriptions: number
  purchased_today: number
  purchased_week: number
  purchased_month: number
}

export interface TariffStats {
  tariffs: TariffStatItem[]
  total_tariff_subscriptions: number
}

export interface DashboardStats {
  nodes: NodesOverview
  subscriptions: SubscriptionStats
  financial: FinancialStats
  servers: ServerStats
  revenue_chart: RevenueData[]
  tariff_stats?: TariffStats
}

// ============ Dashboard Stats API ============

export const statsApi = {
  // Get complete dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/cabinet/admin/stats/dashboard')
    return response.data
  },

  // Get nodes status
  getNodesStatus: async (): Promise<NodesOverview> => {
    const response = await apiClient.get('/cabinet/admin/stats/nodes')
    return response.data
  },

  // Restart a node
  restartNode: async (nodeUuid: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/cabinet/admin/stats/nodes/${nodeUuid}/restart`)
    return response.data
  },

  // Toggle node (enable/disable)
  toggleNode: async (nodeUuid: string): Promise<{ success: boolean; message: string; is_disabled: boolean }> => {
    const response = await apiClient.post(`/cabinet/admin/stats/nodes/${nodeUuid}/toggle`)
    return response.data
  },
}
