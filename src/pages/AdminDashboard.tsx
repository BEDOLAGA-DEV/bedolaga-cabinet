import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { statsApi, type DashboardStats, type NodeStatus } from '../api/admin'
import { useCurrency } from '../hooks/useCurrency'

// Icons - styled like main navigation
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z" />
  </svg>
)

const UsersOnlineIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
  </svg>
)

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
)

const ChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

const CubeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
  </svg>
)

const TagIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

const PowerIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
  </svg>
)

const RestartIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
)

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'accent' | 'success' | 'warning' | 'error' | 'info'
  trend?: {
    value: number
    label: string
  }
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400',
    info: 'bg-info-500/20 text-info-400',
  }

  return (
    <div className="bg-dark-800/50 backdrop-blur rounded-xl border border-dark-700 p-5 hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${trend.value >= 0 ? 'bg-success-500/20 text-success-400' : 'bg-error-500/20 text-error-400'}`}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-dark-100 mb-1">{value}</div>
      <div className="text-sm text-dark-400">{title}</div>
      {subtitle && <div className="text-xs text-dark-500 mt-1">{subtitle}</div>}
    </div>
  )
}

interface NodeCardProps {
  node: NodeStatus
  onRestart: (uuid: string) => void
  onToggle: (uuid: string) => void
  isLoading: boolean
}

