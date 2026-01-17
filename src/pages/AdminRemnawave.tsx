import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  adminRemnawaveApi,
  NodeInfo,
  SquadWithLocalInfo,
  SystemStatsResponse,
  AutoSyncStatus,
} from '../api/adminRemnawave'

// ============ Icons ============

const ServerIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

const ChartIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const GlobeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
  </svg>
)

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const SyncIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const RefreshIcon = ({ className = "w-4 h-4", spinning = false }: { className?: string; spinning?: boolean }) => (
  <svg className={`${className} ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const PlayIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
  </svg>
)

const StopIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
  </svg>
)

const ArrowPathIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const ChevronLeftIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

// ============ Helpers ============

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const getCountryFlag = (code: string | null | undefined): string => {
  if (!code) return '🌍'
  const codeMap: Record<string, string> = {
    'RU': '🇷🇺', 'US': '🇺🇸', 'DE': '🇩🇪', 'NL': '🇳🇱', 'GB': '🇬🇧', 'UK': '🇬🇧',
    'FR': '🇫🇷', 'FI': '🇫🇮', 'SE': '🇸🇪', 'NO': '🇳🇴', 'PL': '🇵🇱', 'TR': '🇹🇷',
    'JP': '🇯🇵', 'SG': '🇸🇬', 'HK': '🇭🇰', 'KR': '🇰🇷', 'AU': '🇦🇺', 'CA': '🇨🇦',
    'CH': '🇨🇭', 'AT': '🇦🇹', 'IT': '🇮🇹', 'ES': '🇪🇸', 'BR': '🇧🇷', 'IN': '🇮🇳',
    'AE': '🇦🇪', 'IL': '🇮🇱', 'KZ': '🇰🇿', 'UA': '🇺🇦', 'CZ': '🇨🇿', 'RO': '🇷🇴',
    'LV': '🇱🇻', 'LT': '🇱🇹', 'EE': '🇪🇪', 'BG': '🇧🇬', 'HU': '🇭🇺', 'MD': '🇲🇩',
  }
  return codeMap[code.toUpperCase()] || code
}

// ============ Sub-Components ============

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  subValue?: string
}

function StatCard({ label, value, icon, color = 'accent', subValue }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    accent: 'bg-accent-500/20 text-accent-400',
    green: 'bg-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/20 text-blue-400',
    orange: 'bg-orange-500/20 text-orange-400',
    red: 'bg-red-500/20 text-red-400',
    purple: 'bg-purple-500/20 text-purple-400',
  }

  return (
    <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-dark-400 truncate">{label}</p>
          <p className="text-lg font-semibold text-dark-100">{value}</p>
          {subValue && <p className="text-xs text-dark-500">{subValue}</p>}
        </div>
      </div>
    </div>
  )
}

interface NodeCardProps {
  node: NodeInfo
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void
  isLoading?: boolean
}

function NodeCard({ node, onAction, isLoading }: NodeCardProps) {
  const { t } = useTranslation()

  const statusColor = node.is_disabled
    ? 'text-dark-500'
    : node.is_connected && node.is_node_online
      ? 'text-emerald-400'
      : 'text-red-400'

  const statusText = node.is_disabled
    ? t('admin.remnawave.nodes.disabled', 'Disabled')
    : node.is_connected && node.is_node_online
      ? t('admin.remnawave.nodes.online', 'Online')
      : t('admin.remnawave.nodes.offline', 'Offline')

  return (
    <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(node.country_code)}</span>
            <h3 className="font-medium text-dark-100 truncate">{node.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor} bg-current/10`}>
              {statusText}
            </span>
          </div>
          <p className="text-xs text-dark-500 mt-1 truncate">{node.address}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3.5 h-3.5" />
              {node.users_online ?? 0} online
            </span>
            {node.traffic_used_bytes !== undefined && (
              <span>{formatBytes(node.traffic_used_bytes)} used</span>
            )}
            {node.xray_uptime && (
              <span>Uptime: {node.xray_uptime}</span>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => onAction(node.uuid, 'restart')}
            disabled={isLoading || node.is_disabled}
            className="p-2 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 hover:text-dark-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('admin.remnawave.nodes.restart', 'Restart')}
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAction(node.uuid, node.is_disabled ? 'enable' : 'disable')}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
              node.is_disabled
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            }`}
            title={node.is_disabled ? t('admin.remnawave.nodes.enable', 'Enable') : t('admin.remnawave.nodes.disable', 'Disable')}
          >
            {node.is_disabled ? <PlayIcon className="w-4 h-4" /> : <StopIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

interface SquadCardProps {
  squad: SquadWithLocalInfo
  onSelect: (squad: SquadWithLocalInfo) => void
}

function SquadCard({ squad, onSelect }: SquadCardProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={() => onSelect(squad)}
      className="p-4 bg-dark-800/50 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(squad.country_code)}</span>
            <h3 className="font-medium text-dark-100 truncate">
              {squad.display_name || squad.name}
            </h3>
            {squad.is_synced ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                {t('admin.remnawave.squads.synced', 'Synced')}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                {t('admin.remnawave.squads.notSynced', 'Not synced')}
              </span>
            )}
          </div>
          <p className="text-xs text-dark-500 mt-1 truncate">{squad.name}</p>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="w-3.5 h-3.5" />
              {squad.members_count} members
            </span>
            {squad.current_users !== undefined && (
              <span>{squad.current_users} / {squad.max_users ?? '∞'}</span>
            )}
            <span>{squad.inbounds_count} inbounds</span>
            {squad.is_available !== undefined && (
              <span className={squad.is_available ? 'text-emerald-400' : 'text-red-400'}>
                {squad.is_available ? '✓ Available' : '✗ Unavailable'}
              </span>
            )}
          </div>
        </div>

        <svg className="w-5 h-5 text-dark-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  )
}

interface SyncCardProps {
  title: string
  description: string
  onAction: () => void
  isLoading?: boolean
  lastResult?: { success: boolean; message?: string } | null
}

function SyncCard({ title, description, onAction, isLoading, lastResult }: SyncCardProps) {
  return (
    <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-dark-100">{title}</h3>
          <p className="text-xs text-dark-400 mt-1">{description}</p>
          {lastResult && (
            <p className={`text-xs mt-2 ${lastResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
              {lastResult.message}
            </p>
          )}
        </div>
        <button
          onClick={onAction}
          disabled={isLoading}
          className="px-3 py-1.5 bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <RefreshIcon spinning={isLoading} />
          {isLoading ? 'Running...' : 'Run'}
        </button>
      </div>
    </div>
  )
}

