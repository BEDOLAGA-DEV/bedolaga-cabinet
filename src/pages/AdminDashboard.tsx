import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { statsApi, type DashboardStats, type NodeStatus } from '../api/admin'
import { useCurrency } from '../hooks/useCurrency'

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5 text-dark-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
)

const ServerIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const CurrencyIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)

const SubscriptionIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
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
      {last7Days.map((item, index) => {
        const percentage = (item.amount_rubles / maxValue) * 100
        const date = new Date(item.date)
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' })
        const dayNum = date.getDate()

        return (
          <div key={index} className="group">
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
          icon={<UsersIcon />}
          color="success"
        />
        <StatCard
          title={t('adminDashboard.stats.activeSubscriptions')}
          value={stats?.subscriptions.active || 0}
          subtitle={`${t('adminDashboard.stats.total')}: ${stats?.subscriptions.total || 0}`}
          icon={<SubscriptionIcon />}
          color="accent"
        />
        <StatCard
          title={t('adminDashboard.stats.incomeToday')}
          value={`${formatAmount(stats?.financial.income_today_rubles || 0)} ${currencySymbol}`}
          icon={<CurrencyIcon />}
          color="warning"
        />
        <StatCard
          title={t('adminDashboard.stats.incomeMonth')}
          value={`${formatAmount(stats?.financial.income_month_rubles || 0)} ${currencySymbol}`}
          icon={<CurrencyIcon />}
          color="info"
        />
      </div>

      {/* Nodes Section */}
      <div className="bg-dark-800/30 backdrop-blur rounded-xl border border-dark-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ServerIcon />
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
            <CurrencyIcon />
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
            <SubscriptionIcon />
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
            <ServerIcon />
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
            <SubscriptionIcon />
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
