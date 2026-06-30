import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { AdminBackButton } from '../components/admin/AdminBackButton';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { StatCard } from '@/components/stats';
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
  type BanSettingsResponse,
  type BanSettingDefinition,
  type BanTrafficResponse,
  type BanReportResponse,
  type BanHealthResponse,
} from '../api/banSystem';

import {
  ShieldIcon,
  UsersIcon,
  BanIcon,
  ServerIcon,
  AgentIcon,
  WarningIcon,
  RefreshIcon,
  ChartIcon,
  SearchIcon,
  SettingsIcon,
  TrafficIcon,
  ReportIcon,
  HealthIcon,
  ExclamationIcon,
  BackIcon,
  XIcon,
  ClockIcon,
  StatusIcon,
} from '@/components/icons';

type TabType =
  | 'dashboard'
  | 'users'
  | 'punishments'
  | 'nodes'
  | 'agents'
  | 'violations'
  | 'settings'
  | 'traffic'
  | 'reports'
  | 'health';

export default function AdminBanSystem() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [status, setStatus] = useState<BanSystemStatus | null>(null);
  const [stats, setStats] = useState<BanSystemStats | null>(null);
  const [users, setUsers] = useState<BanUsersListResponse | null>(null);
  const [selectedUser, setSelectedUser] = useState<BanUserDetailResponse | null>(null);
  const userDetailRef = useFocusTrap<HTMLDivElement>(selectedUser !== null, {
    onEscape: () => setSelectedUser(null),
  });
  const [punishments, setPunishments] = useState<BanPunishmentsListResponse | null>(null);
  const [nodes, setNodes] = useState<BanNodesListResponse | null>(null);
  const [agents, setAgents] = useState<BanAgentsListResponse | null>(null);
  const [violations, setViolations] = useState<BanTrafficViolationsResponse | null>(null);
  const [settings, setSettings] = useState<BanSettingsResponse | null>(null);
  const [traffic, setTraffic] = useState<BanTrafficResponse | null>(null);
  const [report, setReport] = useState<BanReportResponse | null>(null);
  const [health, setHealth] = useState<BanHealthResponse | null>(null);
  const [reportHours, setReportHours] = useState(24);
  const [settingLoading, setSettingLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Format snake_case to readable label
  const formatSettingKey = useCallback(
    (key: string): string => {
      // Try translation first
      const translated = t(`banSystem.settings.${key}`, { defaultValue: '' });
      if (translated && translated !== `banSystem.settings.${key}`) {
        return translated;
      }
      // Fallback: convert snake_case to Title Case
      return key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    },
    [t],
  );

  const formatCategory = useCallback(
    (category: string): string => {
      const translated = t(`banSystem.settings.categories.${category}`, { defaultValue: '' });
      if (translated && translated !== `banSystem.settings.categories.${category}`) {
        return translated;
      }
      return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
    },
    [t],
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // React Query: status once at mount; each tab fetches lazily via `enabled`.
  // Caching means switching tabs returns to cached data instantly (with background revalidate).
  const statusQuery = useQuery({
    queryKey: ['ban-status'] as const,
    queryFn: () => banSystemApi.getStatus(),
  });
  const isReady = !!(status?.enabled && status?.configured);

  const dashboardQuery = useQuery({
    queryKey: ['ban-stats'] as const,
    queryFn: () => banSystemApi.getStats(),
    enabled: isReady && activeTab === 'dashboard',
  });
  const usersQuery = useQuery({
    queryKey: ['ban-users'] as const,
    queryFn: () => banSystemApi.getUsers({ limit: 50 }),
    enabled: isReady && activeTab === 'users',
  });
  const punishmentsQuery = useQuery({
    queryKey: ['ban-punishments'] as const,
    queryFn: () => banSystemApi.getPunishments(),
    enabled: isReady && activeTab === 'punishments',
  });
  const nodesQuery = useQuery({
    queryKey: ['ban-nodes'] as const,
    queryFn: () => banSystemApi.getNodes(),
    enabled: isReady && activeTab === 'nodes',
  });
  const agentsQuery = useQuery({
    queryKey: ['ban-agents'] as const,
    queryFn: () => banSystemApi.getAgents(),
    enabled: isReady && activeTab === 'agents',
  });
  const violationsQuery = useQuery({
    queryKey: ['ban-violations'] as const,
    queryFn: () => banSystemApi.getTrafficViolations(),
    enabled: isReady && activeTab === 'violations',
  });
  const settingsQuery = useQuery({
    queryKey: ['ban-settings'] as const,
    queryFn: () => banSystemApi.getSettings(),
    enabled: isReady && activeTab === 'settings',
  });
  const trafficQuery = useQuery({
    queryKey: ['ban-traffic'] as const,
    queryFn: () => banSystemApi.getTraffic(),
    enabled: isReady && activeTab === 'traffic',
  });
  const reportsQuery = useQuery({
    queryKey: ['ban-report', reportHours] as const,
    queryFn: () => banSystemApi.getReport(reportHours),
    enabled: isReady && activeTab === 'reports',
  });
  const healthQuery = useQuery({
    queryKey: ['ban-health'] as const,
    queryFn: () => banSystemApi.getHealth(),
    enabled: isReady && activeTab === 'health',
  });

  // Sync query data into the existing state vars so the JSX + handlers stay unchanged
  // (handleSearch overrides `users` with search results; useEffect re-syncs on next refetch).
  useEffect(() => {
    if (statusQuery.data) {
      setStatus(statusQuery.data);
      if (!statusQuery.data.enabled || !statusQuery.data.configured) {
        setError(t('banSystem.notConfigured'));
      }
    }
    if (statusQuery.isError) setError(t('banSystem.loadError'));
  }, [statusQuery.data, statusQuery.isError, t]);

  useEffect(() => {
    if (dashboardQuery.data) setStats(dashboardQuery.data);
  }, [dashboardQuery.data]);
  useEffect(() => {
    if (usersQuery.data) setUsers(usersQuery.data);
  }, [usersQuery.data]);
  useEffect(() => {
    if (punishmentsQuery.data) setPunishments(punishmentsQuery.data);
  }, [punishmentsQuery.data]);
  useEffect(() => {
    if (nodesQuery.data) setNodes(nodesQuery.data);
  }, [nodesQuery.data]);
  useEffect(() => {
    if (agentsQuery.data) setAgents(agentsQuery.data);
  }, [agentsQuery.data]);
  useEffect(() => {
    if (violationsQuery.data) setViolations(violationsQuery.data);
  }, [violationsQuery.data]);
  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);
  useEffect(() => {
    if (trafficQuery.data) setTraffic(trafficQuery.data);
  }, [trafficQuery.data]);
  useEffect(() => {
    if (reportsQuery.data) setReport(reportsQuery.data);
  }, [reportsQuery.data]);
  useEffect(() => {
    if (healthQuery.data) setHealth(healthQuery.data);
  }, [healthQuery.data]);

  // Map activeTab → its query (used for `loading` derivation and refetchActiveTab below).
  const activeTabQuery =
    activeTab === 'dashboard'
      ? dashboardQuery
      : activeTab === 'users'
        ? usersQuery
        : activeTab === 'punishments'
          ? punishmentsQuery
          : activeTab === 'nodes'
            ? nodesQuery
            : activeTab === 'agents'
              ? agentsQuery
              : activeTab === 'violations'
                ? violationsQuery
                : activeTab === 'settings'
                  ? settingsQuery
                  : activeTab === 'traffic'
                    ? trafficQuery
                    : activeTab === 'reports'
                      ? reportsQuery
                      : healthQuery;

  // Derive `loading` from status + active tab query.
  useEffect(() => {
    setLoading(statusQuery.isLoading || activeTabQuery.isFetching);
    if (activeTabQuery.isError) setError(t('banSystem.loadError'));
  }, [statusQuery.isLoading, activeTabQuery.isFetching, activeTabQuery.isError, t]);

  const refetchActiveTab = useCallback(() => {
    void activeTabQuery.refetch();
  }, [activeTabQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      void usersQuery.refetch();
      return;
    }
    try {
      setLoading(true);
      const data = await banSystemApi.searchUsers(searchQuery);
      setUsers(data);
    } catch {
      setError(t('banSystem.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (email: string) => {
    try {
      setActionLoading(email);
      const data = await banSystemApi.getUser(email);
      setSelectedUser(data);
    } catch {
      setError(t('banSystem.loadError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      setActionLoading(userId);
      await banSystemApi.unbanUser(userId);
      void punishmentsQuery.refetch();
    } catch {
      setError(t('banSystem.loadError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSetting = async (key: string) => {
    try {
      setSettingLoading(key);
      await banSystemApi.toggleSetting(key);
      void settingsQuery.refetch();
    } catch {
      setError(t('banSystem.loadError'));
    } finally {
      setSettingLoading(null);
    }
  };

  const handleSetSetting = async (key: string, value: string) => {
    try {
      setSettingLoading(key);
      await banSystemApi.setSetting(key, value);
      void settingsQuery.refetch();
    } catch {
      setError(t('banSystem.loadError'));
    } finally {
      setSettingLoading(null);
    }
  };

  const handleReportPeriodChange = (hours: number) => {
    setReportHours(hours);
  };

  // (reports query auto-refetches when reportHours changes — it's in the queryKey)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const tabs = [
    {
      id: 'dashboard' as TabType,
      label: t('banSystem.tabs.dashboard'),
      icon: <ChartIcon className="h-5 w-5" />,
    },
    { id: 'users' as TabType, label: t('banSystem.tabs.users'), icon: <UsersIcon /> },
    { id: 'punishments' as TabType, label: t('banSystem.tabs.punishments'), icon: <BanIcon /> },
    { id: 'nodes' as TabType, label: t('banSystem.tabs.nodes'), icon: <ServerIcon /> },
    { id: 'agents' as TabType, label: t('banSystem.tabs.agents'), icon: <AgentIcon /> },
    { id: 'violations' as TabType, label: t('banSystem.tabs.violations'), icon: <WarningIcon /> },
    { id: 'traffic' as TabType, label: t('banSystem.tabs.traffic'), icon: <TrafficIcon /> },
    { id: 'reports' as TabType, label: t('banSystem.tabs.reports'), icon: <ReportIcon /> },
    { id: 'settings' as TabType, label: t('banSystem.tabs.settings'), icon: <SettingsIcon /> },
    { id: 'health' as TabType, label: t('banSystem.tabs.health'), icon: <HealthIcon /> },
  ];

  if (loading && !status) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !status?.enabled) {
    return (
      <div className="flex min-h-[60vh] animate-fade-in items-center justify-center">
        <div className="mx-4 w-full max-w-md">
          {/* Card */}
          <div className="rounded-2xl border border-dark-700 bg-dark-800/50 p-8 text-center shadow-2xl backdrop-blur-xl">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-error-500/20 to-warning-500/20">
                  <ExclamationIcon className="h-10 w-10 text-error-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-dark-600 bg-dark-800">
                  <SettingsIcon className="h-3.5 w-3.5 text-dark-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="mb-2 text-xl font-bold text-dark-100">{t('banSystem.title')}</h2>

            {/* Error message */}
            <p className="mb-2 font-medium text-error-400">{error}</p>

            {/* Hint */}
            <p className="mb-8 text-sm text-dark-400">{t('banSystem.configureHint')}</p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              {/* Telegram Button */}
              <a
                href="https://t.me/fringg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0088cc] to-[#0099dd] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-[#0077bb] hover:to-[#0088cc] hover:shadow-lg hover:shadow-[#0088cc]/20"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                {t('banSystem.contactTelegram')}
              </a>

              {/* Back Button */}
              <button
                onClick={() => window.history.back()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dark-600 bg-dark-700 px-4 py-2 text-sm font-medium text-dark-200 transition-all duration-200 hover:border-dark-500 hover:bg-dark-600 hover:text-dark-100"
              >
                <BackIcon className="h-5 w-5" />
                {t('common.back')}
              </button>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -left-20 top-1/4 h-40 w-40 rounded-full bg-accent-500/5 blur-3xl" />
            <div className="absolute -right-20 bottom-1/4 h-40 w-40 rounded-full bg-error-500/5 blur-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton />
          <div className="rounded-xl bg-error-500/20 p-3">
            <ShieldIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{t('banSystem.title')}</h1>
            <p className="text-dark-400">{t('banSystem.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={refetchActiveTab}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-dark-800 px-4 py-2 text-dark-300 transition-colors hover:bg-dark-700 hover:text-dark-100 disabled:opacity-50"
        >
          <RefreshIcon className="h-5 w-5" />
          {t('common.refresh')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-dark-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="py-8 text-center text-error-400">{error}</div>
      ) : (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && stats && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                label={t('banSystem.stats.activeUsers')}
                value={stats.active_users}
                subValue={`${t('banSystem.stats.total')}: ${stats.total_users}`}
                icon={<UsersIcon className="h-5 w-5" />}
                tone="success"
              />
              <StatCard
                label={t('banSystem.stats.usersOverLimit')}
                value={stats.users_over_limit}
                icon={<WarningIcon className="h-5 w-5" />}
                tone="warning"
              />
              <StatCard
                label={t('banSystem.stats.activeBans')}
                value={stats.active_punishments}
                subValue={`${t('banSystem.stats.total')}: ${stats.total_punishments}`}
                icon={<BanIcon className="h-5 w-5" />}
                tone="error"
              />
              <StatCard
                label={t('banSystem.stats.nodesOnline')}
                value={`${stats.nodes_online}/${stats.nodes_total}`}
                icon={<ServerIcon className="h-5 w-5" />}
                tone="accent"
              />
              <StatCard
                label={t('banSystem.stats.agentsOnline')}
                value={`${stats.agents_online}/${stats.agents_total}`}
                icon={<AgentIcon className="h-5 w-5" />}
                tone="accent"
              />
              <StatCard
                label={t('banSystem.stats.totalRequests')}
                value={stats.total_requests.toLocaleString()}
                icon={<ChartIcon className="h-5 w-5" />}
                tone="accent"
              />
              <StatCard
                label={t('banSystem.stats.panelStatus')}
                value={
                  stats.panel_connected
                    ? t('banSystem.stats.connected')
                    : t('banSystem.stats.disconnected')
                }
                icon={<StatusIcon className="h-5 w-5" />}
                tone={stats.panel_connected ? 'success' : 'error'}
              />
              <StatCard
                label={t('banSystem.stats.uptime')}
                value={formatUptime(stats.uptime_seconds)}
                icon={<ClockIcon className="h-5 w-5" />}
                tone="accent"
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
                    className="input pl-10"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="rounded-lg bg-accent-500/20 px-4 py-2 text-accent-400 transition-colors hover:bg-accent-500/30"
                >
                  {t('common.search')}
                </button>
              </div>

              {/* Users Table */}
              <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                        {t('banSystem.users.email')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.users.ipCount')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.users.limit')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.users.status')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.users.bans')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-dark-500">
                        {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.users.map((user) => (
                      <tr
                        key={user.email}
                        className="border-b border-dark-700/50 hover:bg-dark-800/50"
                      >
                        <td className="px-4 py-3 text-dark-100">{user.email}</td>
                        <td className="px-4 py-3 text-center text-dark-300">
                          {user.unique_ip_count}
                        </td>
                        <td className="px-4 py-3 text-center text-dark-300">{user.limit ?? '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              user.is_over_limit
                                ? 'bg-error-500/20 text-error-400'
                                : 'bg-success-500/20 text-success-400'
                            }`}
                          >
                            {user.is_over_limit
                              ? t('banSystem.users.overLimit')
                              : t('banSystem.users.ok')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-dark-300">
                          {user.blocked_count}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleViewUser(user.email)}
                            disabled={actionLoading === user.email}
                            className="text-sm text-accent-400 hover:text-accent-300 disabled:opacity-50"
                          >
                            {t('banSystem.users.viewDetails')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!users?.users || users.users.length === 0) && (
                  <div className="py-8 text-center text-dark-500">{t('common.noData')}</div>
                )}
              </div>
            </div>
          )}

          {/* Punishments Tab */}
          {activeTab === 'punishments' && (
            <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.user')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.reason')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.ipCount')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.limit')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.bannedAt')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.punishments.enableAt')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-dark-500">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {punishments?.punishments.map((p) => (
                    <tr
                      key={p.user_id}
                      className="border-b border-dark-700/50 hover:bg-dark-800/50"
                    >
                      <td className="px-4 py-3">
                        <div className="text-dark-100">{p.username}</div>
                        <div className="text-xs text-dark-500">{p.user_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-300">{p.reason || '-'}</td>
                      <td className="px-4 py-3 text-center text-error-400">{p.ip_count}</td>
                      <td className="px-4 py-3 text-center text-dark-300">{p.limit}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark-300">
                        {formatDate(p.punished_at)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-dark-300">
                        {formatDate(p.enable_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUnban(p.user_id)}
                          disabled={actionLoading === p.user_id}
                          className="rounded-lg bg-success-500/20 px-3 py-1 text-sm text-success-400 transition-colors hover:bg-success-500/30 disabled:opacity-50"
                        >
                          {t('banSystem.punishments.unban')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!punishments?.punishments || punishments.punishments.length === 0) && (
                <div className="py-8 text-center text-dark-500">
                  {t('banSystem.punishments.noBans')}
                </div>
              )}
            </div>
          )}

          {/* Nodes Tab */}
          {activeTab === 'nodes' && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {nodes?.nodes.map((node) => (
                <div
                  key={node.name}
                  className={`rounded-xl border bg-dark-800/50 p-4 ${
                    node.is_connected ? 'border-success-500/30' : 'border-dark-700'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${node.is_connected ? 'animate-pulse bg-success-500' : 'bg-dark-500'}`}
                    />
                    <div>
                      <div className="font-medium text-dark-100">{node.name}</div>
                      <div className="text-xs text-dark-500">{node.address || '-'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-dark-900/50 p-2.5">
                      <div className="text-xs text-dark-500">{t('banSystem.nodes.status')}</div>
                      <div
                        className={`text-sm font-medium ${node.is_connected ? 'text-success-400' : 'text-dark-400'}`}
                      >
                        {node.is_connected
                          ? t('banSystem.nodes.online')
                          : t('banSystem.nodes.offline')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-dark-900/50 p-2.5">
                      <div className="text-xs text-dark-500">{t('banSystem.nodes.users')}</div>
                      <div className="text-sm font-medium text-dark-100">{node.users_count}</div>
                    </div>
                  </div>
                </div>
              ))}
              {(!nodes?.nodes || nodes.nodes.length === 0) && (
                <div className="col-span-full py-8 text-center text-dark-500">
                  {t('banSystem.nodes.noNodes')}
                </div>
              )}
            </div>
          )}

          {/* Agents Tab */}
          {activeTab === 'agents' && (
            <div className="space-y-4">
              {/* Summary */}
              {agents?.summary && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <StatCard
                    label={t('banSystem.agents.online')}
                    value={`${agents.summary.online_agents}/${agents.summary.total_agents}`}
                    icon={<AgentIcon className="h-5 w-5" />}
                    tone="success"
                  />
                  <StatCard
                    label={t('banSystem.agents.totalSent')}
                    value={agents.summary.total_sent.toLocaleString()}
                    icon={<ChartIcon className="h-5 w-5" />}
                    tone="accent"
                  />
                  <StatCard
                    label={t('banSystem.agents.totalDropped')}
                    value={agents.summary.total_dropped.toLocaleString()}
                    icon={<WarningIcon className="h-5 w-5" />}
                    tone="warning"
                  />
                  <StatCard
                    label={t('banSystem.agents.healthy')}
                    value={agents.summary.healthy_count}
                    subValue={`${t('banSystem.agents.warning')}: ${agents.summary.warning_count}, ${t('banSystem.agents.critical')}: ${agents.summary.critical_count}`}
                    icon={<AgentIcon className="h-5 w-5" />}
                    tone="accent"
                  />
                </div>
              )}

              {/* Agents List */}
              <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700">
                      <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                        {t('banSystem.agents.node')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.agents.status')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.agents.health')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.agents.sent')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.agents.dropped')}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                        {t('banSystem.agents.queue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents?.agents.map((agent) => (
                      <tr
                        key={agent.node_name}
                        className="border-b border-dark-700/50 hover:bg-dark-800/50"
                      >
                        <td className="px-4 py-3 text-dark-100">{agent.node_name}</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              agent.is_online
                                ? 'bg-success-500/20 text-success-400'
                                : 'bg-dark-600 text-dark-400'
                            }`}
                          >
                            {agent.is_online
                              ? t('banSystem.agents.online')
                              : t('banSystem.agents.offline')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${
                              agent.health === 'healthy'
                                ? 'bg-success-500/20 text-success-400'
                                : agent.health === 'warning'
                                  ? 'bg-warning-500/20 text-warning-400'
                                  : agent.health === 'critical'
                                    ? 'bg-error-500/20 text-error-400'
                                    : 'bg-dark-600 text-dark-400'
                            }`}
                          >
                            {agent.health}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-dark-300">
                          {agent.sent_total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-warning-400">
                          {agent.dropped_total.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-dark-300">
                          {agent.queue_size}/{agent.queue_max}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!agents?.agents || agents.agents.length === 0) && (
                  <div className="py-8 text-center text-dark-500">
                    {t('banSystem.agents.noAgents')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Violations Tab */}
          {activeTab === 'violations' && (
            <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                      {t('banSystem.violations.user')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                      {t('banSystem.violations.type')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                      {t('banSystem.violations.description')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.violations.detectedAt')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                      {t('banSystem.violations.status')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {violations?.violations.map((v, idx) => (
                    <tr key={idx} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                      <td className="px-4 py-3">
                        <div className="text-dark-100">{v.username}</div>
                        <div className="text-xs text-dark-500">{v.email || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-warning-400">{v.violation_type}</td>
                      <td className="px-4 py-3 text-sm text-dark-300">{v.description || '-'}</td>
                      <td className="px-4 py-3 text-center text-sm text-dark-300">
                        {formatDate(v.detected_at)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            v.resolved
                              ? 'bg-success-500/20 text-success-400'
                              : 'bg-warning-500/20 text-warning-400'
                          }`}
                        >
                          {v.resolved
                            ? t('banSystem.violations.resolved')
                            : t('banSystem.violations.active')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!violations?.violations || violations.violations.length === 0) && (
                <div className="py-8 text-center text-dark-500">
                  {t('banSystem.violations.noViolations')}
                </div>
              )}
            </div>
          )}

          {/* Traffic Tab */}
          {activeTab === 'traffic' && traffic && (
            <div className="space-y-4">
              {/* Traffic Stats */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard
                  label={t('banSystem.traffic.enabled')}
                  value={traffic.enabled ? t('common.yes') : t('common.no')}
                  icon={<TrafficIcon className="h-5 w-5" />}
                  tone={traffic.enabled ? 'success' : 'warning'}
                />
              </div>

              {/* Top Users by Traffic */}
              {traffic.top_users && traffic.top_users.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
                  <div className="border-b border-dark-700 p-4">
                    <h3 className="text-sm font-medium text-dark-200">
                      {t('banSystem.traffic.topUsers')}
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                          {t('banSystem.traffic.username')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                          {t('banSystem.traffic.bytesTotal')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                          {t('banSystem.traffic.bytesLimit')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                          {t('banSystem.traffic.status')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {traffic.top_users.map((user, idx) => (
                        <tr key={idx} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                          <td className="px-4 py-3 text-dark-100">{user.username}</td>
                          <td className="px-4 py-3 text-center text-dark-300">
                            {formatBytes(user.bytes_total)}
                          </td>
                          <td className="px-4 py-3 text-center text-dark-300">
                            {user.bytes_limit ? formatBytes(user.bytes_limit) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`rounded-full px-2 py-1 text-xs ${
                                user.over_limit
                                  ? 'bg-error-500/20 text-error-400'
                                  : 'bg-success-500/20 text-success-400'
                              }`}
                            >
                              {user.over_limit
                                ? t('banSystem.traffic.overLimit')
                                : t('banSystem.traffic.ok')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Recent Violations */}
              {traffic.recent_violations && traffic.recent_violations.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
                  <div className="border-b border-dark-700 p-4">
                    <h3 className="text-sm font-medium text-dark-200">
                      {t('banSystem.traffic.recentViolations')}
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                          {t('banSystem.violations.user')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                          {t('banSystem.violations.type')}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                          {t('banSystem.violations.detectedAt')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {traffic.recent_violations.map((v, idx) => (
                        <tr key={idx} className="border-b border-dark-700/50 hover:bg-dark-800/50">
                          <td className="px-4 py-3 text-dark-100">{v.username}</td>
                          <td className="px-4 py-3 text-warning-400">{v.violation_type}</td>
                          <td className="px-4 py-3 text-center text-sm text-dark-300">
                            {formatDate(v.detected_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(!traffic.top_users || traffic.top_users.length === 0) &&
                (!traffic.recent_violations || traffic.recent_violations.length === 0) && (
                  <div className="py-8 text-center text-dark-500">{t('common.noData')}</div>
                )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {/* Period Selector */}
              <div className="flex items-center gap-4">
                <span className="text-dark-400">{t('banSystem.reports.period')}:</span>
                <div className="flex gap-2">
                  {[6, 12, 24, 48, 72].map((hours) => (
                    <button
                      key={hours}
                      onClick={() => handleReportPeriodChange(hours)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        reportHours === hours
                          ? 'bg-accent-500/20 text-accent-400'
                          : 'bg-dark-800 text-dark-400 hover:text-dark-200'
                      }`}
                    >
                      {hours}h
                    </button>
                  ))}
                </div>
              </div>

              {report && (
                <>
                  {/* Report Stats */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <StatCard
                      label={t('banSystem.reports.currentUsers')}
                      value={report.current_users}
                      icon={<UsersIcon className="h-5 w-5" />}
                      tone="accent"
                    />
                    <StatCard
                      label={t('banSystem.reports.currentIps')}
                      value={report.current_ips}
                      icon={<ServerIcon className="h-5 w-5" />}
                      tone="accent"
                    />
                  </div>

                  {/* Top Violators */}
                  {report.top_violators && report.top_violators.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50">
                      <div className="border-b border-dark-700 p-4">
                        <h3 className="text-sm font-medium text-dark-200">
                          {t('banSystem.reports.topViolators')}
                        </h3>
                      </div>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-dark-700">
                            <th className="px-4 py-3 text-left text-xs font-medium text-dark-500">
                              {t('banSystem.reports.username')}
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-dark-500">
                              {t('banSystem.reports.count')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.top_violators.map((v, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-dark-700/50 hover:bg-dark-800/50"
                            >
                              <td className="px-4 py-3 text-dark-100">{v.username}</td>
                              <td className="px-4 py-3 text-center text-warning-400">{v.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && settings && (
            <div className="space-y-4">
              {/* Group settings by category */}
              {(() => {
                const grouped: Record<string, BanSettingDefinition[]> = {};

                // Smart categorization: use API category or infer from key prefix
                const inferCategory = (key: string, apiCategory: string | null): string => {
                  if (apiCategory) return apiCategory;
                  if (key.startsWith('punishment_') || key.startsWith('progressive_ban'))
                    return 'punishment';
                  if (key.startsWith('traffic_')) return 'traffic';
                  if (key.startsWith('network_')) return 'network';
                  if (key.startsWith('rate_limit_')) return 'rate_limit';
                  if (key.startsWith('notify_') || key.startsWith('daily_report'))
                    return 'notifications';
                  return 'general';
                };

                settings.settings.forEach((s) => {
                  const cat = inferCategory(s.key, s.category);
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(s);
                });

                // Sort categories in logical order
                const categoryOrder = [
                  'general',
                  'punishment',
                  'progressive_bans',
                  'traffic',
                  'network',
                  'notifications',
                  'rate_limit',
                ];
                const sortedCategories = Object.keys(grouped).sort((a, b) => {
                  const aIdx = categoryOrder.indexOf(a);
                  const bIdx = categoryOrder.indexOf(b);
                  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
                  if (aIdx === -1) return 1;
                  if (bIdx === -1) return -1;
                  return aIdx - bIdx;
                });

                return sortedCategories.map((category) => (
                  <div
                    key={category}
                    className="overflow-hidden rounded-xl border border-dark-700 bg-dark-800/50"
                  >
                    <div className="border-b border-dark-700 p-4">
                      <h3 className="text-sm font-medium text-dark-200">
                        {formatCategory(category)}
                      </h3>
                    </div>
                    <div className="divide-y divide-dark-700">
                      {grouped[category].map((setting) => (
                        <div
                          key={setting.key}
                          className="flex items-center justify-between gap-4 p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-dark-100">
                              {formatSettingKey(setting.key)}
                            </div>
                            {setting.description && (
                              <div className="mt-0.5 text-xs text-dark-500">
                                {setting.description}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {setting.type === 'bool' ? (
                              <button
                                onClick={() => handleToggleSetting(setting.key)}
                                disabled={!setting.editable || settingLoading === setting.key}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  setting.value ? 'bg-accent-500' : 'bg-dark-600'
                                } ${!setting.editable ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    setting.value ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            ) : setting.type === 'int' ? (
                              <input
                                type="number"
                                value={String(setting.value)}
                                onChange={(e) => handleSetSetting(setting.key, e.target.value)}
                                min={setting.min_value ?? undefined}
                                max={setting.max_value ?? undefined}
                                disabled={!setting.editable || settingLoading === setting.key}
                                className="input w-24"
                              />
                            ) : setting.type === 'list' ? (
                              <div className="flex max-w-xs flex-wrap justify-end gap-1.5">
                                {Array.isArray(setting.value) && setting.value.length > 0 ? (
                                  setting.value.map((item, idx) => (
                                    <span
                                      key={idx}
                                      className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400"
                                    >
                                      {String(item)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-dark-500">
                                    {t('common.noData')}
                                  </span>
                                )}
                                {setting.editable && nodes && setting.key.includes('nodes') && (
                                  <select
                                    className="input py-1 text-xs"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        const currentList = Array.isArray(setting.value)
                                          ? setting.value
                                          : [];
                                        if (!currentList.includes(e.target.value)) {
                                          handleSetSetting(
                                            setting.key,
                                            [...currentList, e.target.value].join(','),
                                          );
                                        }
                                        e.target.value = '';
                                      }
                                    }}
                                    disabled={settingLoading === setting.key}
                                  >
                                    <option value="">+ {t('common.add')}</option>
                                    {nodes.nodes
                                      .filter(
                                        (n) =>
                                          !Array.isArray(setting.value) ||
                                          !setting.value.includes(n.name),
                                      )
                                      .map((n) => (
                                        <option key={n.name} value={n.name}>
                                          {n.name}
                                        </option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-dark-300">{String(setting.value)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && health && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-4 w-4 rounded-full ${
                        health.status === 'healthy'
                          ? 'animate-pulse bg-success-500'
                          : health.status === 'degraded'
                            ? 'animate-pulse bg-warning-500'
                            : 'animate-pulse bg-error-500'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-dark-100">
                        {t('banSystem.health.systemStatus')}
                      </div>
                      <div
                        className={`text-sm ${
                          health.status === 'healthy'
                            ? 'text-success-400'
                            : health.status === 'degraded'
                              ? 'text-warning-400'
                              : 'text-error-400'
                        }`}
                      >
                        {health.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  {health.uptime !== null && (
                    <div className="text-right">
                      <div className="text-xs text-dark-500">{t('banSystem.stats.uptime')}</div>
                      <div className="text-dark-100">{formatUptime(health.uptime)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Components Status */}
              {health.components && health.components.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {health.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border bg-dark-800/50 p-4 ${
                        comp.status === 'healthy'
                          ? 'border-success-500/30'
                          : comp.status === 'degraded'
                            ? 'border-warning-500/30'
                            : 'border-error-500/30'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            comp.status === 'healthy'
                              ? 'bg-success-500'
                              : comp.status === 'degraded'
                                ? 'bg-warning-500'
                                : 'bg-error-500'
                          }`}
                        />
                        <div className="font-medium text-dark-100">{comp.name}</div>
                      </div>
                      <div
                        className={`text-sm ${
                          comp.status === 'healthy'
                            ? 'text-success-400'
                            : comp.status === 'degraded'
                              ? 'text-warning-400'
                              : 'text-error-400'
                        }`}
                      >
                        {comp.status}
                      </div>
                      {comp.message && (
                        <div className="mt-1 text-xs text-dark-500">{comp.message}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            ref={userDetailRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-user-detail-title"
            tabIndex={-1}
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-dark-700 bg-dark-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dark-700 p-4">
              <h3 id="ban-user-detail-title" className="text-lg font-semibold text-dark-100">
                {t('banSystem.userDetail.title')}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                aria-label={t('common.close')}
                className="text-dark-400 hover:text-dark-200"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-4">
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
                <h4 className="mb-2 text-sm font-medium text-dark-200">
                  {t('banSystem.userDetail.ipHistory')}
                </h4>
                <div className="overflow-hidden rounded-lg bg-dark-900/50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-700">
                        <th className="px-3 py-2 text-left text-xs text-dark-500">
                          {t('banSystem.userDetail.ip')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-dark-500">
                          {t('banSystem.userDetail.country')}
                        </th>
                        <th className="px-3 py-2 text-left text-xs text-dark-500">
                          {t('banSystem.userDetail.node')}
                        </th>
                        <th className="px-3 py-2 text-center text-xs text-dark-500">
                          {t('banSystem.userDetail.requests')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUser.ips.map((ip, idx) => (
                        <tr key={idx} className="border-b border-dark-700/50">
                          <td className="px-3 py-2 text-dark-100">{ip.ip}</td>
                          <td className="px-3 py-2 text-dark-300">
                            {ip.country_name || ip.country_code || '-'}
                          </td>
                          <td className="px-3 py-2 text-dark-300">{ip.node || '-'}</td>
                          <td className="px-3 py-2 text-center text-dark-300">
                            {ip.request_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedUser.ips.length === 0 && (
                    <div className="py-4 text-center text-dark-500">{t('common.noData')}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
