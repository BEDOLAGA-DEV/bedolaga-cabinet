import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  banSystemApi,
  type BanSystemStatus,
  type BanSystemStats,
  type BanUsersListResponse,
  type BanUserDetailResponse,
  type BanPunishmentsListResponse,
  type BanNodesListResponse,
  type BanAgentsListResponse,
  type BanTrafficViolationsResponse,
} from '../api/banSystem'

// Icons
const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const BanIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
)

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

const AgentIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
)

type TabType = 'dashboard' | 'users' | 'punishments' | 'nodes' | 'agents' | 'violations'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'accent' | 'success' | 'warning' | 'error' | 'info'
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400',
    info: 'bg-info-500/20 text-info-400',
  }

  return (
    <div className="bg-dark-800/50 backdrop-blur rounded-xl border border-dark-700 p-4 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-dark-100 mb-1">{value}</div>
      <div className="text-sm text-dark-400">{title}</div>
      {subtitle && <div className="text-xs text-dark-500 mt-1">{subtitle}</div>}
    </div>
  )
}

export default function AdminBanSystem() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [status, setStatus] = useState<BanSystemStatus | null>(null)
  const [stats, setStats] = useState<BanSystemStats | null>(null)
  const [users, setUsers] = useState<BanUsersListResponse | null>(null)
  const [selectedUser, setSelectedUser] = useState<BanUserDetailResponse | null>(null)
  const [punishments, setPunishments] = useState<BanPunishmentsListResponse | null>(null)
  const [nodes, setNodes] = useState<BanNodesListResponse | null>(null)
  const [agents, setAgents] = useState<BanAgentsListResponse | null>(null)
  const [violations, setViolations] = useState<BanTrafficViolationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    if (status?.enabled && status?.configured) {
      loadTabData(activeTab)
    }
  }, [activeTab, status])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const data = await banSystemApi.getStatus()
      setStatus(data)
      if (!data.enabled || !data.configured) {
        setError(t('banSystem.notConfigured'))
      }
    } catch {
      setError(t('banSystem.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const loadTabData = async (tab: TabType) => {
    try {
      setLoading(true)
      setError(null)

      switch (tab) {
        case 'dashboard':
          const statsData = await banSystemApi.getStats()
          setStats(statsData)
          break
        case 'users':
          const usersData = await banSystemApi.getUsers({ limit: 50 })
          setUsers(usersData)
          break
        case 'punishments':
          const punishmentsData = await banSystemApi.getPunishments()
          setPunishments(punishmentsData)
          break
        case 'nodes':
          const nodesData = await banSystemApi.getNodes()
          setNodes(nodesData)
          break
        case 'agents':
          const agentsData = await banSystemApi.getAgents()
          setAgents(agentsData)
          break
        case 'violations':
          const violationsData = await banSystemApi.getTrafficViolations()
          setViolations(violationsData)
          break
      }
    } catch {
      setError(t('banSystem.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadTabData('users')
      return
    }
    try {
      setLoading(true)
      const data = await banSystemApi.searchUsers(searchQuery)
      setUsers(data)
    } catch {
      setError(t('banSystem.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = async (email: string) => {
    try {
      setActionLoading(email)
      const data = await banSystemApi.getUser(email)
      setSelectedUser(data)
    } catch {
      setError(t('banSystem.loadError'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      setActionLoading(userId)
      await banSystemApi.unbanUser(userId)
      loadTabData('punishments')
    } catch {
      setError(t('banSystem.loadError'))
    } finally {
      setActionLoading(null)
    }
  }

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h`
    }
    return `${hours}h ${minutes}m`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString()
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: t('banSystem.tabs.dashboard'), icon: <ChartIcon /> },
    { id: 'users' as TabType, label: t('banSystem.tabs.users'), icon: <UsersIcon /> },
    { id: 'punishments' as TabType, label: t('banSystem.tabs.punishments'), icon: <BanIcon /> },
    { id: 'nodes' as TabType, label: t('banSystem.tabs.nodes'), icon: <ServerIcon /> },
    { id: 'agents' as TabType, label: t('banSystem.tabs.agents'), icon: <AgentIcon /> },
    { id: 'violations' as TabType, label: t('banSystem.tabs.violations'), icon: <WarningIcon /> },
  ]

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !status?.enabled) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-error-400">{error}</div>
        <p className="text-dark-400 text-sm">{t('banSystem.configureHint')}</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-error-500/20 rounded-xl">
            <ShieldIcon />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{t('banSystem.title')}</h1>
            <p className="text-dark-400">{t('banSystem.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => loadTabData(activeTab)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors disabled:opacity-50"
        >
          <RefreshIcon />
          {t('common.refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-dark-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8 text-error-400">{error}</div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title={t('banSystem.stats.activeUsers')}
                value={stats.active_users}
                subtitle={`${t('banSystem.stats.total')}: ${stats.total_users}`}
                icon={<UsersIcon />}
                color="success"
              />
              <StatCard
                title={t('banSystem.stats.usersOverLimit')}
                value={stats.users_over_limit}
                icon={<WarningIcon />}
                color="warning"
              />
              <StatCard
                title={t('banSystem.stats.activeBans')}
                value={stats.active_punishments}
                subtitle={`${t('banSystem.stats.total')}: ${stats.total_punishments}`}
                icon={<BanIcon />}
                color="error"
              />
              <StatCard
                title={t('banSystem.stats.nodesOnline')}
                value={`${stats.nodes_online}/${stats.nodes_total}`}
                icon={<ServerIcon />}
                color="accent"
              />
              <StatCard
                title={t('banSystem.stats.agentsOnline')}
                value={`${stats.agents_online}/${stats.agents_total}`}
                icon={<AgentIcon />}
                color="info"
              />
              <StatCard
                title={t('banSystem.stats.totalRequests')}
                value={stats.total_requests.toLocaleString()}
                icon={<ChartIcon />}
                color="accent"
              />
              <StatCard
                title={t('banSystem.stats.panelStatus')}
                value={stats.panel_connected ? t('banSystem.stats.connected') : t('banSystem.stats.disconnected')}
                icon={<ServerIcon />}
                color={stats.panel_connected ? 'success' : 'error'}
              />
              <StatCard
                title={t('banSystem.stats.uptime')}
                value={formatUptime(stats.uptime_seconds)}
                icon={<ChartIcon />}
                color="info"
              />
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('banSystem.users.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-accent-500/20 text-accent-400 rounded-lg hover:bg-accent-500/30 transition-colors"
                >
                  {t('common.search')}
                </button>
              </div>

              {/* Users Table */}
              <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.users.email')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.users.ipCount')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.users.limit')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.users.status')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.users.bans')}</th>
                      <th className="text-right text-xs text-dark-500 font-medium py-3 px-4">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.users.map((user) => (
                      <tr key={user.email} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                        <td className="py-3 px-4 text-dark-100">{user.email}</td>
                        <td className="text-center py-3 px-4 text-dark-300">{user.unique_ip_count}</td>
                        <td className="text-center py-3 px-4 text-dark-300">{user.limit ?? '-'}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.is_over_limit
                              ? 'bg-error-500/20 text-error-400'
                              : 'bg-success-500/20 text-success-400'
                          }`}>
                            {user.is_over_limit ? t('banSystem.users.overLimit') : t('banSystem.users.ok')}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-dark-300">{user.blocked_count}</td>
                        <td className="text-right py-3 px-4">
                          <button
                            onClick={() => handleViewUser(user.email)}
                            disabled={actionLoading === user.email}
                            className="text-accent-400 hover:text-accent-300 text-sm disabled:opacity-50"
                          >
                            {t('banSystem.users.viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!users?.users || users.users.length === 0) && (
                  <div className="text-center py-8 text-dark-500">{t('common.noData')}</div>
                )}
              </div>
            </div>
          )}

          {/* Punishments Tab */}
          {activeTab === 'punishments' && (
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.user')}</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.reason')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.ipCount')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.limit')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.bannedAt')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.punishments.enableAt')}</th>
                    <th className="text-right text-xs text-dark-500 font-medium py-3 px-4">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {punishments?.punishments.map((p) => (
                    <tr key={p.user_id} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                      <td className="py-3 px-4">
                        <div className="text-dark-100">{p.username}</div>
                        <div className="text-xs text-dark-500">{p.user_id}</div>
                      </td>
                      <td className="py-3 px-4 text-dark-300 text-sm">{p.reason || '-'}</td>
                      <td className="text-center py-3 px-4 text-error-400">{p.ip_count}</td>
                      <td className="text-center py-3 px-4 text-dark-300">{p.limit}</td>
                      <td className="text-center py-3 px-4 text-dark-300 text-sm">{formatDate(p.punished_at)}</td>
                      <td className="text-center py-3 px-4 text-dark-300 text-sm">{formatDate(p.enable_at)}</td>
                      <td className="text-right py-3 px-4">
                        <button
                          onClick={() => handleUnban(p.user_id)}
                          disabled={actionLoading === p.user_id}
                          className="px-3 py-1 bg-success-500/20 text-success-400 rounded-lg text-sm hover:bg-success-500/30 transition-colors disabled:opacity-50"
                        >
                          {t('banSystem.punishments.unban')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!punishments?.punishments || punishments.punishments.length === 0) && (
                <div className="text-center py-8 text-dark-500">{t('banSystem.punishments.noBans')}</div>
              )}
            </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes?.nodes.map((node) => (
                <div
                  key={node.name}
                  className={`bg-dark-800/50 rounded-xl border p-4 ${
                    node.is_connected ? 'border-success-500/30' : 'border-dark-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${node.is_connected ? 'bg-success-500 animate-pulse' : 'bg-dark-500'}`} />
                    <div>
                      <div className="font-medium text-dark-100">{node.name}</div>
                      <div className="text-xs text-dark-500">{node.address || '-'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-dark-900/50 rounded-lg p-2.5">
                      <div className="text-xs text-dark-500">{t('banSystem.nodes.status')}</div>
                      <div className={`text-sm font-medium ${node.is_connected ? 'text-success-400' : 'text-dark-400'}`}>
                        {node.is_connected ? t('banSystem.nodes.online') : t('banSystem.nodes.offline')}
                      </div>
                    </div>
                    <div className="bg-dark-900/50 rounded-lg p-2.5">
                      <div className="text-xs text-dark-500">{t('banSystem.nodes.users')}</div>
                      <div className="text-sm font-medium text-dark-100">{node.users_count}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!nodes?.nodes || nodes.nodes.length === 0) && (
                <div className="col-span-full text-center py-8 text-dark-500">{t('banSystem.nodes.noNodes')}</div>
              )}
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              {/* Summary */}
              {agents?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title={t('banSystem.agents.online')}
                    value={`${agents.summary.online_agents}/${agents.summary.total_agents}`}
                    icon={<AgentIcon />}
                    color="success"
                  />
                  <StatCard
                    title={t('banSystem.agents.totalSent')}
                    value={agents.summary.total_sent.toLocaleString()}
                    icon={<ChartIcon />}
                    color="accent"
                  />
                  <StatCard
                    title={t('banSystem.agents.totalDropped')}
                    value={agents.summary.total_dropped.toLocaleString()}
                    icon={<WarningIcon />}
                    color="warning"
                  />
                  <StatCard
                    title={t('banSystem.agents.healthy')}
                    value={agents.summary.healthy_count}
                    subtitle={`${t('banSystem.agents.warning')}: ${agents.summary.warning_count}, ${t('banSystem.agents.critical')}: ${agents.summary.critical_count}`}
                    icon={<AgentIcon />}
                    color="info"
                  />
                </div>
              )}

              {/* Agents List */}
              <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.node')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.status')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.health')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.sent')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.dropped')}</th>
                      <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.agents.queue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents?.agents.map((agent) => (
                      <tr key={agent.node_name} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                        <td className="py-3 px-4 text-dark-100">{agent.node_name}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            agent.is_online
                              ? 'bg-success-500/20 text-success-400'
                              : 'bg-dark-600 text-dark-400'
                          }`}>
                            {agent.is_online ? t('banSystem.agents.online') : t('banSystem.agents.offline')}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            agent.health === 'healthy' ? 'bg-success-500/20 text-success-400' :
                            agent.health === 'warning' ? 'bg-warning-500/20 text-warning-400' :
                            agent.health === 'critical' ? 'bg-error-500/20 text-error-400' :
                            'bg-dark-600 text-dark-400'
                          }`}>
                            {agent.health}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-dark-300">{agent.sent_total.toLocaleString()}</td>
                        <td className="text-center py-3 px-4 text-warning-400">{agent.dropped_total.toLocaleString()}</td>
                        <td className="text-center py-3 px-4 text-dark-300">{agent.queue_size}/{agent.queue_max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!agents?.agents || agents.agents.length === 0) && (
                  <div className="text-center py-8 text-dark-500">{t('banSystem.agents.noAgents')}</div>
                )}
              </div>
            </div>
          )}

          {/* Violations Tab */}
          {activeTab === 'violations' && (
            <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.violations.user')}</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.violations.type')}</th>
                    <th className="text-left text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.violations.description')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.violations.detectedAt')}</th>
                    <th className="text-center text-xs text-dark-500 font-medium py-3 px-4">{t('banSystem.violations.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {violations?.violations.map((v, idx) => (
                    <tr key={idx} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                      <td className="py-3 px-4">
                        <div className="text-dark-100">{v.username}</div>
                        <div className="text-xs text-dark-500">{v.email || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-warning-400">{v.violation_type}</td>
                      <td className="py-3 px-4 text-dark-300 text-sm">{v.description || '-'}</td>
                      <td className="text-center py-3 px-4 text-dark-300 text-sm">{formatDate(v.detected_at)}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          v.resolved
                            ? 'bg-success-500/20 text-success-400'
                            : 'bg-warning-500/20 text-warning-400'
                        }`}>
                          {v.resolved ? t('banSystem.violations.resolved') : t('banSystem.violations.active')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!violations?.violations || violations.violations.length === 0) && (
                <div className="text-center py-8 text-dark-500">{t('banSystem.violations.noViolations')}</div>
              )}
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-dark-800 rounded-xl border border-dark-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-dark-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-dark-100">{t('banSystem.userDetail.title')}</h3>
              <button onClick={() => setSelectedUser(null)} className="text-dark-400 hover:text-dark-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dark-500">{t('banSystem.users.email')}</div>
                  <div className="text-dark-100">{selectedUser.email}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500">{t('banSystem.users.limit')}</div>
                  <div className="text-dark-100">{selectedUser.limit ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500">{t('banSystem.users.ipCount')}</div>
                  <div className="text-dark-100">{selectedUser.unique_ip_count}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500">{t('banSystem.users.networkType')}</div>
                  <div className="text-dark-100">{selectedUser.network_type || '-'}</div>
                </div>
              </div>

              {/* IP History */}
              <div>
                <h4 className="text-sm font-medium text-dark-200 mb-2">{t('banSystem.userDetail.ipHistory')}</h4>
                <div className="bg-dark-900/50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="text-left text-xs text-dark-500 py-2 px-3">{t('banSystem.userDetail.ip')}</th>
                        <th className="text-left text-xs text-dark-500 py-2 px-3">{t('banSystem.userDetail.country')}</th>
                        <th className="text-left text-xs text-dark-500 py-2 px-3">{t('banSystem.userDetail.node')}</th>
                        <th className="text-center text-xs text-dark-500 py-2 px-3">{t('banSystem.userDetail.requests')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.ips.map((ip, idx) => (
                        <tr key={idx} className="border-b border-dark-700/50">
                          <td className="py-2 px-3 text-dark-100">{ip.ip}</td>
                          <td className="py-2 px-3 text-dark-300">{ip.country_name || ip.country_code || '-'}</td>
                          <td className="py-2 px-3 text-dark-300">{ip.node || '-'}</td>
                          <td className="text-center py-2 px-3 text-dark-300">{ip.request_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedUser.ips.length === 0 && (
                    <div className="text-center py-4 text-dark-500">{t('common.noData')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
