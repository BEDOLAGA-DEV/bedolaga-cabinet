import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  statsApi,
  type DashboardStats,
  type NodeStatus,
  type TopReferrersResponse,
  type TopCampaignsResponse,
  type RecentPaymentsResponse,
} from '../api/admin';
import { useCurrency } from '../hooks/useCurrency';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';

// Icons - styled like main navigation

const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ServerIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 17.25v-.228a4.5 4.5 0 00-.12-1.03l-2.268-9.64a3.375 3.375 0 00-3.285-2.602H7.923a3.375 3.375 0 00-3.285 2.602l-2.268 9.64a4.5 4.5 0 00-.12 1.03v.228m19.5 0a3 3 0 01-3 3H5.25a3 3 0 01-3-3m19.5 0a3 3 0 00-3-3H5.25a3 3 0 00-3 3m16.5 0h.008v.008h-.008v-.008zm-3 0h.008v.008h-.008v-.008z"
    />
  </svg>
);

const UsersOnlineIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
    />
  </svg>
);

const WalletIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

const ChartBarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const SparklesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const TagIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const PowerIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
  </svg>
);

const RestartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const MegaphoneIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

const BanknotesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
    />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
    />
  </svg>
);

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'accent' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    label: string;
  };
}

function StatCard({ title, value, subtitle, icon, color, trend }: StatCardProps) {
  const colorClasses = {
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success-500/20 text-success-400',
    warning: 'bg-warning-500/20 text-warning-400',
    error: 'bg-error-500/20 text-error-400',
    info: 'bg-info-500/20 text-info-400',
  };

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-5 backdrop-blur transition-colors hover:border-dark-600">
      <div className="mb-3 flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${colorClasses[color]}`}>{icon}</div>
        {trend && (
          <div
            className={`rounded-full px-2 py-1 text-xs ${trend.value >= 0 ? 'bg-success-500/20 text-success-400' : 'bg-error-500/20 text-error-400'}`}
          >
            {trend.value >= 0 ? '+' : ''}
            {trend.value}% {trend.label}
          </div>
        )}
      </div>
      <div className="mb-1 text-2xl font-bold text-dark-100">{value}</div>
      <div className="text-sm text-dark-400">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-dark-500">{subtitle}</div>}
    </div>
  );
}

interface NodeCardProps {
  node: NodeStatus;
  onRestart: (uuid: string) => void;
  onToggle: (uuid: string) => void;
  isLoading: boolean;
}

