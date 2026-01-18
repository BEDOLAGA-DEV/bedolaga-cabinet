import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  adminBroadcastsApi,
  Broadcast,
  BroadcastFilter,
  TariffFilter,
  BroadcastCreateRequest,
} from '../api/adminBroadcasts'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const BroadcastIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
  </svg>
)

const PhotoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)

const VideoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
)

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    queued: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'В очереди' },
    in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Отправляется' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Завершено' },
    partial: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Частично' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Ошибка' },
    cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Отменено' },
    cancelling: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Отменяется' },
  }
  const config = statusConfig[status] || statusConfig.queued
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

// Filter labels
const FILTER_GROUP_LABELS: Record<string, string> = {
  basic: 'Основные',
  subscription: 'По подписке',
  traffic: 'По трафику',
  registration: 'По регистрации',
  activity: 'По активности',
  source: 'По источнику',
  tariff: 'По тарифу',
}

// Create broadcast modal
interface CreateModalProps {
  onClose: () => void
  onSuccess: () => void
}

function CreateBroadcastModal({ onClose, onSuccess }: CreateModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [target, setTarget] = useState('')
  const [messageText, setMessageText] = useState('')
  const [selectedButtons, setSelectedButtons] = useState<string[]>(['home'])
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'photo' | 'video' | 'document'>('photo')
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Fetch filters
  const { data: filtersData, isLoading: filtersLoading } = useQuery({
    queryKey: ['admin', 'broadcasts', 'filters'],
    queryFn: adminBroadcastsApi.getFilters,
  })

  // Fetch buttons
  const { data: buttonsData } = useQuery({
    queryKey: ['admin', 'broadcasts', 'buttons'],
    queryFn: adminBroadcastsApi.getButtons,
  })

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: adminBroadcastsApi.preview,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: adminBroadcastsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
      onSuccess()
      onClose()
    },
  })

  // Group filters
  const groupedFilters = useMemo(() => {
    if (!filtersData) return {}
    const groups: Record<string, (BroadcastFilter | TariffFilter)[]> = {}

    // Basic filters
    filtersData.filters.forEach(f => {
      const group = f.group || 'basic'
      if (!groups[group]) groups[group] = []
      groups[group].push(f)
    })

    // Tariff filters
    if (filtersData.tariff_filters.length > 0) {
      groups['tariff'] = filtersData.tariff_filters
    }

    // Custom filters
    filtersData.custom_filters.forEach(f => {
      const group = f.group || 'custom'
      if (!groups[group]) groups[group] = []
      groups[group].push(f)
    })

    return groups
  }, [filtersData])

  // Selected filter info
  const selectedFilter = useMemo(() => {
    if (!target || !filtersData) return null
    const all = [
      ...filtersData.filters,
      ...filtersData.tariff_filters,
      ...filtersData.custom_filters,
    ]
    return all.find(f => f.key === target)
  }, [target, filtersData])

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setMediaFile(file)

    // Determine media type
    if (file.type.startsWith('image/')) {
      setMediaType('photo')
      setMediaPreview(URL.createObjectURL(file))
    } else if (file.type.startsWith('video/')) {
      setMediaType('video')
      setMediaPreview(null)
    } else {
      setMediaType('document')
      setMediaPreview(null)
    }

    // Upload file
    setIsUploading(true)
    try {
      const result = await adminBroadcastsApi.uploadMedia(file, mediaType)
      setUploadedFileId(result.file_id)
    } catch (err) {
      console.error('Upload failed:', err)
      setMediaFile(null)
      setMediaPreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  // Remove media
  const handleRemoveMedia = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setUploadedFileId(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Toggle button
  const toggleButton = (key: string) => {
    setSelectedButtons(prev =>
      prev.includes(key) ? prev.filter(b => b !== key) : [...prev, key]
    )
  }

  // Submit
  const handleSubmit = () => {
    if (!target || !messageText.trim()) return

    const data: BroadcastCreateRequest = {
      target,
      message_text: messageText,
      selected_buttons: selectedButtons,
    }

    if (uploadedFileId) {
      data.media = {
        type: mediaType,
        file_id: uploadedFileId,
      }
    }

    createMutation.mutate(data)
  }

  const recipientsCount = previewMutation.data?.count ?? selectedFilter?.count ?? null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-dark-800 rounded-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-500/20 rounded-lg text-accent-400">
              <BroadcastIcon />
            </div>
            <h2 className="text-lg font-semibold text-dark-100">{t('admin.broadcasts.create')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Filter selection */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              {t('admin.broadcasts.selectFilter')}
            </label>
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full p-3 bg-dark-700 rounded-lg text-left flex items-center justify-between hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UsersIcon />
                  <span className={selectedFilter ? 'text-dark-100' : 'text-dark-400'}>
                    {selectedFilter ? selectedFilter.label : t('admin.broadcasts.selectFilterPlaceholder')}
                  </span>
                  {recipientsCount !== null && (
                    <span className="px-2 py-0.5 bg-accent-500/20 text-accent-400 rounded-full text-xs">
                      {recipientsCount} {t('admin.broadcasts.recipients')}
                    </span>
                  )}
                </div>
                <ChevronDownIcon />
              </button>

              {showFilters && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-700 rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                  {filtersLoading ? (
                    <div className="p-4 text-center text-dark-400">Loading...</div>
                  ) : (
                    Object.entries(groupedFilters).map(([group, filters]) => (
                      <div key={group}>
                        <div className="px-3 py-2 text-xs font-medium text-dark-400 bg-dark-800 sticky top-0">
                          {FILTER_GROUP_LABELS[group] || group}
                        </div>
                        {filters.map(filter => (
                          <button
                            key={filter.key}
                            onClick={() => {
                              setTarget(filter.key)
                              setShowFilters(false)
                              previewMutation.mutate(filter.key)
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-dark-600 transition-colors flex items-center justify-between ${
                              target === filter.key ? 'bg-accent-500/20' : ''
                            }`}
                          >
                            <span className="text-dark-100">{filter.label}</span>
                            {filter.count !== null && filter.count !== undefined && (
                              <span className="text-xs text-dark-400">{filter.count}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Message text */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              {t('admin.broadcasts.messageText')}
            </label>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              placeholder={t('admin.broadcasts.messageTextPlaceholder')}
              rows={5}
              maxLength={4000}
              className="w-full p-3 bg-dark-700 rounded-lg text-dark-100 placeholder-dark-400 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            <div className="text-xs text-dark-400 mt-1 text-right">
              {messageText.length}/4000
            </div>
          </div>

          {/* Media upload */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              {t('admin.broadcasts.media')}
            </label>
            {mediaFile ? (
              <div className="p-3 bg-dark-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {mediaType === 'photo' && <PhotoIcon />}
                    {mediaType === 'video' && <VideoIcon />}
                    {mediaType === 'document' && <DocumentIcon />}
                    <div>
                      <p className="text-sm text-dark-100">{mediaFile.name}</p>
                      <p className="text-xs text-dark-400">
                        {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveMedia}
                    className="p-2 hover:bg-dark-600 rounded-lg text-dark-400 hover:text-red-400"
                    disabled={isUploading}
                  >
                    <XIcon />
                  </button>
                </div>
                {mediaPreview && (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="mt-3 max-h-40 rounded-lg object-cover"
                  />
                )}
                {isUploading && (
                  <div className="mt-2 text-sm text-accent-400">{t('admin.broadcasts.uploading')}</div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,application/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 p-3 bg-dark-700 rounded-lg text-dark-400 hover:bg-dark-600 hover:text-dark-100 transition-colors flex items-center justify-center gap-2"
                >
                  <PhotoIcon />
                  <span>{t('admin.broadcasts.addMedia')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Buttons selection */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              {t('admin.broadcasts.buttons')}
            </label>
            <div className="flex flex-wrap gap-2">
              {buttonsData?.buttons.map(button => (
                <button
                  key={button.key}
                  onClick={() => toggleButton(button.key)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedButtons.includes(button.key)
                      ? 'bg-accent-500 text-white'
                      : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-dark-700">
          <div className="text-sm text-dark-400">
            {recipientsCount !== null && (
              <span>
                {t('admin.broadcasts.willBeSent')}: <strong className="text-accent-400">{recipientsCount}</strong> {t('admin.broadcasts.users')}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-dark-700 rounded-lg text-dark-300 hover:bg-dark-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!target || !messageText.trim() || createMutation.isPending || isUploading}
              className="px-4 py-2 bg-accent-500 rounded-lg text-white hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <RefreshIcon />
              ) : (
                <BroadcastIcon />
              )}
              {t('admin.broadcasts.send')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Broadcast detail modal
interface DetailModalProps {
  broadcast: Broadcast
  onClose: () => void
  onStop: () => void
  isStopping: boolean
}

function BroadcastDetailModal({ broadcast, onClose, onStop, isStopping }: DetailModalProps) {
  const { t } = useTranslation()
  const isRunning = ['queued', 'in_progress', 'cancelling'].includes(broadcast.status)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <StatusBadge status={broadcast.status} />
            <span className="text-dark-400">#{broadcast.id}</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Progress */}
          {isRunning && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-dark-400">{t('admin.broadcasts.progress')}</span>
                <span className="text-dark-100">{broadcast.progress_percent.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 transition-all duration-300"
                  style={{ width: `${broadcast.progress_percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-2xl font-bold text-dark-100">{broadcast.total_count}</p>
              <p className="text-xs text-dark-400">{t('admin.broadcasts.total')}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-400">{broadcast.sent_count}</p>
              <p className="text-xs text-dark-400">{t('admin.broadcasts.sent')}</p>
            </div>
            <div className="p-3 bg-dark-700 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-400">{broadcast.failed_count}</p>
              <p className="text-xs text-dark-400">{t('admin.broadcasts.failed')}</p>
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-sm text-dark-400 mb-1">{t('admin.broadcasts.filter')}</p>
            <p className="text-dark-100">{broadcast.target_type}</p>
          </div>

          {/* Message */}
          <div>
            <p className="text-sm text-dark-400 mb-1">{t('admin.broadcasts.message')}</p>
            <div className="p-3 bg-dark-700 rounded-lg text-dark-100 whitespace-pre-wrap text-sm max-h-40 overflow-y-auto">
              {broadcast.message_text}
            </div>
          </div>

          {/* Media */}
          {broadcast.has_media && (
            <div>
              <p className="text-sm text-dark-400 mb-1">{t('admin.broadcasts.media')}</p>
              <div className="flex items-center gap-2 text-dark-100">
                {broadcast.media_type === 'photo' && <PhotoIcon />}
                {broadcast.media_type === 'video' && <VideoIcon />}
                {broadcast.media_type === 'document' && <DocumentIcon />}
                <span className="capitalize">{broadcast.media_type}</span>
              </div>
            </div>
          )}

          {/* Admin & Time */}
          <div className="flex justify-between text-sm text-dark-400">
            <span>{broadcast.admin_name || t('admin.broadcasts.unknownAdmin')}</span>
            <span>{new Date(broadcast.created_at).toLocaleString()}</span>
          </div>
        </div>

        {/* Footer */}
        {isRunning && broadcast.status !== 'cancelling' && (
          <div className="p-4 border-t border-dark-700">
            <button
              onClick={onStop}
              disabled={isStopping}
              className="w-full py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <StopIcon />
              {t('admin.broadcasts.stop')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component
export default function AdminBroadcasts() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null)
  const [page, setPage] = useState(0)
  const limit = 20

  // Fetch broadcasts
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'broadcasts', 'list', page],
    queryFn: () => adminBroadcastsApi.list(limit, page * limit),
    refetchInterval: 5000, // Auto refresh every 5s
  })

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: adminBroadcastsApi.stop,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'broadcasts'] })
      setSelectedBroadcast(null)
    },
  })

  const broadcasts = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-dark-900 p-4 pb-20 md:pb-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
            >
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-dark-100">{t('admin.broadcasts.title')}</h1>
              <p className="text-sm text-dark-400">{t('admin.broadcasts.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 bg-dark-800 rounded-lg text-dark-400 hover:text-dark-100 transition-colors"
            >
              <RefreshIcon />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-accent-500 rounded-lg text-white hover:bg-accent-600 transition-colors flex items-center gap-2"
            >
              <PlusIcon />
              <span className="hidden sm:inline">{t('admin.broadcasts.create')}</span>
            </button>
          </div>
        </div>

        {/* Broadcasts list */}
        <div className="bg-dark-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-dark-400">
              <RefreshIcon />
              <p className="mt-2">{t('common.loading')}</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="p-8 text-center text-dark-400">
              <BroadcastIcon />
              <p className="mt-2">{t('admin.broadcasts.empty')}</p>
            </div>
          ) : (
            <div className="divide-y divide-dark-700">
              {broadcasts.map(broadcast => (
                <button
                  key={broadcast.id}
                  onClick={() => setSelectedBroadcast(broadcast)}
                  className="w-full p-4 hover:bg-dark-700/50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={broadcast.status} />
                        <span className="text-xs text-dark-400">#{broadcast.id}</span>
                        {broadcast.has_media && (
                          <span className="text-dark-400">
                            {broadcast.media_type === 'photo' && <PhotoIcon />}
                            {broadcast.media_type === 'video' && <VideoIcon />}
                            {broadcast.media_type === 'document' && <DocumentIcon />}
                          </span>
                        )}
                      </div>
                      <p className="text-dark-100 text-sm truncate">
                        {broadcast.message_text}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-dark-400">
                        <span>{broadcast.target_type}</span>
                        <span>
                          {broadcast.sent_count}/{broadcast.total_count}
                        </span>
                        <span>{new Date(broadcast.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {['queued', 'in_progress'].includes(broadcast.status) && (
                      <div className="w-16">
                        <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent-500"
                            style={{ width: `${broadcast.progress_percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-dark-400 text-center mt-1">
                          {broadcast.progress_percent.toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-dark-700">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 bg-dark-700 rounded-lg text-dark-300 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.prev')}
              </button>
              <span className="text-dark-400">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 bg-dark-700 rounded-lg text-dark-300 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateBroadcastModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            refetch()
          }}
        />
      )}

      {selectedBroadcast && (
        <BroadcastDetailModal
          broadcast={selectedBroadcast}
          onClose={() => setSelectedBroadcast(null)}
          onStop={() => stopMutation.mutate(selectedBroadcast.id)}
          isStopping={stopMutation.isPending}
        />
      )}
    </div>
  )
}
