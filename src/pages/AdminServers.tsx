import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  serversApi,
  ServerListItem,
  ServerDetail,
  ServerUpdateRequest
} from '../api/servers'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const SyncIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

// Country flags (simple emoji mapping)
const getCountryFlag = (code: string | null): string => {
  if (!code) return ''
  const codeMap: Record<string, string> = {
    'RU': '🇷🇺', 'US': '🇺🇸', 'DE': '🇩🇪', 'NL': '🇳🇱', 'GB': '🇬🇧',
    'FR': '🇫🇷', 'FI': '🇫🇮', 'SE': '🇸🇪', 'PL': '🇵🇱', 'CZ': '🇨🇿',
    'AT': '🇦🇹', 'CH': '🇨🇭', 'UA': '🇺🇦', 'KZ': '🇰🇿', 'JP': '🇯🇵',
    'KR': '🇰🇷', 'SG': '🇸🇬', 'HK': '🇭🇰', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'BR': '🇧🇷', 'IN': '🇮🇳', 'TR': '🇹🇷', 'IL': '🇮🇱', 'AE': '🇦🇪',
  }
  return codeMap[code.toUpperCase()] || code
}

interface ServerModalProps {
  server: ServerDetail
  onSave: (data: ServerUpdateRequest) => void
  onClose: () => void
  isLoading?: boolean
}

