import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { adminApi, AdminTicket, AdminTicketDetail, AdminTicketMessage } from '../api/admin'
import { ticketsApi } from '../api/tickets'

function AdminMessageMedia({ message, t }: { message: AdminTicketMessage; t: (key: string) => string }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)

  if (!message.has_media || !message.media_file_id) {
    return null
  }

  const mediaUrl = ticketsApi.getMediaUrl(message.media_file_id)

  if (message.media_type === 'photo') {
    return (
      <div className="mt-3">
        {!imageLoaded && !imageError && (
          <div className="w-full h-40 bg-dark-800 rounded-lg animate-pulse flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {imageError ? (
          <div className="w-full h-32 bg-dark-800 rounded-lg flex items-center justify-center text-dark-400 text-sm">
            {t('support.imageLoadFailed')}
          </div>
        ) : (
          <img
            src={mediaUrl}
            alt={message.media_caption || 'Attached image'}
            className={`max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
              imageLoaded ? '' : 'hidden'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            onClick={() => setShowFullImage(true)}
          />
        )}
        {message.media_caption && (
          <p className="text-xs text-dark-400 mt-1">{message.media_caption}</p>
        )}
        {showFullImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              onClick={() => setShowFullImage(false)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={mediaUrl} alt={message.media_caption || 'Attached image'} className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3">
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {message.media_caption || `Download ${message.media_type}`}
      </a>
    </div>
  )
}

export default function AdminTickets() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [replyText, setReplyText] = useState('')
  const [page, setPage] = useState(1)
  const [showSettings, setShowSettings] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['admin-ticket-stats'],
    queryFn: adminApi.getTicketStats,
  })

  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['admin-tickets', page, statusFilter],
    queryFn: () => adminApi.getTickets({
      page,
      per_page: 20,
      status: statusFilter || undefined,
    }),
  })

  const { data: selectedTicket, isLoading: ticketLoading } = useQuery({
    queryKey: ['admin-ticket', selectedTicketId],
    queryFn: () => adminApi.getTicket(selectedTicketId!),
    enabled: !!selectedTicketId,
  })

  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: number; message: string }) =>
      adminApi.replyToTicket(ticketId, message),
    onSuccess: () => {
      setReplyText('')
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-stats'] })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: number; status: string }) =>
      adminApi.updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', selectedTicketId] })
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-stats'] })
    },
  })

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicketId || !replyText.trim()) return
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyText })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return 'badge-info'
      case 'pending': return 'badge-warning'
      case 'answered': return 'badge-success'
      case 'closed': return 'badge-neutral'
      default: return 'badge-neutral'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'badge-error'
      case 'high': return 'badge-warning'
      default: return 'badge-neutral'
    }
  }

  const formatUser = (ticket: AdminTicket | AdminTicketDetail) => {
    if (!ticket.user) return 'Unknown'
    const { first_name, last_name, username, telegram_id } = ticket.user
    if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim()
    if (username) return `@${username}`
    return `ID: ${telegram_id}`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('admin.tickets.title')}</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="btn-secondary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('admin.tickets.settings')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="card text-center">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">{t('admin.tickets.total')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-accent-400">{stats.open}</div>
            <div className="stat-label">{t('admin.tickets.statusOpen')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-warning-400">{stats.pending}</div>
            <div className="stat-label">{t('admin.tickets.statusPending')}</div>
          </div>
          <div className="card text-center">
            <div className="stat-value text-success-400">{stats.answered}</div>
            <div className="stat-label">{t('admin.tickets.statusAnswered')}</div>
          </div>
          <div className="card text-center col-span-2 sm:col-span-1">
            <div className="stat-value text-dark-400">{stats.closed}</div>
            <div className="stat-label">{t('admin.tickets.statusClosed')}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-dark-100">{t('admin.tickets.list')}</h2>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="input py-1.5 px-3 w-auto text-sm"
            >
              <option value="">{t('admin.tickets.allStatuses')}</option>
              <option value="open">{t('admin.tickets.statusOpen')}</option>
              <option value="pending">{t('admin.tickets.statusPending')}</option>
              <option value="answered">{t('admin.tickets.statusAnswered')}</option>
              <option value="closed">{t('admin.tickets.statusClosed')}</option>
            </select>
          </div>

          {ticketsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ticketsData?.items.length === 0 ? (
            <div className="text-center py-12 text-dark-500">{t('admin.tickets.noTickets')}</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide">
              {ticketsData?.items.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedTicketId === ticket.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-dark-100 font-medium truncate">
                      #{ticket.id} {ticket.title}
                    </span>
                    <span className={getStatusBadge(ticket.status)}>
                      {t(`admin.tickets.status${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}`)}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500">
                    {formatUser(ticket)} | {new Date(ticket.updated_at).toLocaleDateString()}
                  </div>
                  {ticket.last_message && (
                    <div className="text-xs text-dark-600 mt-1 truncate">
                      {ticket.last_message.is_from_admin ? t('admin.tickets.you') : t('admin.tickets.user')}:{' '}
                      {ticket.last_message.message_text.substring(0, 50)}...
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {ticketsData && ticketsData.pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4 pt-4 border-t border-dark-800/50">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <span className="text-sm text-dark-400">{page} / {ticketsData.pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(ticketsData.pages, p + 1))}
                disabled={page === ticketsData.pages}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2 card">
          {!selectedTicketId ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              </div>
              <div className="text-dark-400">{t('admin.tickets.selectTicket')}</div>
            </div>
          ) : ticketLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedTicket ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="border-b border-dark-800/50 pb-4 mb-4">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-dark-100">
                    #{selectedTicket.id} {selectedTicket.title}
                  </h3>
                  <div className="flex gap-2">
                    <span className={getStatusBadge(selectedTicket.status)}>
                      {t(`admin.tickets.status${selectedTicket.status.charAt(0).toUpperCase() + selectedTicket.status.slice(1)}`)}
                    </span>
                    <span className={getPriorityBadge(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-dark-500 mb-4">
                  {t('admin.tickets.from')}: {formatUser(selectedTicket)} |{' '}
                  {t('admin.tickets.created')}: {new Date(selectedTicket.created_at).toLocaleString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['open', 'pending', 'answered', 'closed'].map((s) => (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate({ ticketId: selectedTicket.id, status: s })}
                      disabled={selectedTicket.status === s || statusMutation.isPending}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        selectedTicket.status === s
                          ? 'bg-accent-500/20 border-accent-500/50 text-accent-400'
                          : 'border-dark-700/50 text-dark-400 hover:border-dark-600 hover:text-dark-200'
                      } disabled:opacity-50`}
                    >
                      {t(`admin.tickets.status${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] mb-4 scrollbar-hide">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl ${
                      msg.is_from_admin
                        ? 'bg-accent-500/10 border border-accent-500/20 ml-4'
                        : 'bg-dark-800/50 border border-dark-700/30 mr-4'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-xs font-medium ${msg.is_from_admin ? 'text-accent-400' : 'text-dark-400'}`}>
                        {msg.is_from_admin ? t('admin.tickets.adminLabel') : t('admin.tickets.userLabel')}
                      </span>
                      <span className="text-xs text-dark-500">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-dark-200 whitespace-pre-wrap">{msg.message_text}</p>
                    <AdminMessageMedia message={msg} t={t} />
                  </div>
                ))}
              </div>

              {/* Reply form */}
              {selectedTicket.status !== 'closed' && (
                <form onSubmit={handleReply} className="border-t border-dark-800/50 pt-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t('admin.tickets.replyPlaceholder')}
                    rows={3}
                    className="input resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replyMutation.isPending}
                      className="btn-primary"
                    >
                      {replyMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('common.loading')}
                        </span>
                      ) : (
                        t('admin.tickets.sendReply')
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && <TicketSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function TicketSettingsModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ticket-settings'],
    queryFn: adminApi.getTicketSettings,
  })

  const [formData, setFormData] = useState({
    sla_enabled: settings?.sla_enabled ?? true,
    sla_minutes: settings?.sla_minutes ?? 5,
    sla_check_interval_seconds: settings?.sla_check_interval_seconds ?? 60,
    sla_reminder_cooldown_minutes: settings?.sla_reminder_cooldown_minutes ?? 15,
    support_system_mode: settings?.support_system_mode ?? 'both',
  })

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        sla_enabled: settings.sla_enabled,
        sla_minutes: settings.sla_minutes,
        sla_check_interval_seconds: settings.sla_check_interval_seconds,
        sla_reminder_cooldown_minutes: settings.sla_reminder_cooldown_minutes,
        support_system_mode: settings.support_system_mode,
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: adminApi.updateTicketSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-settings'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-dark-50">{t('admin.tickets.settings')}</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Support System Mode */}
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                {t('admin.tickets.supportMode')}
              </label>
              <select
                value={formData.support_system_mode}
                onChange={(e) => setFormData({ ...formData, support_system_mode: e.target.value })}
                className="input"
              >
                <option value="both">{t('admin.tickets.modeBoth')}</option>
                <option value="tickets">{t('admin.tickets.modeTickets')}</option>
                <option value="contact">{t('admin.tickets.modeContact')}</option>
              </select>
              <p className="text-xs text-dark-500 mt-1">{t('admin.tickets.supportModeDesc')}</p>
            </div>

            <div className="border-t border-dark-800/50 pt-6">
              <h3 className="text-lg font-semibold text-dark-100 mb-4">{t('admin.tickets.slaSettings')}</h3>

              {/* SLA Enabled */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sla_enabled}
                    onChange={(e) => setFormData({ ...formData, sla_enabled: e.target.checked })}
                    className="w-5 h-5 rounded border-dark-700 bg-dark-800 text-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-dark-100 font-medium">{t('admin.tickets.slaEnabled')}</div>
                    <div className="text-sm text-dark-500">{t('admin.tickets.slaEnabledDesc')}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* SLA Minutes */}
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                {t('admin.tickets.slaMinutes')}
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.sla_minutes}
                onChange={(e) => setFormData({ ...formData, sla_minutes: parseInt(e.target.value) })}
                className="input"
                disabled={!formData.sla_enabled}
              />
              <p className="text-xs text-dark-500 mt-1">{t('admin.tickets.slaMinutesDesc')}</p>
            </div>

            {/* Check Interval */}
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                {t('admin.tickets.checkInterval')}
              </label>
              <input
                type="number"
                min="30"
                max="600"
                value={formData.sla_check_interval_seconds}
                onChange={(e) => setFormData({ ...formData, sla_check_interval_seconds: parseInt(e.target.value) })}
                className="input"
                disabled={!formData.sla_enabled}
              />
              <p className="text-xs text-dark-500 mt-1">{t('admin.tickets.checkIntervalDesc')}</p>
            </div>

            {/* Reminder Cooldown */}
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                {t('admin.tickets.reminderCooldown')}
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={formData.sla_reminder_cooldown_minutes}
                onChange={(e) => setFormData({ ...formData, sla_reminder_cooldown_minutes: parseInt(e.target.value) })}
                className="input"
                disabled={!formData.sla_enabled}
              />
              <p className="text-xs text-dark-500 mt-1">{t('admin.tickets.reminderCooldownDesc')}</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-dark-800/50">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="btn-primary"
              >
                {updateMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('common.saving')}
                  </span>
                ) : (
                  t('common.save')
                )}
              </button>
            </div>

            {updateMutation.isError && (
              <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 text-error-400 text-sm">
                {t('admin.tickets.settingsUpdateError')}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
