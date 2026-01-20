import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ticketNotificationsApi } from '../api/ticketNotifications'
import { useAuthStore } from '../store/auth'
import { useToast } from './Toast'
import { useWebSocket, WSMessage } from '../hooks/useWebSocket'
import { useTelegramWebApp } from '../hooks/useTelegramWebApp'
import type { TicketNotification } from '../types'

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

interface TicketNotificationBellProps {
  isAdmin?: boolean
}

export default function TicketNotificationBell({ isAdmin = false }: TicketNotificationBellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const { showToast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, safeAreaInset, contentSafeAreaInset } = useTelegramWebApp()

  // Calculate dropdown top position (account for fullscreen safe area + TG buttons)
  const dropdownTop = isFullscreen
    ? Math.max(safeAreaInset.top, contentSafeAreaInset.top) + 45 + 64 // safe area + TG buttons + header
    : 64 // default header height

  // Show toast for WebSocket notification
  const showWSNotificationToast = useCallback((message: WSMessage) => {
    const isNewTicket = message.type === 'ticket.new'
    const isAdminReply = message.type === 'ticket.admin_reply'
    const isUserReply = message.type === 'ticket.user_reply'

    const icon = isNewTicket ? (
      <span className="text-lg">🎫</span>
    ) : isAdminReply ? (
      <span className="text-lg">💬</span>
    ) : (
      <span className="text-lg">📨</span>
    )

    const ticketTitle = message.title || ''

    let toastTitle: string
    let toastMessage: string

    if (isNewTicket) {
      toastTitle = t('notifications.newTicketTitle', 'New Ticket')
      toastMessage = message.message || t('notifications.newTicket', 'New ticket: {{title}}', { title: ticketTitle })
    } else if (isUserReply) {
      toastTitle = t('notifications.newUserReplyTitle', 'User Reply')
      toastMessage = message.message || t('notifications.newUserReply', 'User replied in ticket: {{title}}', { title: ticketTitle })
    } else {
      toastTitle = t('notifications.newReplyTitle', 'New Reply')
      toastMessage = message.message || t('notifications.newReply', 'New reply in ticket: {{title}}', { title: ticketTitle })
    }

    showToast({
      type: 'info',
      title: toastTitle,
      message: toastMessage,
      icon,
      onClick: () => {
        navigate(isAdmin ? `/admin/tickets?ticket=${message.ticket_id}` : `/support?ticket=${message.ticket_id}`)
      },
      duration: 8000,
    })
  }, [showToast, navigate, isAdmin, t])

  // Handle WebSocket message
  const handleWSMessage = useCallback((message: WSMessage) => {
    // Check if this notification is relevant for this user type
    const isAdminNotification = message.type === 'ticket.new' || message.type === 'ticket.user_reply'
    const isUserNotification = message.type === 'ticket.admin_reply'

    if ((isAdmin && isAdminNotification) || (!isAdmin && isUserNotification)) {
      // Show toast
      showWSNotificationToast(message)

      // Invalidate queries to refresh count and list
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count']
      })
      queryClient.invalidateQueries({
        queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications']
      })
    }
  }, [isAdmin, showWSNotificationToast, queryClient])

  // WebSocket connection
  useWebSocket({
    onMessage: handleWSMessage,
  })

  // Fetch unread count (with slower polling as fallback when WS disconnects)
  const { data: unreadData } = useQuery({
    queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'],
    queryFn: isAdmin ? ticketNotificationsApi.getAdminUnreadCount : ticketNotificationsApi.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60000, // Poll every 60 seconds as fallback
    staleTime: 30000,
  })

  // Fetch notifications when dropdown is open
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'],
    queryFn: () => isAdmin
      ? ticketNotificationsApi.getAdminNotifications(false, 10)
      : ticketNotificationsApi.getNotifications(false, 10),
    enabled: isAuthenticated && isOpen,
    staleTime: 5000,
  })

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: isAdmin ? ticketNotificationsApi.markAllAdminAsRead : ticketNotificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'] })
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'] })
    },
  })

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: isAdmin ? ticketNotificationsApi.markAdminAsRead : ticketNotificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['admin-ticket-notifications'] : ['ticket-notifications'] })
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['admin-ticket-notifications-count'] : ['ticket-notifications-count'] })
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = (notification: TicketNotification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id)
    }
    setIsOpen(false)
    navigate(isAdmin ? `/admin/tickets?ticket=${notification.ticket_id}` : `/support?ticket=${notification.ticket_id}`)
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('notifications.justNow', 'Just now')
    if (diffMins < 60) return t('notifications.minutesAgo', '{{count}} min ago', { count: diffMins })
    if (diffHours < 24) return t('notifications.hoursAgo', '{{count}} h ago', { count: diffHours })
    return t('notifications.daysAgo', '{{count}} d ago', { count: diffDays })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_ticket':
        return <span className="text-lg">🎫</span>
      case 'admin_reply':
        return <span className="text-lg">💬</span>
      case 'user_reply':
        return <span className="text-lg">📨</span>
      default:
        return <span className="text-lg">🔔</span>
    }
  }

  const unreadCount = unreadData?.unread_count || 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition-all duration-200 bg-dark-800/50 hover:bg-dark-700 border border-dark-700/50 text-dark-400 hover:text-accent-400"
        title={t('notifications.ticketNotifications', 'Ticket notifications')}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-error-500 rounded-full px-1 animate-scale-in-bounce">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`fixed sm:absolute sm:top-auto right-4 sm:right-0 left-4 sm:left-auto mt-0 sm:mt-2 w-auto sm:w-96 bg-dark-900/95 backdrop-blur-xl border border-dark-700/50 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden z-50 animate-scale-in ${
            !isFullscreen ? 'top-16' : ''
          }`}
          style={isFullscreen ? { top: `${dropdownTop}px` } : undefined}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50 bg-dark-800/30">
            <h3 className="text-sm font-semibold text-dark-100">
              {t('notifications.ticketNotifications', 'Ticket Notifications')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 disabled:opacity-50 transition-colors"
              >
                <CheckIcon />
                {t('notifications.markAllRead', 'Mark all read')}
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-dark-500">
                <div className="animate-spin w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : notificationsData?.items && notificationsData.items.length > 0 ? (
              notificationsData.items.map((notification: TicketNotification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-4 py-3 border-b border-dark-800/50 last:border-b-0 hover:bg-dark-800/50 transition-all duration-200 ${
                    !notification.is_read ? 'bg-accent-500/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-dark-800/50 flex items-center justify-center">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${!notification.is_read ? 'text-dark-100 font-medium' : 'text-dark-300'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0 pt-1">
                        <span className="w-2.5 h-2.5 bg-accent-500 rounded-full block shadow-lg shadow-accent-500/50"></span>
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-dark-800/50 flex items-center justify-center mx-auto mb-3 text-dark-500">
                  <BellIcon />
                </div>
                <p className="text-sm text-dark-500">{t('notifications.noNotifications', 'No notifications')}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {notificationsData?.items && notificationsData.items.length > 0 && (
            <div className="px-4 py-3 border-t border-dark-700/50 bg-dark-800/30">
              <button
                onClick={() => {
                  setIsOpen(false)
                  navigate(isAdmin ? '/admin/tickets' : '/support')
                }}
                className="w-full text-center text-sm text-accent-400 hover:text-accent-300 py-1 transition-colors"
              >
                {t('notifications.viewAll', 'View all tickets')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