function NodeCard({ node, onRestart, onToggle, isLoading }: NodeCardProps) {
  const { t } = useTranslation()

  const getStatusColor = () => {
    if (node.is_disabled) return 'bg-dark-600 text-dark-400'
    if (node.is_connected) return 'bg-success-500/20 text-success-400'
    return 'bg-error-500/20 text-error-400'
  }

  const getStatusText = () => {
    if (node.is_disabled) return t('adminDashboard.nodes.disabled')
    if (node.is_connected) return t('adminDashboard.nodes.online')
    return t('adminDashboard.nodes.offline')
  }

  const formatTraffic = (bytes?: number) => {
    if (!bytes) return '-'
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`
    return `${gb.toFixed(1)} GB`
  }

  return (
    <div className={`bg-dark-800/50 backdrop-blur rounded-xl border ${node.is_disabled ? 'border-dark-700' : node.is_connected ? 'border-success-500/30' : 'border-error-500/30'} p-4 hover:border-dark-600 transition-colors`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${node.is_disabled ? 'bg-dark-500' : node.is_connected ? 'bg-success-500 animate-pulse' : 'bg-error-500'}`} />
          <div>
            <div className="font-medium text-dark-100">{node.name}</div>
            <div className="text-xs text-dark-500">{node.address}</div>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="text-xs text-dark-500 mb-0.5">{t('adminDashboard.nodes.usersOnline')}</div>
          <div className="text-lg font-semibold text-dark-100">{node.users_online}</div>
        </div>
        <div className="bg-dark-900/50 rounded-lg p-2.5">
          <div className="text-xs text-dark-500 mb-0.5">{t('adminDashboard.nodes.traffic')}</div>
          <div className="text-lg font-semibold text-dark-100">{formatTraffic(node.traffic_used_bytes)}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(node.uuid)}
          disabled={isLoading}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            node.is_disabled
              ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
              : 'bg-warning-500/20 text-warning-400 hover:bg-warning-500/30'
          } disabled:opacity-50`}
        >
          <PowerIcon />
          {node.is_disabled ? t('adminDashboard.nodes.enable') : t('adminDashboard.nodes.disable')}
        </button>
        <button
          onClick={() => onRestart(node.uuid)}
          disabled={isLoading || node.is_disabled}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors disabled:opacity-50"
        >
          <RestartIcon />
        </button>
      </div>
    </div>
  )
}

function RevenueChart({ data }: { data: { date: string; amount_rubles: number }[] }) {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useCurrency()

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-dark-500">
        {t('common.noData')}
      </div>
    )
  }

  const last7Days = data.slice(-7)
  const maxValue = Math.max(...last7Days.map(d => d.amount_rubles), 1)

  return (
    <div className="space-y-3">
      {last7Days.map((item) => {
        const percentage = (item.amount_rubles / maxValue) * 100
        const date = new Date(item.date)
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' })
        const dayNum = date.getDate()

        return (
          <div key={item.date} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-dark-300 font-medium capitalize">{dayName}, {dayNum}</span>
              <span className="text-sm font-semibold text-dark-100">{formatAmount(item.amount_rubles)} {currencySymbol}</span>
            </div>
            <div className="h-3 bg-dark-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full transition-all duration-500 ease-out group-hover:from-accent-500 group-hover:to-accent-300"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { formatAmount, currencySymbol } = useCurrency()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await statsApi.getDashboardStats()
      setStats(data)
    } catch (err) {
      setError(t('adminDashboard.loadError'))
      console.error('Failed to load dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRestartNode = async (uuid: string) => {
    try {
      setActionLoading(uuid)
      await statsApi.restartNode(uuid)
      // Refresh stats after action
      setTimeout(fetchStats, 2000)
    } catch (err) {
      console.error('Failed to restart node:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleNode = async (uuid: string) => {
    try {
      setActionLoading(uuid)
      await statsApi.toggleNode(uuid)
      await fetchStats()
    } catch (err) {
      console.error('Failed to toggle node:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-error-400">{error}</div>
        <button onClick={fetchStats} className="btn-primary">
          {t('common.loading')}
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 border border-dark-700 hover:border-dark-600 transition-colors"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{t('adminDashboard.title')}</h1>
            <p className="text-dark-400">{t('adminDashboard.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 rounded-lg text-dark-300 hover:text-dark-100 hover:bg-dark-700 transition-colors disabled:opacity-50"
        >
          <RefreshIcon />
          {t('adminDashboard.refresh')}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title={t('adminDashboard.stats.usersOnline')}
          value={stats?.nodes.total_users_online || 0}
          icon={<UsersOnlineIcon />}
          color="success"
        />
        <StatCard
          title={t('adminDashboard.stats.activeSubscriptions')}
          value={stats?.subscriptions.active || 0}
          subtitle={`${t('adminDashboard.stats.total')}: ${stats?.subscriptions.total || 0}`}
          icon={<SparklesIcon />}
          color="accent"
        />
        <StatCard
          title={t('adminDashboard.stats.incomeToday')}
          value={`${formatAmount(stats?.financial.income_today_rubles || 0)} ${currencySymbol}`}
          icon={<WalletIcon />}
          color="warning"
        />
        <StatCard
          title={t('adminDashboard.stats.incomeMonth')}
          value={`${formatAmount(stats?.financial.income_month_rubles || 0)} ${currencySymbol}`}
          icon={<ChartBarIcon />}
          color="info"
        />
      </div>

      {/* Nodes Section */}
      <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-accent-500/20 text-accent-400">
              <ServerIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('adminDashboard.nodes.title')}</h2>
              <p className="text-sm text-dark-400">
                {stats?.nodes.online || 0} {t('adminDashboard.nodes.online').toLowerCase()} / {stats?.nodes.total || 0} {t('adminDashboard.stats.total').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="w-2 h-2 rounded-full bg-success-500"></span>
              {stats?.nodes.online || 0}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="w-2 h-2 rounded-full bg-error-500"></span>
              {stats?.nodes.offline || 0}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="w-2 h-2 rounded-full bg-dark-500"></span>
              {stats?.nodes.disabled || 0}
            </span>
          </div>
        </div>

        {stats?.nodes.nodes && stats.nodes.nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.nodes.nodes.map((node) => (
              <NodeCard
                key={node.uuid}
                node={node}
                onRestart={handleRestartNode}
                onToggle={handleToggleNode}
                isLoading={actionLoading === node.uuid}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-500">
            {t('adminDashboard.nodes.noNodes')}
          </div>
        )}
      </div>

      {/* Revenue and Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-warning-500/20 text-warning-400">
              <ChartBarIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('adminDashboard.revenue.title')}</h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.revenue.last7Days')}</p>
            </div>
          </div>
          <RevenueChart data={stats?.revenue_chart || []} />
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-dark-700">
            <div>
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.stats.incomeTotal')}</div>
              <div className="text-xl font-bold text-dark-100">{formatAmount(stats?.financial.income_total_rubles || 0)} {currencySymbol}</div>
            </div>
            <div>
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.stats.subscriptionIncome')}</div>
              <div className="text-xl font-bold text-accent-400">{formatAmount(stats?.financial.subscription_income_rubles || 0)} {currencySymbol}</div>
            </div>
          </div>
        </div>

        {/* Subscription Stats */}
        <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-accent-500/20 text-accent-400">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('adminDashboard.subscriptions.title')}</h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.subscriptions.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-900/50 rounded-lg p-4">
                <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.subscriptions.active')}</div>
                <div className="text-2xl font-bold text-success-400">{stats?.subscriptions.active || 0}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-4">
                <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.subscriptions.trial')}</div>
                <div className="text-2xl font-bold text-warning-400">{stats?.subscriptions.trial || 0}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-4">
                <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.subscriptions.paid')}</div>
                <div className="text-2xl font-bold text-accent-400">{stats?.subscriptions.paid || 0}</div>
              </div>
              <div className="bg-dark-900/50 rounded-lg p-4">
                <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.subscriptions.expired')}</div>
                <div className="text-2xl font-bold text-error-400">{stats?.subscriptions.expired || 0}</div>
              </div>
            </div>

            <div className="border-t border-dark-700 pt-4">
              <div className="text-sm font-medium text-dark-300 mb-3">{t('adminDashboard.subscriptions.newSubscriptions')}</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">{stats?.subscriptions.purchased_today || 0}</div>
                  <div className="text-xs text-dark-500">{t('adminDashboard.subscriptions.today')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">{stats?.subscriptions.purchased_week || 0}</div>
                  <div className="text-xs text-dark-500">{t('adminDashboard.subscriptions.week')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">{stats?.subscriptions.purchased_month || 0}</div>
                  <div className="text-xs text-dark-500">{t('adminDashboard.subscriptions.month')}</div>
                </div>
              </div>
            </div>

            {stats?.subscriptions.trial_to_paid_conversion !== undefined && (
              <div className="bg-accent-500/10 rounded-lg p-4 border border-accent-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-300">{t('adminDashboard.subscriptions.conversion')}</span>
                  <span className="text-lg font-bold text-accent-400">{stats.subscriptions.trial_to_paid_conversion.toFixed(1)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Server Stats */}
      {stats?.servers && (
        <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-info-500/20 text-info-400">
              <CubeIcon />
            </div>
            <h2 className="text-lg font-semibold text-dark-100">{t('adminDashboard.servers.title')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-900/50 rounded-lg p-4">
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.servers.total')}</div>
              <div className="text-2xl font-bold text-dark-100">{stats.servers.total_servers}</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-4">
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.servers.available')}</div>
              <div className="text-2xl font-bold text-success-400">{stats.servers.available_servers}</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-4">
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.servers.withConnections')}</div>
              <div className="text-2xl font-bold text-accent-400">{stats.servers.servers_with_connections}</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-4">
              <div className="text-xs text-dark-500 mb-1">{t('adminDashboard.servers.revenue')}</div>
              <div className="text-2xl font-bold text-warning-400">{formatAmount(stats.servers.total_revenue_rubles)} {currencySymbol}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tariff Stats */}
      {stats?.tariff_stats && stats.tariff_stats.tariffs.length > 0 && (
        <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-success-500/20 text-success-400">
              <TagIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">{t('adminDashboard.tariffs.title')}</h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.tariffs.subtitle')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.tariffName')}</th>
                  <th className="text-center text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.activeSubscriptions')}</th>
                  <th className="text-center text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.trialSubscriptions')}</th>
                  <th className="text-center text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.purchasedToday')}</th>
                  <th className="text-center text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.purchasedWeek')}</th>
                  <th className="text-center text-xs text-dark-500 font-medium py-3 px-2">{t('adminDashboard.tariffs.purchasedMonth')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.tariff_stats.tariffs.map((tariff) => (
                  <tr key={tariff.tariff_id} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                    <td className="py-3 px-2">
                      <span className="font-medium text-dark-100">{tariff.tariff_name}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-success-400 font-semibold">{tariff.active_subscriptions}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-warning-400 font-semibold">{tariff.trial_subscriptions}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-dark-200">{tariff.purchased_today}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-dark-200">{tariff.purchased_week}</span>
                    </td>
                    <td className="text-center py-3 px-2">
                      <span className="text-dark-200">{tariff.purchased_month}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