// ============ Tab Components ============

interface OverviewTabProps {
  stats: SystemStatsResponse | undefined
  isLoading: boolean
  onRefresh: () => void
}

function OverviewTab({ stats, isLoading, onRefresh }: OverviewTabProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-400">{t('admin.remnawave.noData', 'Failed to load data')}</p>
        <button onClick={onRefresh} className="mt-4 btn-primary">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    )
  }

  const memoryUsedPercent = stats.server_info.memory_total > 0
    ? Math.round((stats.server_info.memory_used / stats.server_info.memory_total) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
          <ChartIcon className="w-4 h-4" />
          {t('admin.remnawave.overview.system', 'System')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={t('admin.remnawave.overview.usersOnline', 'Users Online')}
            value={stats.system.users_online}
            icon={<UsersIcon />}
            color="green"
          />
          <StatCard
            label={t('admin.remnawave.overview.totalUsers', 'Total Users')}
            value={stats.system.total_users}
            icon={<UsersIcon />}
            color="blue"
          />
          <StatCard
            label={t('admin.remnawave.overview.nodesOnline', 'Nodes Online')}
            value={stats.system.nodes_online}
            icon={<GlobeIcon />}
            color="purple"
          />
          <StatCard
            label={t('admin.remnawave.overview.connections', 'Connections')}
            value={stats.system.active_connections}
            icon={<ServerIcon className="w-5 h-5" />}
            color="orange"
          />
        </div>
      </div>

      {/* Bandwidth */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.overview.bandwidth', 'Realtime Bandwidth')}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label={t('admin.remnawave.overview.download', 'Download')}
            value={formatBytes(stats.bandwidth.realtime_download) + '/s'}
            icon={<span className="text-lg">↓</span>}
            color="green"
          />
          <StatCard
            label={t('admin.remnawave.overview.upload', 'Upload')}
            value={formatBytes(stats.bandwidth.realtime_upload) + '/s'}
            icon={<span className="text-lg">↑</span>}
            color="blue"
          />
          <StatCard
            label={t('admin.remnawave.overview.total', 'Total')}
            value={formatBytes(stats.bandwidth.realtime_total) + '/s'}
            icon={<span className="text-lg">⇅</span>}
            color="purple"
          />
        </div>
      </div>

      {/* Server Info */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.overview.server', 'Server')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            label={t('admin.remnawave.overview.cpu', 'CPU Cores')}
            value={`${stats.server_info.cpu_cores} (${stats.server_info.cpu_physical_cores} physical)`}
            icon={<span className="text-lg">⚡</span>}
            color="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.memory', 'Memory')}
            value={`${memoryUsedPercent}%`}
            subValue={`${formatBytes(stats.server_info.memory_used)} / ${formatBytes(stats.server_info.memory_total)}`}
            icon={<span className="text-lg">💾</span>}
            color={memoryUsedPercent > 80 ? 'red' : memoryUsedPercent > 60 ? 'orange' : 'green'}
          />
          <StatCard
            label={t('admin.remnawave.overview.uptime', 'Uptime')}
            value={formatUptime(stats.server_info.uptime_seconds)}
            icon={<span className="text-lg">⏱️</span>}
            color="blue"
          />
        </div>
      </div>

      {/* Traffic Periods */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.overview.traffic', 'Traffic Statistics')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="2 days"
            value={formatBytes(stats.traffic_periods.last_2_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="accent"
          />
          <StatCard
            label="7 days"
            value={formatBytes(stats.traffic_periods.last_7_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="blue"
          />
          <StatCard
            label="30 days"
            value={formatBytes(stats.traffic_periods.last_30_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="green"
          />
          <StatCard
            label="Month"
            value={formatBytes(stats.traffic_periods.current_month.current)}
            icon={<span className="text-xs">📊</span>}
            color="purple"
          />
          <StatCard
            label="Year"
            value={formatBytes(stats.traffic_periods.current_year.current)}
            icon={<span className="text-xs">📊</span>}
            color="orange"
          />
        </div>
      </div>

      {/* Users by Status */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.overview.usersByStatus', 'Users by Status')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(stats.users_by_status).map(([status, count]) => (
            <StatCard
              key={status}
              label={status}
              value={count}
              icon={<UsersIcon className="w-4 h-4" />}
              color={status === 'ACTIVE' ? 'green' : status === 'DISABLED' ? 'red' : 'accent'}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface NodesTabProps {
  nodes: NodeInfo[]
  isLoading: boolean
  onRefresh: () => void
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void
  onRestartAll: () => void
  isActionLoading: boolean
}

function NodesTab({ nodes, isLoading, onRefresh, onAction, onRestartAll, isActionLoading }: NodesTabProps) {
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const total = nodes.length
    const online = nodes.filter(n => n.is_connected && n.is_node_online && !n.is_disabled).length
    const offline = nodes.filter(n => (!n.is_connected || !n.is_node_online) && !n.is_disabled).length
    const disabled = nodes.filter(n => n.is_disabled).length
    const totalUsers = nodes.reduce((acc, n) => acc + (n.users_online ?? 0), 0)
    return { total, online, offline, disabled, totalUsers }
  }, [nodes])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total" value={stats.total} icon={<GlobeIcon />} color="accent" />
        <StatCard label="Online" value={stats.online} icon={<GlobeIcon />} color="green" />
        <StatCard label="Offline" value={stats.offline} icon={<GlobeIcon />} color="red" />
        <StatCard label="Disabled" value={stats.disabled} icon={<GlobeIcon />} color="accent" />
        <StatCard label="Users" value={stats.totalUsers} icon={<UsersIcon />} color="blue" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-2"
        >
          <RefreshIcon />
          {t('common.refresh', 'Refresh')}
        </button>
        <button
          onClick={onRestartAll}
          disabled={isActionLoading}
          className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <ArrowPathIcon />
          {t('admin.remnawave.nodes.restartAll', 'Restart All')}
        </button>
      </div>

      {/* Nodes List */}
      <div className="space-y-3">
        {nodes.length === 0 ? (
          <p className="text-center text-dark-400 py-8">{t('admin.remnawave.nodes.noNodes', 'No nodes found')}</p>
        ) : (
          nodes.map(node => (
            <NodeCard
              key={node.uuid}
              node={node}
              onAction={onAction}
              isLoading={isActionLoading}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SquadsTabProps {
  squads: SquadWithLocalInfo[]
  isLoading: boolean
  onRefresh: () => void
  onSelect: (squad: SquadWithLocalInfo) => void
  onSync: () => void
  isSyncing: boolean
}

function SquadsTab({ squads, isLoading, onRefresh, onSelect, onSync, isSyncing }: SquadsTabProps) {
  const { t } = useTranslation()

  const stats = useMemo(() => {
    const total = squads.length
    const synced = squads.filter(s => s.is_synced).length
    const available = squads.filter(s => s.is_available).length
    const totalMembers = squads.reduce((acc, s) => acc + s.members_count, 0)
    return { total, synced, available, totalMembers }
  }, [squads])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total" value={stats.total} icon={<ServerIcon className="w-5 h-5" />} color="accent" />
        <StatCard label="Synced" value={stats.synced} icon={<SyncIcon />} color="green" />
        <StatCard label="Available" value={stats.available} icon={<ServerIcon className="w-5 h-5" />} color="blue" />
        <StatCard label="Members" value={stats.totalMembers} icon={<UsersIcon />} color="purple" />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 bg-dark-700 text-dark-300 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-2"
        >
          <RefreshIcon />
          {t('common.refresh', 'Refresh')}
        </button>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="px-3 py-1.5 bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshIcon spinning={isSyncing} />
          {t('admin.remnawave.squads.syncServers', 'Sync Servers')}
        </button>
      </div>

      {/* Squads List */}
      <div className="space-y-3">
        {squads.length === 0 ? (
          <p className="text-center text-dark-400 py-8">{t('admin.remnawave.squads.noSquads', 'No squads found')}</p>
        ) : (
          squads.map(squad => (
            <SquadCard
              key={squad.uuid}
              squad={squad}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SyncTabProps {
  autoSyncStatus: AutoSyncStatus | undefined
  isLoading: boolean
  onRunAutoSync: () => void
  onSyncFromPanel: () => void
  onSyncToPanel: () => void
  onValidate: () => void
  onCleanup: () => void
  onSyncStatuses: () => void
  syncResults: Record<string, { success: boolean; message?: string } | null>
  loadingStates: Record<string, boolean>
}

function SyncTab({
  autoSyncStatus,
  isLoading,
  onRunAutoSync,
  onSyncFromPanel,
  onSyncToPanel,
  onValidate,
  onCleanup,
  onSyncStatuses,
  syncResults,
  loadingStates,
}: SyncTabProps) {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Auto Sync Status */}
      {autoSyncStatus && (
        <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-dark-100 flex items-center gap-2">
              <SyncIcon />
              {t('admin.remnawave.sync.autoSync', 'Auto Sync')}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              autoSyncStatus.enabled
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-dark-600 text-dark-400'
            }`}>
              {autoSyncStatus.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-dark-500">Schedule</p>
              <p className="text-dark-200">{autoSyncStatus.times.length > 0 ? autoSyncStatus.times.join(', ') : '—'}</p>
            </div>
            <div>
              <p className="text-dark-500">Next Run</p>
              <p className="text-dark-200">{autoSyncStatus.next_run ? new Date(autoSyncStatus.next_run).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-dark-500">Last Run</p>
              <p className="text-dark-200">{autoSyncStatus.last_run_finished_at ? new Date(autoSyncStatus.last_run_finished_at).toLocaleString() : '—'}</p>
            </div>
            <div>
              <p className="text-dark-500">Status</p>
              <p className={autoSyncStatus.is_running ? 'text-orange-400' : autoSyncStatus.last_run_success ? 'text-emerald-400' : 'text-dark-200'}>
                {autoSyncStatus.is_running ? 'Running...' : autoSyncStatus.last_run_success ? 'Success' : autoSyncStatus.last_run_error || '—'}
              </p>
            </div>
          </div>

          <button
            onClick={onRunAutoSync}
            disabled={loadingStates.autoSync || autoSyncStatus.is_running}
            className="mt-4 px-4 py-2 bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshIcon spinning={loadingStates.autoSync || autoSyncStatus.is_running} />
            {t('admin.remnawave.sync.runNow', 'Run Now')}
          </button>
        </div>
      )}

      {/* Manual Sync Options */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.sync.manual', 'Manual Sync')}
        </h3>
        <div className="space-y-3">
          <SyncCard
            title={t('admin.remnawave.sync.fromPanel', 'Sync from Panel')}
            description={t('admin.remnawave.sync.fromPanelDesc', 'Import users from RemnaWave panel to bot database')}
            onAction={onSyncFromPanel}
            isLoading={loadingStates.fromPanel}
            lastResult={syncResults.fromPanel}
          />
          <SyncCard
            title={t('admin.remnawave.sync.toPanel', 'Sync to Panel')}
            description={t('admin.remnawave.sync.toPanelDesc', 'Export users from bot database to RemnaWave panel')}
            onAction={onSyncToPanel}
            isLoading={loadingStates.toPanel}
            lastResult={syncResults.toPanel}
          />
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h3 className="text-sm font-medium text-dark-300 mb-3">
          {t('admin.remnawave.sync.subscriptions', 'Subscriptions')}
        </h3>
        <div className="space-y-3">
          <SyncCard
            title={t('admin.remnawave.sync.validate', 'Validate')}
            description={t('admin.remnawave.sync.validateDesc', 'Check and fix subscription inconsistencies')}
            onAction={onValidate}
            isLoading={loadingStates.validate}
            lastResult={syncResults.validate}
          />
          <SyncCard
            title={t('admin.remnawave.sync.cleanup', 'Cleanup')}
            description={t('admin.remnawave.sync.cleanupDesc', 'Remove orphaned subscriptions without users')}
            onAction={onCleanup}
            isLoading={loadingStates.cleanup}
            lastResult={syncResults.cleanup}
          />
          <SyncCard
            title={t('admin.remnawave.sync.statuses', 'Sync Statuses')}
            description={t('admin.remnawave.sync.statusesDesc', 'Synchronize subscription statuses with panel')}
            onAction={onSyncStatuses}
            isLoading={loadingStates.statuses}
            lastResult={syncResults.statuses}
          />
        </div>
      </div>
    </div>
  )
}

// ============ Main Component ============

type TabType = 'overview' | 'nodes' | 'squads' | 'sync'

export default function AdminRemnawave() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [selectedSquad, setSelectedSquad] = useState<SquadWithLocalInfo | null>(null)
  const [syncResults, setSyncResults] = useState<Record<string, { success: boolean; message?: string } | null>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})

  // Queries
  const { data: status } = useQuery({
    queryKey: ['admin-remnawave-status'],
    queryFn: adminRemnawaveApi.getStatus,
  })

  const { data: systemStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-remnawave-system'],
    queryFn: adminRemnawaveApi.getSystemStats,
    enabled: activeTab === 'overview',
    refetchInterval: 30000,
  })

  const { data: nodesData, isLoading: isLoadingNodes, refetch: refetchNodes } = useQuery({
    queryKey: ['admin-remnawave-nodes'],
    queryFn: adminRemnawaveApi.getNodes,
    enabled: activeTab === 'nodes',
    refetchInterval: 15000,
  })

  const { data: squadsData, isLoading: isLoadingSquads, refetch: refetchSquads } = useQuery({
    queryKey: ['admin-remnawave-squads'],
    queryFn: adminRemnawaveApi.getSquads,
    enabled: activeTab === 'squads',
  })

  const { data: autoSyncStatus, isLoading: isLoadingAutoSync } = useQuery({
    queryKey: ['admin-remnawave-autosync'],
    queryFn: adminRemnawaveApi.getAutoSyncStatus,
    enabled: activeTab === 'sync',
    refetchInterval: 10000,
  })

  // Mutations
  const nodeActionMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'enable' | 'disable' | 'restart' }) =>
      adminRemnawaveApi.nodeAction(uuid, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-nodes'] })
    },
  })

  const restartAllMutation = useMutation({
    mutationFn: adminRemnawaveApi.restartAllNodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-nodes'] })
    },
  })

  const syncServersMutation = useMutation({
    mutationFn: adminRemnawaveApi.syncServers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-squads'] })
    },
  })

  // Handlers
  const handleNodeAction = (uuid: string, action: 'enable' | 'disable' | 'restart') => {
    nodeActionMutation.mutate({ uuid, action })
  }

  const handleRestartAll = () => {
    if (confirm(t('admin.remnawave.nodes.confirmRestartAll', 'Are you sure you want to restart all nodes?'))) {
      restartAllMutation.mutate()
    }
  }

  const handleSyncServers = () => {
    syncServersMutation.mutate()
  }

  const handleSyncAction = async (key: string, action: () => Promise<{ success?: boolean; started?: boolean; message?: string }>) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }))
    try {
      const result = await action()
      setSyncResults(prev => ({ ...prev, [key]: { success: result.success ?? result.started ?? false, message: result.message } }))
    } catch (error) {
      setSyncResults(prev => ({ ...prev, [key]: { success: false, message: 'Failed' } }))
    } finally {
      setLoadingStates(prev => ({ ...prev, [key]: false }))
    }
  }

  const tabs = [
    { id: 'overview' as const, label: t('admin.remnawave.tabs.overview', 'Overview'), icon: <ChartIcon /> },
    { id: 'nodes' as const, label: t('admin.remnawave.tabs.nodes', 'Nodes'), icon: <GlobeIcon /> },
    { id: 'squads' as const, label: t('admin.remnawave.tabs.squads', 'Squads'), icon: <ServerIcon className="w-5 h-5" /> },
    { id: 'sync' as const, label: t('admin.remnawave.tabs.sync', 'Sync'), icon: <SyncIcon /> },
  ]

  const isConfigured = status?.is_configured

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <ChevronLeftIcon />
          </Link>
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <ServerIcon className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">
              {t('admin.remnawave.title', 'RemnaWave')}
            </h1>
            <p className="text-sm text-dark-400">
              {t('admin.remnawave.subtitle', 'Panel management and statistics')}
            </p>
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 ${
          isConfigured
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {isConfigured ? t('admin.remnawave.connected', 'Connected') : t('admin.remnawave.disconnected', 'Not configured')}
        </div>
      </div>

      {/* Configuration Error */}
      {status?.configuration_error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{status.configuration_error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-dark-800/50 rounded-xl mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          stats={systemStats}
          isLoading={isLoadingStats}
          onRefresh={() => refetchStats()}
        />
      )}

      {activeTab === 'nodes' && (
        <NodesTab
          nodes={nodesData?.items || []}
          isLoading={isLoadingNodes}
          onRefresh={() => refetchNodes()}
          onAction={handleNodeAction}
          onRestartAll={handleRestartAll}
          isActionLoading={nodeActionMutation.isPending || restartAllMutation.isPending}
        />
      )}

      {activeTab === 'squads' && (
        <SquadsTab
          squads={squadsData?.items || []}
          isLoading={isLoadingSquads}
          onRefresh={() => refetchSquads()}
          onSelect={setSelectedSquad}
          onSync={handleSyncServers}
          isSyncing={syncServersMutation.isPending}
        />
      )}

      {activeTab === 'sync' && (
        <SyncTab
          autoSyncStatus={autoSyncStatus}
          isLoading={isLoadingAutoSync}
          onRunAutoSync={() => handleSyncAction('autoSync', adminRemnawaveApi.runAutoSync)}
          onSyncFromPanel={() => handleSyncAction('fromPanel', () => adminRemnawaveApi.syncFromPanel('all'))}
          onSyncToPanel={() => handleSyncAction('toPanel', adminRemnawaveApi.syncToPanel)}
          onValidate={() => handleSyncAction('validate', adminRemnawaveApi.validateSubscriptions)}
          onCleanup={() => handleSyncAction('cleanup', adminRemnawaveApi.cleanupSubscriptions)}
          onSyncStatuses={() => handleSyncAction('statuses', adminRemnawaveApi.syncSubscriptionStatuses)}
          syncResults={syncResults}
          loadingStates={loadingStates}
        />
      )}

      {/* Squad Detail Modal */}
      {selectedSquad && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSquad(null)}>
          <div className="bg-dark-800 rounded-xl w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getCountryFlag(selectedSquad.country_code)}</span>
                <h2 className="text-lg font-semibold text-dark-100">
                  {selectedSquad.display_name || selectedSquad.name}
                </h2>
              </div>
              <button onClick={() => setSelectedSquad(null)} className="p-1 hover:bg-dark-700 rounded-lg text-dark-400">
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-dark-500">UUID</p>
                  <p className="text-dark-200 font-mono text-xs break-all">{selectedSquad.uuid}</p>
                </div>
                <div>
                  <p className="text-dark-500">Original Name</p>
                  <p className="text-dark-200">{selectedSquad.name}</p>
                </div>
                <div>
                  <p className="text-dark-500">Members</p>
                  <p className="text-dark-200">{selectedSquad.members_count}</p>
                </div>
                <div>
                  <p className="text-dark-500">Inbounds</p>
                  <p className="text-dark-200">{selectedSquad.inbounds_count}</p>
                </div>
                {selectedSquad.is_synced && (
                  <>
                    <div>
                      <p className="text-dark-500">Price</p>
                      <p className="text-dark-200">{((selectedSquad.price_kopeks ?? 0) / 100).toFixed(2)} ₽</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Users</p>
                      <p className="text-dark-200">{selectedSquad.current_users ?? 0} / {selectedSquad.max_users ?? '∞'}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">Available</p>
                      <p className={selectedSquad.is_available ? 'text-emerald-400' : 'text-red-400'}>
                        {selectedSquad.is_available ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-500">Trial Eligible</p>
                      <p className={selectedSquad.is_trial_eligible ? 'text-emerald-400' : 'text-dark-400'}>
                        {selectedSquad.is_trial_eligible ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Inbounds */}
              {selectedSquad.inbounds.length > 0 && (
                <div>
                  <p className="text-dark-500 text-sm mb-2">Inbounds</p>
                  <div className="space-y-1">
                    {selectedSquad.inbounds.map((inbound: Record<string, unknown>, idx) => (
                      <div key={idx} className="text-xs text-dark-300 bg-dark-700/50 px-2 py-1 rounded">
                        {String(inbound.tag || inbound.uuid || `Inbound ${idx + 1}`)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-dark-700">
              <button onClick={() => setSelectedSquad(null)} className="btn-secondary">
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