function ServerModal({ server, onSave, onClose, isLoading }: ServerModalProps) {
  const { t } = useTranslation()

  const [displayName, setDisplayName] = useState(server.display_name)
  const [description, setDescription] = useState(server.description || '')
  const [countryCode, setCountryCode] = useState(server.country_code || '')
  const [priceKopeks, setPriceKopeks] = useState(server.price_kopeks)
  const [maxUsers, setMaxUsers] = useState<number | null>(server.max_users)
  const [sortOrder, setSortOrder] = useState(server.sort_order)

  const handleSubmit = () => {
    const data: ServerUpdateRequest = {
      display_name: displayName,
      description: description || undefined,
      country_code: countryCode || undefined,
      price_kopeks: priceKopeks,
      max_users: maxUsers || undefined,
      sort_order: sortOrder,
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCountryFlag(server.country_code)}</span>
            <h2 className="text-lg font-semibold text-dark-100">
              {t('admin.servers.edit')}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-700 rounded-lg transition-colors">
            <XIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Name (readonly) */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.originalName')}</label>
            <div className="px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-lg text-dark-400">
              {server.original_name || server.squad_uuid}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              placeholder={t('admin.servers.displayNamePlaceholder')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500 resize-none"
              rows={2}
              placeholder={t('admin.servers.descriptionPlaceholder')}
            />
          </div>

          {/* Country Code */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.countryCode')}</label>
            <input
              type="text"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase().slice(0, 2))}
              className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
              placeholder="RU"
              maxLength={2}
            />
            {countryCode && (
              <span className="ml-2 text-xl">{getCountryFlag(countryCode)}</span>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.price')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={priceKopeks / 100}
                onChange={e => setPriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)}
                className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
                step={1}
              />
              <span className="text-dark-400">₽</span>
            </div>
            <p className="text-xs text-dark-500 mt-1">{t('admin.servers.priceHint')}</p>
          </div>

          {/* Max Users */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.maxUsers')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={maxUsers || ''}
                onChange={e => setMaxUsers(e.target.value ? Math.max(0, parseInt(e.target.value)) : null)}
                className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
                min={0}
                placeholder={t('admin.servers.unlimited')}
              />
              {!maxUsers && (
                <span className="text-sm text-dark-400">{t('admin.servers.unlimited')}</span>
              )}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm text-dark-300 mb-1">{t('admin.servers.sortOrder')}</label>
            <input
              type="number"
              value={sortOrder}
              onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-32 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-accent-500"
            />
          </div>

          {/* Stats */}
          <div className="pt-4 border-t border-dark-700">
            <h4 className="text-sm font-medium text-dark-300 mb-2">{t('admin.servers.stats')}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-dark-700/50 rounded-lg">
                <span className="text-dark-400">{t('admin.servers.currentUsers')}:</span>
                <span className="ml-2 text-dark-200">{server.current_users}</span>
              </div>
              <div className="p-2 bg-dark-700/50 rounded-lg">
                <span className="text-dark-400">{t('admin.servers.activeSubscriptions')}:</span>
                <span className="ml-2 text-dark-200">{server.active_subscriptions}</span>
              </div>
            </div>
            {server.tariffs_using.length > 0 && (
              <div className="mt-2 p-2 bg-dark-700/50 rounded-lg">
                <span className="text-dark-400 text-sm">{t('admin.servers.usedByTariffs')}:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {server.tariffs_using.map(tariff => (
                    <span key={tariff} className="px-2 py-0.5 bg-dark-600 text-dark-300 text-xs rounded">
                      {tariff}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 hover:text-dark-100 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!displayName || isLoading}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminServers() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [editingServer, setEditingServer] = useState<ServerDetail | null>(null)
  const [loadingServerId, setLoadingServerId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Queries
  const { data: serversData, isLoading } = useQuery({
    queryKey: ['admin-servers'],
    queryFn: () => serversApi.getServers(true),
  })

  // Mutations
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ServerUpdateRequest }) =>
      serversApi.updateServer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] })
      setEditingServer(null)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: serversApi.toggleServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] })
    },
  })

  const toggleTrialMutation = useMutation({
    mutationFn: serversApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: serversApi.syncServers,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-servers'] })
      alert(result.message)
    },
  })

  const handleEdit = async (serverId: number) => {
    setLoadingServerId(serverId)
    setLoadError(null)
    try {
      const detail = await serversApi.getServer(serverId)
      setEditingServer(detail)
    } catch (error: unknown) {
      console.error('Failed to load server:', error)
      const errorMessage = error instanceof Error ? error.message : t('admin.servers.loadError')
      setLoadError(errorMessage)
    } finally {
      setLoadingServerId(null)
    }
  }

  const handleSave = (data: ServerUpdateRequest) => {
    if (editingServer) {
      updateMutation.mutate({ id: editingServer.id, data })
    }
  }

  const servers = serversData?.servers || []

  return (
    <div className="animate-fade-in">
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
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.servers.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.servers.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
        >
          <SyncIcon />
          {syncMutation.isPending ? t('admin.servers.syncing') : t('admin.servers.sync')}
        </button>
      </div>

      {/* Servers List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : servers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-dark-400">{t('admin.servers.noServers')}</p>
          <button
            onClick={() => syncMutation.mutate()}
            className="mt-4 text-accent-400 hover:text-accent-300"
          >
            {t('admin.servers.syncNow')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((server: ServerListItem) => (
            <div
              key={server.id}
              className={`p-4 bg-dark-800 rounded-xl border transition-colors ${
                server.is_available ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getCountryFlag(server.country_code)}</span>
                    <h3 className="font-medium text-dark-100 truncate">{server.display_name}</h3>
                    {server.is_trial_eligible && (
                      <span className="px-2 py-0.5 text-xs bg-success-500/20 text-success-400 rounded">
                        {t('admin.servers.trial')}
                      </span>
                    )}
                    {!server.is_available && (
                      <span className="px-2 py-0.5 text-xs bg-dark-600 text-dark-400 rounded">
                        {t('admin.servers.unavailable')}
                      </span>
                    )}
                    {server.is_full && (
                      <span className="px-2 py-0.5 text-xs bg-warning-500/20 text-warning-400 rounded">
                        {t('admin.servers.full')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    <span className="flex items-center gap-1">
                      <UsersIcon />
                      {server.current_users}
                      {server.max_users ? ` / ${server.max_users}` : ''}
                    </span>
                    <span>{server.price_rubles} ₽</span>
                    <span className="text-dark-500 text-xs font-mono truncate max-w-[200px]">{server.squad_uuid}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Available */}
                  <button
                    onClick={() => toggleMutation.mutate(server.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      server.is_available
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={server.is_available ? t('admin.servers.disable') : t('admin.servers.enable')}
                  >
                    {server.is_available ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Toggle Trial */}
                  <button
                    onClick={() => toggleTrialMutation.mutate(server.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      server.is_trial_eligible
                        ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={t('admin.servers.toggleTrial')}
                  >
                    T
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(server.id)}
                    disabled={loadingServerId === server.id}
                    className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors disabled:opacity-50"
                    title={t('admin.servers.edit')}
                  >
                    {loadingServerId === server.id ? (
                      <div className="w-4 h-4 border-2 border-dark-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <EditIcon />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Toast */}
      {loadError && (
        <div className="fixed bottom-4 right-4 bg-error-500/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <span>{loadError}</span>
          <button
            onClick={() => setLoadError(null)}
            className="p-1 hover:bg-white/20 rounded"
          >
            <XIcon />
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingServer && (
        <ServerModal
          server={editingServer}
          onSave={handleSave}
          onClose={() => setEditingServer(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  )
}
