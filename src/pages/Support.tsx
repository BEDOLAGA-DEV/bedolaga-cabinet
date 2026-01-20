import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ticketsApi } from '../api/tickets'
import { infoApi } from '../api/info'
import { logger } from '../utils/logger'
import { checkRateLimit, getRateLimitResetTime, RATE_LIMIT_KEYS } from '../utils/rateLimit'
import type { TicketDetail, TicketMessage } from '../types'

const log = logger.createLogger('Support')

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
)

const ImageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// Media attachment state
interface MediaAttachment {
  file: File
  preview: string
  uploading: boolean
  fileId?: string
  error?: string
}

// Message media display component
function MessageMedia({ message, t }: { message: TicketMessage; t: (key: string) => string }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showFullImage, setShowFullImage] = useState(false)

  if (!message.has_media || !message.media_file_id) {
    return null
  }

  const mediaUrl = ticketsApi.getMediaUrl(message.media_file_id)

  if (message.media_type === 'photo') {
    return (
      <>
        <div className="mt-3 relative">
          {!imageLoaded && !imageError && (
            <div className="w-full h-48 bg-dark-700 rounded-lg animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {imageError ? (
            <div className="w-full h-32 bg-dark-700 rounded-lg flex items-center justify-center text-dark-400 text-sm">
              {t('support.imageLoadFailed')}
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt={message.media_caption || 'Attached image'}
              className={`max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${imageLoaded ? '' : 'hidden'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              onClick={() => setShowFullImage(true)}
            />
          )}
          {message.media_caption && (
            <p className="text-xs text-dark-400 mt-1">{message.media_caption}</p>
          )}
        </div>

        {/* Full image modal */}
        {showFullImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              onClick={() => setShowFullImage(false)}
            >
              <CloseIcon />
            </button>
            <img
              src={mediaUrl}
              alt={message.media_caption || 'Attached image'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </>
    )
  }

  // For documents/videos - show download link
  return (
    <div className="mt-3">
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-dark-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        {message.media_caption || `Download ${message.media_type}`}
      </a>
    </div>
  )
}

export default function Support() {
  log.debug('Component loaded')

  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [rateLimitError, setRateLimitError] = useState<string | null>(null)

  // Media attachment states
  const [createAttachment, setCreateAttachment] = useState<MediaAttachment | null>(null)
  const [replyAttachment, setReplyAttachment] = useState<MediaAttachment | null>(null)
  const createFileInputRef = useRef<HTMLInputElement>(null)
  const replyFileInputRef = useRef<HTMLInputElement>(null)

  // Get support configuration
  const { data: supportConfig, isLoading: configLoading } = useQuery({
    queryKey: ['support-config'],
    queryFn: infoApi.getSupportConfig,
  })

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => ticketsApi.getTickets({ per_page: 20 }),
    enabled: supportConfig?.tickets_enabled === true,
  })

  const { data: ticketDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['ticket', selectedTicket?.id],
    queryFn: () => ticketsApi.getTicket(selectedTicket!.id),
    enabled: !!selectedTicket,
  })

  // Handle file selection
  const handleFileSelect = async (
    file: File,
    setAttachment: (a: MediaAttachment | null) => void
  ) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setAttachment({
        file,
        preview: '',
        uploading: false,
        error: t('support.invalidFileType') || 'Invalid file type. Use JPEG, PNG, GIF, or WebP.',
      })
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setAttachment({
        file,
        preview: '',
        uploading: false,
        error: t('support.fileTooLarge') || 'File is too large. Maximum size is 10MB.',
      })
      return
    }

    // Create preview
    const preview = URL.createObjectURL(file)
    setAttachment({ file, preview, uploading: true })

    try {
      const result = await ticketsApi.uploadMedia(file, 'photo')
      setAttachment({
        file,
        preview,
        uploading: false,
        fileId: result.file_id,
      })
    } catch (error) {
      setAttachment({
        file,
        preview,
        uploading: false,
        error: t('support.uploadFailed') || 'Failed to upload image',
      })
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const media = createAttachment?.fileId
        ? {
            media_type: 'photo',
            media_file_id: createAttachment.fileId,
          }
        : undefined
      return ticketsApi.createTicket(newTitle, newMessage, media)
    },
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setShowCreateForm(false)
      setNewTitle('')
      setNewMessage('')
      setCreateAttachment(null)
      setSelectedTicket(ticket)
    },
  })

  const replyMutation = useMutation({
    mutationFn: async () => {
      const media = replyAttachment?.fileId
        ? {
            media_type: 'photo',
            media_file_id: replyAttachment.fileId,
          }
        : undefined
      return ticketsApi.addMessage(selectedTicket!.id, replyMessage, media)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', selectedTicket?.id] })
      setReplyMessage('')
      setReplyAttachment(null)
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return 'badge-info'
      case 'answered':
        return 'badge-success'
      case 'pending':
        return 'badge-warning'
      case 'closed':
        return 'badge-neutral'
      default:
        return 'badge-neutral'
    }
  }

  const getStatusLabel = (status: string) => {
    return t(`support.status.${status}`) || status
  }

  // Show loading while checking configuration
  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // If tickets are disabled, show redirect message
  if (supportConfig && !supportConfig.tickets_enabled) {
    log.debug('Tickets disabled, config:', supportConfig)

    const getSupportMessage = () => {
      log.debug('Getting support message for type:', supportConfig.support_type)

      if (supportConfig.support_type === 'profile') {
        const supportUsername = supportConfig.support_username || '@support'
        log.debug('Opening profile:', supportUsername)
        return {
          title: t('support.ticketsDisabled'),
          message: t('support.contactSupport', { username: supportUsername }),
          buttonText: t('support.contactUs'),
          buttonAction: () => {
            log.debug('Button clicked, opening:', supportUsername)
            const webApp = window.Telegram?.WebApp

            // Extract username without @
            const username = supportUsername.startsWith('@')
              ? supportUsername.slice(1)
              : supportUsername

            const webUrl = `https://t.me/${username}`
            log.debug('Web URL:', webUrl, 'WebApp methods:', {
              openTelegramLink: !!webApp?.openTelegramLink,
              openLink: !!webApp?.openLink,
            })

            // Try openTelegramLink first (for tg:// links)
            if (webApp?.openTelegramLink) {
              log.debug('Using openTelegramLink with web URL')
              try {
                webApp.openTelegramLink(webUrl)
                return
              } catch (e) {
                log.error('openTelegramLink failed:', e)
              }
            }

            // Fallback to openLink
            if (webApp?.openLink) {
              log.debug('Using openLink')
              try {
                webApp.openLink(webUrl, { try_browser: true })
                return
              } catch (e) {
                log.error('openLink failed:', e)
              }
            }

            // Last resort - window.open
            log.debug('Using window.open')
            window.open(webUrl, '_blank')
          },
        }
      }

      if (supportConfig.support_type === 'url' && supportConfig.support_url) {
        return {
          title: t('support.ticketsDisabled'),
          message: t('support.useExternalLink'),
          buttonText: t('support.openSupport'),
          buttonAction: () => {
            const webApp = window.Telegram?.WebApp
            if (webApp?.openLink) {
              webApp.openLink(supportConfig.support_url!, { try_browser: true })
            } else {
              window.open(supportConfig.support_url!, '_blank')
            }
          },
        }
      }

      // Fallback: contact support (should not normally happen if config is correct)
      const supportUsername = supportConfig.support_username || '@support'
      log.debug('Fallback: Opening profile:', supportUsername)
      return {
        title: t('support.ticketsDisabled'),
        message: t('support.contactSupport', { username: supportUsername }),
        buttonText: t('support.contactUs'),
        buttonAction: () => {
          log.debug('Fallback button clicked, opening:', supportUsername)
          const webApp = window.Telegram?.WebApp

          // Extract username without @
          const username = supportUsername.startsWith('@')
            ? supportUsername.slice(1)
            : supportUsername

          const webUrl = `https://t.me/${username}`
          log.debug('Fallback opening URL:', webUrl)

          if (webApp?.openTelegramLink) {
            log.debug('Fallback using openTelegramLink')
            webApp.openTelegramLink(webUrl)
          } else if (webApp?.openLink) {
            log.debug('Fallback using openLink')
            webApp.openLink(webUrl, { try_browser: true })
          } else {
            log.debug('Fallback using window.open')
            window.open(webUrl, '_blank')
          }
        },
      }
    }

    const supportMessage = getSupportMessage()

    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bento-card text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-dark-100 mb-2">{supportMessage.title}</h2>
          <p className="text-dark-400 mb-6">{supportMessage.message}</p>
          <button onClick={supportMessage.buttonAction} className="btn-primary w-full">
            {supportMessage.buttonText}
          </button>
        </div>
      </div>
    )
  }

  // Attachment preview component
  const AttachmentPreview = ({
    attachment,
    onRemove,
  }: {
    attachment: MediaAttachment
    onRemove: () => void
  }) => (
    <div className="relative inline-block mt-2">
      {attachment.preview && (
        <img
          src={attachment.preview}
          alt="Attachment preview"
          className="h-20 w-auto rounded-lg border border-dark-700"
        />
      )}
      {attachment.uploading && (
        <div className="absolute inset-0 bg-dark-900/70 rounded-lg flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {attachment.error && (
        <div className="text-xs text-red-400 mt-1">{attachment.error}</div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
      >
        <CloseIcon />
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-50">{t('support.title')}</h1>
        <button
          onClick={() => {
            setShowCreateForm(true)
            setSelectedTicket(null)
            setCreateAttachment(null)
          }}
          className="btn-primary"
        >
          <PlusIcon />
          {t('support.newTicket')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1 bento-card">
          <h2 className="text-lg font-semibold text-dark-100 mb-4">{t('support.yourTickets')}</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tickets?.items && tickets.items.length > 0 ? (
            <div className="space-y-2">
              {tickets.items.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket as unknown as TicketDetail)
                    setShowCreateForm(false)
                    setReplyAttachment(null)
                  }}
                  className={`w-full text-left p-4 rounded-bento border transition-all ${
                    selectedTicket?.id === ticket.id
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-dark-700/50 hover:border-dark-600 bg-dark-800/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="text-dark-100 font-medium truncate">{ticket.title}</div>
                    <span className={`${getStatusBadge(ticket.status)} flex-shrink-0`}>
                      {getStatusLabel(ticket.status)}
                    </span>
                  </div>
                  <div className="text-xs text-dark-500">
                    {new Date(ticket.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div className="text-dark-400">{t('support.noTickets')}</div>
            </div>
          )}
        </div>

        {/* Ticket Detail / Create Form */}
        <div className="lg:col-span-2 bento-card">
          {showCreateForm ? (
            <div>
              <h2 className="text-lg font-semibold text-dark-100 mb-6">{t('support.createTicket')}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  setRateLimitError(null)
                  // Rate limit: max 3 tickets per 60 seconds
                  if (!checkRateLimit(RATE_LIMIT_KEYS.TICKET_CREATE, 3, 60000)) {
                    const resetTime = getRateLimitResetTime(RATE_LIMIT_KEYS.TICKET_CREATE)
                    setRateLimitError(t('support.tooManyRequests', { seconds: resetTime }) || `Слишком много запросов. Подождите ${resetTime} сек.`)
                    return
                  }
                  createMutation.mutate()
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label">{t('support.subject')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('support.subjectPlaceholder')}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    minLength={3}
                    maxLength={255}
                  />
                </div>
                <div>
                  <label className="label">{t('support.message')}</label>
                  <textarea
                    className="input min-h-[150px]"
                    placeholder={t('support.messagePlaceholder')}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                    minLength={10}
                    maxLength={4000}
                  />
                </div>

                {/* Image attachment for create */}
                <div>
                  <input
                    ref={createFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file, setCreateAttachment)
                      e.target.value = ''
                    }}
                  />
                  {createAttachment ? (
                    <AttachmentPreview
                      attachment={createAttachment}
                      onRemove={() => setCreateAttachment(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition-colors"
                    >
                      <ImageIcon />
                      {t('support.attachImage')}
                    </button>
                  )}
                </div>

                {rateLimitError && (
                  <div className="bg-error-500/10 border border-error-500/30 text-error-400 p-3 rounded-xl text-sm">
                    {rateLimitError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || (createAttachment?.uploading)}
                    className="btn-primary"
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {t('support.creating')}
                      </span>
                    ) : (
                      <>
                        <SendIcon />
                        {t('support.send')}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setCreateAttachment(null)
                    }}
                    className="btn-secondary"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </form>
            </div>
          ) : selectedTicket ? (
            <div className="flex flex-col h-full">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-6 pb-4 border-b border-dark-800/50">
                <div>
                  <h2 className="text-lg font-semibold text-dark-100">
                    {ticketDetail?.title || selectedTicket.title}
                  </h2>
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    <span className={getStatusBadge(ticketDetail?.status || selectedTicket.status)}>
                      {getStatusLabel(ticketDetail?.status || selectedTicket.status)}
                    </span>
                    <span className="text-xs text-dark-500">
                      {t('support.created')} {new Date(selectedTicket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ticketDetail?.messages ? (
                <div className="flex-1 space-y-4 mb-6 max-h-96 overflow-y-auto scrollbar-hide">
                  {ticketDetail.messages.map((msg) => (
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
                          {msg.is_from_admin ? t('support.supportTeam') : t('support.you')}
                        </span>
                        <span className="text-xs text-dark-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-dark-200 whitespace-pre-wrap">
                        {msg.message_text}
                      </div>
                      {/* Display media if present */}
                      <MessageMedia message={msg} t={t} />
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Reply Form */}
              {ticketDetail?.status !== 'closed' && !ticketDetail?.is_reply_blocked && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    setRateLimitError(null)
                    // Rate limit: max 5 replies per 30 seconds
                    if (!checkRateLimit(RATE_LIMIT_KEYS.TICKET_REPLY, 5, 30000)) {
                      const resetTime = getRateLimitResetTime(RATE_LIMIT_KEYS.TICKET_REPLY)
                      setRateLimitError(t('support.tooManyRequests', { seconds: resetTime }) || `Слишком много запросов. Подождите ${resetTime} сек.`)
                      return
                    }
                    replyMutation.mutate()
                  }}
                  className="pt-4 border-t border-dark-800/50"
                >
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <textarea
                        className="input flex-1 min-h-[80px]"
                        placeholder={t('support.replyPlaceholder')}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        required
                        minLength={1}
                        maxLength={4000}
                      />
                    </div>

                    {/* Image attachment for reply */}
                    <div className="flex items-center justify-between">
                      <div>
                        <input
                          ref={replyFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(file, setReplyAttachment)
                            e.target.value = ''
                          }}
                        />
                        {replyAttachment ? (
                          <AttachmentPreview
                            attachment={replyAttachment}
                            onRemove={() => setReplyAttachment(null)}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            className="flex items-center gap-2 text-sm text-dark-400 hover:text-dark-200 transition-colors"
                          >
                            <ImageIcon />
                            {t('support.attachImage')}
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={replyMutation.isPending || !replyMessage.trim() || replyAttachment?.uploading}
                        className="btn-primary"
                      >
                        {replyMutation.isPending ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <SendIcon />
                        )}
                      </button>
                    </div>
                    {rateLimitError && (
                      <div className="mt-2 bg-error-500/10 border border-error-500/30 text-error-400 p-2 rounded-lg text-sm">
                        {rateLimitError}
                      </div>
                    )}
                  </div>
                </form>
              )}

              {ticketDetail?.is_reply_blocked && (
                <div className="text-center py-4 text-sm text-dark-500 border-t border-dark-800/50">
                  {t('support.repliesDisabled')}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 mb-4 rounded-2xl bg-dark-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <div className="text-dark-400">{t('support.selectTicket')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
