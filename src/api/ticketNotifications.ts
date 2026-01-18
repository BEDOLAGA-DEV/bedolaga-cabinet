import apiClient from './client'
import type { TicketNotificationList, UnreadCountResponse } from '../types'

export const ticketNotificationsApi = {
  // User notifications
  getNotifications: async (unreadOnly = false, limit = 50, offset = 0): Promise<TicketNotificationList> => {
    const response = await apiClient.get('/cabinet/tickets/notifications', {
      params: { unread_only: unreadOnly, limit, offset }
    })
    return response.data
  },

  getUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get('/cabinet/tickets/notifications/unread-count')
    return response.data
  },

  markAsRead: async (notificationId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/cabinet/tickets/notifications/${notificationId}/read`)
    return response.data
  },

  markAllAsRead: async (): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post('/cabinet/tickets/notifications/read-all')
    return response.data
  },

  markTicketAsRead: async (ticketId: number): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post(`/cabinet/tickets/notifications/ticket/${ticketId}/read`)
    return response.data
  },

  // Admin notifications
  getAdminNotifications: async (unreadOnly = false, limit = 50, offset = 0): Promise<TicketNotificationList> => {
    const response = await apiClient.get('/cabinet/admin/tickets/notifications', {
      params: { unread_only: unreadOnly, limit, offset }
    })
    return response.data
  },

  getAdminUnreadCount: async (): Promise<UnreadCountResponse> => {
    const response = await apiClient.get('/cabinet/admin/tickets/notifications/unread-count')
    return response.data
  },

  markAdminAsRead: async (notificationId: number): Promise<{ success: boolean }> => {
    const response = await apiClient.post(`/cabinet/admin/tickets/notifications/${notificationId}/read`)
    return response.data
  },

  markAllAdminAsRead: async (): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post('/cabinet/admin/tickets/notifications/read-all')
    return response.data
  },

  markAdminTicketAsRead: async (ticketId: number): Promise<{ success: boolean; marked_count: number }> => {
    const response = await apiClient.post(`/cabinet/admin/tickets/notifications/ticket/${ticketId}/read`)
    return response.data
  },
}

export default ticketNotificationsApi