function NodeCard({ node, onRestart, onToggle, isLoading }: NodeCardProps) {
  const { t } = useTranslation();

  const getStatusColor = () => {
    if (node.is_disabled) return 'bg-dark-600 text-dark-400';
    if (node.is_connected) return 'bg-success-500/20 text-success-400';
    return 'bg-error-500/20 text-error-400';
  };

  const getStatusText = () => {
    if (node.is_disabled) return t('adminDashboard.nodes.disabled');
    if (node.is_connected) return t('adminDashboard.nodes.online');
    return t('adminDashboard.nodes.offline');
  };

  const formatTraffic = (bytes?: number) => {
    if (!bytes) return '-';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1000) return `${(gb / 1000).toFixed(1)} TB`;
    return `${gb.toFixed(1)} GB`;
  };

  const hasError = node.last_status_message && !node.is_connected;

  return (
    <div
      className={`rounded-xl border bg-dark-800/50 backdrop-blur ${node.is_disabled ? 'border-dark-700' : node.is_connected ? 'border-success-500/30' : 'border-error-500/30'} p-4 transition-colors hover:border-dark-600`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${node.is_disabled ? 'bg-dark-500' : node.is_connected ? 'animate-pulse bg-success-500' : 'bg-error-500'}`}
          />
          <div>
            <div className="font-medium text-dark-100">{node.name}</div>
            <div className="text-xs text-dark-500">{node.address}</div>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Xray Version & Uptime */}
      {(node.xray_version || node.xray_uptime) && (
        <div className="mb-3 flex items-center gap-3 text-xs">
          {node.xray_version && (
            <span className="rounded bg-dark-700/50 px-2 py-1 text-dark-300">
              Xray {node.xray_version}
            </span>
          )}
          {node.xray_uptime && <span className="text-dark-500">Uptime: {node.xray_uptime}</span>}
        </div>
      )}

      {/* Error Message */}
      {hasError && (
        <div className="mb-3 rounded-lg border border-error-500/20 bg-error-500/10 p-2">
          <div className="flex items-start gap-2">
            <ExclamationIcon />
            <span className="break-all text-xs text-error-400">{node.last_status_message}</span>
          </div>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-dark-900/50 p-2.5">
          <div className="mb-0.5 text-xs text-dark-500">
            {t('adminDashboard.nodes.usersOnline')}
          </div>
          <div className="text-lg font-semibold text-dark-100">{node.users_online}</div>
        </div>
        <div className="rounded-lg bg-dark-900/50 p-2.5">
          <div className="mb-0.5 text-xs text-dark-500">{t('adminDashboard.nodes.traffic')}</div>
          <div className="text-lg font-semibold text-dark-100">
            {formatTraffic(node.traffic_used_bytes)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onToggle(node.uuid)}
          disabled={isLoading}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-500/20 px-3 py-2 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/30 disabled:opacity-50"
        >
          <RestartIcon />
        </button>
      </div>
    </div>
  );
}

function RevenueChart({ data }: { data: { date: string; amount_rubles: number }[] }) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-dark-500">
        {t('common.noData')}
      </div>
    );
  }

  const last7Days = data.slice(-7);
  const maxValue = Math.max(...last7Days.map((d) => d.amount_rubles), 1);

  return (
    <div className="space-y-3">
      {last7Days.map((item) => {
        const percentage = (item.amount_rubles / maxValue) * 100;
        const date = new Date(item.date);
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        const dayNum = date.getDate();

        return (
          <div key={item.date} className="group">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium capitalize text-dark-300">
                {dayName}, {dayNum}
              </span>
              <span className="text-sm font-semibold text-dark-100">
                {formatAmount(item.amount_rubles)} {currencySymbol}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-dark-700/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500 ease-out group-hover:from-accent-500 group-hover:to-accent-300"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { formatAmount, currencySymbol } = useCurrency();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showAllNodes, setShowAllNodes] = useState(false);

  // Extended stats
  const [referrers, setReferrers] = useState<TopReferrersResponse | null>(null);
  const [campaigns, setCampaigns] = useState<TopCampaignsResponse | null>(null);
  const [payments, setPayments] = useState<RecentPaymentsResponse | null>(null);
  const [referrersTab, setReferrersTab] = useState<'earnings' | 'invited'>('earnings');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statsApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(t('adminDashboard.loadError'));
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExtendedStats = async () => {
    try {
      const [referrersData, campaignsData, paymentsData] = await Promise.all([
        statsApi.getTopReferrers(10),
        statsApi.getTopCampaigns(10),
        statsApi.getRecentPayments(20),
      ]);
      setReferrers(referrersData);
      setCampaigns(campaignsData);
      setPayments(paymentsData);
    } catch (err) {
      console.error('Failed to load extended stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchExtendedStats();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchExtendedStats();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRestartNode = async (uuid: string) => {
    try {
      setActionLoading(uuid);
      await statsApi.restartNode(uuid);
      // Refresh stats after action
      setTimeout(fetchStats, 2000);
    } catch (err) {
      console.error('Failed to restart node:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleNode = async (uuid: string) => {
    try {
      setActionLoading(uuid);
      await statsApi.toggleNode(uuid);
      await fetchStats();
    } catch (err) {
      console.error('Failed to toggle node:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <div className="text-error-400">{error}</div>
        <button onClick={fetchStats} className="btn-primary">
          {t('common.loading')}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Show back button only on web, not in Telegram Mini App */}
          {!capabilities.hasBackButton && (
            <button
              onClick={() => navigate('/admin')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
            >
              <BackIcon />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{t('adminDashboard.title')}</h1>
            <p className="text-dark-400">{t('adminDashboard.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-dark-800 px-4 py-2 text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-100 disabled:opacity-50"
        >
          <RefreshIcon />
          {t('adminDashboard.refresh')}
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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
      <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-500/20 p-2.5 text-accent-400">
              <ServerIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('adminDashboard.nodes.title')}
              </h2>
              <p className="text-sm text-dark-400">
                {stats?.nodes.online || 0} {t('adminDashboard.nodes.online').toLowerCase()} /{' '}
                {stats?.nodes.total || 0} {t('adminDashboard.stats.total').toLowerCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="h-2 w-2 rounded-full bg-success-500"></span>
              {stats?.nodes.online || 0}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="h-2 w-2 rounded-full bg-error-500"></span>
              {stats?.nodes.offline || 0}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dark-400">
              <span className="h-2 w-2 rounded-full bg-dark-500"></span>
              {stats?.nodes.disabled || 0}
            </span>
          </div>
        </div>

        {stats?.nodes.nodes && stats.nodes.nodes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(showAllNodes ? stats.nodes.nodes : stats.nodes.nodes.slice(0, 3)).map((node) => (
                <NodeCard
                  key={node.uuid}
                  node={node}
                  onRestart={handleRestartNode}
                  onToggle={handleToggleNode}
                  isLoading={actionLoading === node.uuid}
                />
              ))}
            </div>
            {stats.nodes.nodes.length > 3 && (
              <button
                onClick={() => setShowAllNodes(!showAllNodes)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-dark-700/50 px-4 py-3 text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-100"
              >
                <span
                  className={`transform transition-transform ${showAllNodes ? 'rotate-180' : ''}`}
                >
                  <ChevronDownIcon />
                </span>
                {showAllNodes
                  ? t('adminDashboard.nodes.hide', { count: stats.nodes.nodes.length - 3 })
                  : t('adminDashboard.nodes.showMore', { count: stats.nodes.nodes.length - 3 })}
              </button>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-dark-500">{t('adminDashboard.nodes.noNodes')}</div>
        )}
      </div>

      {/* Revenue and Subscriptions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-warning-500/20 p-2.5 text-warning-400">
              <ChartBarIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('adminDashboard.revenue.title')}
              </h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.revenue.last7Days')}</p>
            </div>
          </div>
          <RevenueChart data={stats?.revenue_chart || []} />
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-dark-700 pt-4">
            <div>
              <div className="mb-1 text-xs text-dark-500">
                {t('adminDashboard.stats.incomeTotal')}
              </div>
              <div className="text-xl font-bold text-dark-100">
                {formatAmount(stats?.financial.income_total_rubles || 0)} {currencySymbol}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-dark-500">
                {t('adminDashboard.stats.subscriptionIncome')}
              </div>
              <div className="text-xl font-bold text-accent-400">
                {formatAmount(stats?.financial.subscription_income_rubles || 0)} {currencySymbol}
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Stats */}
        <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-accent-500/20 p-2.5 text-accent-400">
              <SparklesIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('adminDashboard.subscriptions.title')}
              </h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.subscriptions.subtitle')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-dark-900/50 p-4">
                <div className="mb-1 text-xs text-dark-500">
                  {t('adminDashboard.subscriptions.active')}
                </div>
                <div className="text-2xl font-bold text-success-400">
                  {stats?.subscriptions.active || 0}
                </div>
              </div>
              <div className="rounded-lg bg-dark-900/50 p-4">
                <div className="mb-1 text-xs text-dark-500">
                  {t('adminDashboard.subscriptions.trial')}
                </div>
                <div className="text-2xl font-bold text-warning-400">
                  {stats?.subscriptions.trial || 0}
                </div>
              </div>
              <div className="rounded-lg bg-dark-900/50 p-4">
                <div className="mb-1 text-xs text-dark-500">
                  {t('adminDashboard.subscriptions.paid')}
                </div>
                <div className="text-2xl font-bold text-accent-400">
                  {stats?.subscriptions.paid || 0}
                </div>
              </div>
              <div className="rounded-lg bg-dark-900/50 p-4">
                <div className="mb-1 text-xs text-dark-500">
                  {t('adminDashboard.subscriptions.expired')}
                </div>
                <div className="text-2xl font-bold text-error-400">
                  {stats?.subscriptions.expired || 0}
                </div>
              </div>
            </div>

            <div className="border-t border-dark-700 pt-4">
              <div className="mb-3 text-sm font-medium text-dark-300">
                {t('adminDashboard.subscriptions.newSubscriptions')}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">
                    {stats?.subscriptions.purchased_today || 0}
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('adminDashboard.subscriptions.today')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">
                    {stats?.subscriptions.purchased_week || 0}
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('adminDashboard.subscriptions.week')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-dark-100">
                    {stats?.subscriptions.purchased_month || 0}
                  </div>
                  <div className="text-xs text-dark-500">
                    {t('adminDashboard.subscriptions.month')}
                  </div>
                </div>
              </div>
            </div>

            {stats?.subscriptions.trial_to_paid_conversion !== undefined && (
              <div className="rounded-lg border border-accent-500/20 bg-accent-500/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-300">
                    {t('adminDashboard.subscriptions.conversion')}
                  </span>
                  <span className="text-lg font-bold text-accent-400">
                    {stats.subscriptions.trial_to_paid_conversion.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tariff Stats */}
      {stats?.tariff_stats && stats.tariff_stats.tariffs.length > 0 && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-5 backdrop-blur">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-success-500/20 p-2.5 text-success-400">
              <TagIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {t('adminDashboard.tariffs.title')}
              </h2>
              <p className="text-sm text-dark-400">{t('adminDashboard.tariffs.subtitle')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="px-2 py-3 text-left text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.tariffName')}
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.activeSubscriptions')}
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.trialSubscriptions')}
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.purchasedToday')}
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.purchasedWeek')}
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-dark-500">
                    {t('adminDashboard.tariffs.purchasedMonth')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.tariff_stats.tariffs.map((tariff) => (
                  <tr
                    key={tariff.tariff_id}
                    className="border-b border-dark-700/50 transition-colors hover:bg-dark-800/50"
                  >
                    <td className="px-2 py-3">
                      <span className="font-medium text-dark-100">{tariff.tariff_name}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-semibold text-success-400">
                        {tariff.active_subscriptions}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="font-semibold text-warning-400">
                        {tariff.trial_subscriptions}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-dark-200">{tariff.purchased_today}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-dark-200">{tariff.purchased_week}</span>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <span className="text-dark-200">{tariff.purchased_month}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extended Stats Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Referrers */}
        {referrers && (referrers.by_earnings.length > 0 || referrers.by_invited.length > 0) && (
          <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-4 backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400 sm:p-2.5">
                  <UsersIcon />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-dark-100 sm:text-lg">
                    {t('adminDashboard.topReferrers.title')}
                  </h2>
                  <p className="text-xs text-dark-400 sm:text-sm">
                    {referrers.total_referrers}{' '}
                    {t('adminDashboard.topReferrers.stats', { count: referrers.total_referrals })}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setReferrersTab('earnings')}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  referrersTab === 'earnings'
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-dark-700/50 text-dark-400 hover:text-dark-200'
                }`}
              >
                {t('adminDashboard.topReferrers.byEarnings')}
              </button>
              <button
                onClick={() => setReferrersTab('invited')}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                  referrersTab === 'invited'
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'bg-dark-700/50 text-dark-400 hover:text-dark-200'
                }`}
              >
                {t('adminDashboard.topReferrers.byInvited')}
              </button>
            </div>

            <div className="space-y-2">
              {(referrersTab === 'earnings' ? referrers.by_earnings : referrers.by_invited)
                .slice(0, 5)
                .map((ref, idx) => (
                  <div
                    key={ref.user_id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-dark-900/50 p-2 transition-colors hover:bg-dark-800/50 sm:p-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-dark-700 text-[10px] font-bold text-dark-300 sm:h-6 sm:w-6 sm:text-xs">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-dark-100 sm:text-sm">
                          {ref.display_name}
                        </div>
                        {ref.username && (
                          <div className="truncate text-[10px] text-dark-500 sm:text-xs">
                            @{ref.username}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {referrersTab === 'earnings' ? (
                        <>
                          <div className="text-xs font-semibold text-success-400 sm:text-sm">
                            {formatAmount(ref.earnings_total_kopeks / 100)} {currencySymbol}
                          </div>
                          <div className="text-[10px] text-dark-500 sm:text-xs">
                            {ref.invited_count} {t('adminDashboard.topReferrers.invites')}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-accent-400 sm:text-sm">
                            {ref.invited_count} {t('adminDashboard.topReferrers.people')}
                          </div>
                          <div className="text-[10px] text-dark-500 sm:text-xs">
                            {formatAmount(ref.earnings_total_kopeks / 100)} {currencySymbol}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Period Stats */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-dark-700 pt-4 sm:gap-3">
              <div className="text-center">
                <div className="mb-1 text-[10px] text-dark-500 sm:text-xs">
                  {t('adminDashboard.period.today')}
                </div>
                <div className="truncate text-xs font-semibold text-dark-200 sm:text-base">
                  {formatAmount(
                    (referrersTab === 'earnings'
                      ? referrers.by_earnings
                      : referrers.by_invited
                    ).reduce((sum, r) => sum + r.earnings_today_kopeks, 0) / 100,
                  )}{' '}
                  {currencySymbol}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-[10px] text-dark-500 sm:text-xs">
                  {t('adminDashboard.period.week')}
                </div>
                <div className="truncate text-xs font-semibold text-dark-200 sm:text-base">
                  {formatAmount(
                    (referrersTab === 'earnings'
                      ? referrers.by_earnings
                      : referrers.by_invited
                    ).reduce((sum, r) => sum + r.earnings_week_kopeks, 0) / 100,
                  )}{' '}
                  {currencySymbol}
                </div>
              </div>
              <div className="text-center">
                <div className="mb-1 text-[10px] text-dark-500 sm:text-xs">
                  {t('adminDashboard.period.month')}
                </div>
                <div className="truncate text-xs font-semibold text-dark-200 sm:text-base">
                  {formatAmount(
                    (referrersTab === 'earnings'
                      ? referrers.by_earnings
                      : referrers.by_invited
                    ).reduce((sum, r) => sum + r.earnings_month_kopeks, 0) / 100,
                  )}{' '}
                  {currencySymbol}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Campaigns */}
        {campaigns && campaigns.campaigns.length > 0 && (
          <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-4 backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center gap-2 sm:gap-3">
              <div className="rounded-lg bg-warning-500/20 p-2 text-warning-400 sm:p-2.5">
                <MegaphoneIcon />
              </div>
              <div>
                <h2 className="text-base font-semibold text-dark-100 sm:text-lg">
                  {t('adminDashboard.topCampaigns.title')}
                </h2>
                <p className="text-xs text-dark-400 sm:text-sm">
                  {campaigns.total_campaigns}{' '}
                  {t('adminDashboard.topCampaigns.stats', { count: campaigns.total_registrations })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {campaigns.campaigns.slice(0, 5).map((campaign, idx) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-dark-900/50 p-2 transition-colors hover:bg-dark-800/50 sm:p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-dark-700 text-[10px] font-bold text-dark-300 sm:h-6 sm:w-6 sm:text-xs">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-dark-100 sm:text-sm">
                        {campaign.name}
                      </div>
                      <div className="truncate text-[10px] text-dark-500 sm:text-xs">
                        ?start={campaign.start_parameter}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-semibold text-warning-400 sm:text-sm">
                      {formatAmount(campaign.total_revenue_kopeks / 100)} {currencySymbol}
                    </div>
                    <div className="text-[10px] text-dark-500 sm:text-xs">
                      {campaign.registrations} · {campaign.conversion_rate.toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-dark-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-dark-400 sm:text-sm">
                  {t('adminDashboard.topCampaigns.total')}
                </span>
                <span className="text-sm font-bold text-warning-400 sm:text-base">
                  {formatAmount(campaigns.total_revenue_kopeks / 100)} {currencySymbol}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      {payments && payments.payments.length > 0 && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/30 p-4 backdrop-blur sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success-500/20 p-2 text-success-400 sm:p-2.5">
                <BanknotesIcon />
              </div>
              <div>
                <h2 className="text-base font-semibold text-dark-100 sm:text-lg">
                  {t('adminDashboard.recentPayments.title')}
                </h2>
                <p className="text-xs text-dark-400 sm:text-sm">
                  {t('adminDashboard.recentPayments.today', {
                    amount: `${formatAmount(payments.total_today_kopeks / 100)} ${currencySymbol}`,
                  })}
                  <span className="hidden sm:inline">
                    {' '}
                    ·{' '}
                    {t('adminDashboard.recentPayments.week', {
                      amount: `${formatAmount(payments.total_week_kopeks / 100)} ${currencySymbol}`,
                    })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="px-2 py-3 text-left text-xs font-medium text-dark-500">
                    {t('adminDashboard.table.user')}
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-dark-500">
                    {t('adminDashboard.table.type')}
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-dark-500">
                    {t('adminDashboard.table.amount')}
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-dark-500">
                    {t('adminDashboard.table.method')}
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-dark-500">
                    {t('adminDashboard.table.date')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.payments.slice(0, 10).map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-dark-700/50 transition-colors hover:bg-dark-800/50"
                  >
                    <td className="px-2 py-3">
                      <div className="text-sm font-medium text-dark-100">
                        {payment.display_name}
                      </div>
                      {payment.username && (
                        <div className="text-xs text-dark-500">@{payment.username}</div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          payment.type === 'deposit'
                            ? 'bg-success-500/20 text-success-400'
                            : 'bg-accent-500/20 text-accent-400'
                        }`}
                      >
                        {payment.type_display}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="font-semibold text-dark-100">
                        {formatAmount(payment.amount_rubles)} {currencySymbol}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-xs text-dark-400">{payment.payment_method || '-'}</span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="text-xs text-dark-400">
                        {new Date(payment.created_at).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {payments.payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="rounded-lg bg-dark-900/50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] ${
                        payment.type === 'deposit'
                          ? 'bg-success-500/20 text-success-400'
                          : 'bg-accent-500/20 text-accent-400'
                      }`}
                    >
                      {payment.type_display}
                    </span>
                    <span className="truncate text-sm font-medium text-dark-100">
                      {payment.display_name}
                    </span>
                  </div>
                  <span className="ml-2 whitespace-nowrap text-sm font-semibold text-dark-100">
                    {formatAmount(payment.amount_rubles)} {currencySymbol}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-dark-500">
                  <span>{payment.payment_method || '-'}</span>
                  <span>
                    {new Date(payment.created_at).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
