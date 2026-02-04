import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminRemnawaveApi,
  NodeInfo,
  SquadWithLocalInfo,
  SystemStatsResponse,
  AutoSyncStatus,
} from '../api/adminRemnawave';
import { useBackButton } from '../platform/hooks/useBackButton';
import { usePlatform } from '../platform/hooks/usePlatform';
import {
  ServerIcon,
  ChartIcon,
  GlobeIcon,
  UsersIcon,
  SyncIcon,
  RefreshIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  RemnawaveIcon,
} from '../components/icons';

// ============ Icons ============

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

// ============ Helpers ============

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getCountryFlag = (code: string | null | undefined): string => {
  if (!code) return '🌍';
  const codeMap: Record<string, string> = {
    RU: '🇷🇺',
    US: '🇺🇸',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    UK: '🇬🇧',
    FR: '🇫🇷',
    FI: '🇫🇮',
    SE: '🇸🇪',
    NO: '🇳🇴',
    PL: '🇵🇱',
    TR: '🇹🇷',
    JP: '🇯🇵',
    SG: '🇸🇬',
    HK: '🇭🇰',
    KR: '🇰🇷',
    AU: '🇦🇺',
    CA: '🇨🇦',
    CH: '🇨🇭',
    AT: '🇦🇹',
    IT: '🇮🇹',
    ES: '🇪🇸',
    BR: '🇧🇷',
    IN: '🇮🇳',
    AE: '🇦🇪',
    IL: '🇮🇱',
    KZ: '🇰🇿',
    UA: '🇺🇦',
    CZ: '🇨🇿',
    RO: '🇷🇴',
    LV: '🇱🇻',
    LT: '🇱🇹',
    EE: '🇪🇪',
    BG: '🇧🇬',
    HU: '🇭🇺',
    MD: '🇲🇩',
  };
  return codeMap[code.toUpperCase()] || code;
};

// ============ Sub-Components ============

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subValue?: string;
}

function StatCard({ label, value, icon, color = 'accent', subValue }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    accent: 'bg-accent-500/20 text-accent-400',
    green: 'bg-success-500/20 text-success-400',
    blue: 'bg-accent-500/20 text-accent-400',
    orange: 'bg-warning-500/20 text-warning-400',
    red: 'bg-error-500/20 text-error-400',
    purple: 'bg-accent-500/20 text-accent-400',
  };

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-dark-400">{label}</p>
          <p className="text-lg font-semibold text-dark-100">{value}</p>
          {subValue && <p className="text-xs text-dark-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

interface NodeCardProps {
  node: NodeInfo;
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void;
  isLoading?: boolean;
}

function NodeCard({ node, onAction, isLoading }: NodeCardProps) {
  const { t } = useTranslation();

  const statusColor = node.is_disabled
    ? 'text-dark-500'
    : node.is_connected && node.is_node_online
      ? 'text-success-400'
      : 'text-error-400';

  const statusText = node.is_disabled
    ? t('admin.remnawave.nodes.disabled', 'Disabled')
    : node.is_connected && node.is_node_online
      ? t('admin.remnawave.nodes.online', 'Online')
      : t('admin.remnawave.nodes.offline', 'Offline');

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4 transition-colors hover:border-dark-600">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(node.country_code)}</span>
            <h3 className="truncate font-medium text-dark-100">{node.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor} bg-current/10`}>
              {statusText}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-dark-500">{node.address}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              {t('admin.remnawave.nodes.usersOnlineCount', '{{count}} online', {
                count: node.users_online ?? 0,
              })}
            </span>
            {node.traffic_used_bytes !== undefined && (
              <span>
                {formatBytes(node.traffic_used_bytes)}{' '}
                {t('admin.remnawave.nodes.trafficUsed', 'used')}
              </span>
            )}
            {node.xray_uptime && (
              <span>
                {t('admin.remnawave.nodes.uptimeLabel', 'Uptime')}: {node.xray_uptime}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-1.5">
          <button
            onClick={() => onAction(node.uuid, 'restart')}
            disabled={isLoading || node.is_disabled}
            className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('admin.remnawave.nodes.restart', 'Restart')}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAction(node.uuid, node.is_disabled ? 'enable' : 'disable')}
            disabled={isLoading}
            className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
              node.is_disabled
                ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                : 'bg-error-500/20 text-error-400 hover:bg-error-500/30'
            }`}
            title={
              node.is_disabled
                ? t('admin.remnawave.nodes.enable', 'Enable')
                : t('admin.remnawave.nodes.disable', 'Disable')
            }
          >
            {node.is_disabled ? <PlayIcon className="h-4 w-4" /> : <StopIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SquadCardProps {
  squad: SquadWithLocalInfo;
  onClick: () => void;
}

function SquadCard({ squad, onClick }: SquadCardProps) {
  const { t } = useTranslation();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-dark-700 bg-dark-800/50 p-4 transition-colors hover:border-dark-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCountryFlag(squad.country_code)}</span>
            <h3 className="truncate font-medium text-dark-100">
              {squad.display_name || squad.name}
            </h3>
            {squad.is_synced ? (
              <span className="rounded-full bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                {t('admin.remnawave.squads.synced', 'Synced')}
              </span>
            ) : (
              <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-xs text-warning-400">
                {t('admin.remnawave.squads.notSynced', 'Not synced')}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-xs text-dark-500">{squad.name}</p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400">
            <span className="flex items-center gap-1">
              <UsersIcon className="h-3.5 w-3.5" />
              {t('admin.remnawave.squads.membersCount', '{{count}} members', {
                count: squad.members_count,
              })}
            </span>
            {squad.current_users !== undefined && (
              <span>
                {squad.current_users} / {squad.max_users ?? '∞'}
              </span>
            )}
            <span>
              {t('admin.remnawave.squads.inboundsCount', '{{count}} inbounds', {
                count: squad.inbounds_count,
              })}
            </span>
            {squad.is_available !== undefined && (
              <span className={squad.is_available ? 'text-success-400' : 'text-error-400'}>
                {squad.is_available
                  ? `✓ ${t('admin.remnawave.squads.available', 'Available')}`
                  : `✗ ${t('admin.remnawave.squads.unavailable', 'Unavailable')}`}
              </span>
            )}
          </div>
        </div>

        <svg
          className="h-5 w-5 shrink-0 text-dark-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  );
}

interface SyncCardProps {
  title: string;
  description: string;
  onAction: () => void;
  isLoading?: boolean;
  lastResult?: { success: boolean; message?: string } | null;
}

function SyncCard({ title, description, onAction, isLoading, lastResult }: SyncCardProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-dark-100">{title}</h3>
          <p className="mt-1 text-xs text-dark-400">{description}</p>
          {lastResult && (
            <p
              className={`mt-2 text-xs ${lastResult.success ? 'text-success-400' : 'text-error-400'}`}
            >
              {lastResult.message}
            </p>
          )}
        </div>
        <button
          onClick={onAction}
          disabled={isLoading}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-accent-500/20 px-3 py-1.5 text-accent-400 transition-colors hover:bg-accent-500/30 disabled:opacity-50"
        >
          <RefreshIcon spinning={isLoading} />
          {isLoading
            ? t('admin.remnawave.sync.running', 'Running...')
            : t('admin.remnawave.sync.run', 'Run')}
        </button>
      </div>
    </div>
  );
}

// ============ Tab Components ============

interface OverviewTabProps {
  stats: SystemStatsResponse | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}

function OverviewTab({ stats, isLoading, onRefresh }: OverviewTabProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-dark-400">{t('admin.remnawave.noData', 'Failed to load data')}</p>
        <button onClick={onRefresh} className="btn-primary mt-4">
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  const memoryUsedPercent =
    stats.server_info.memory_total > 0
      ? Math.round((stats.server_info.memory_used / stats.server_info.memory_total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
          <ChartIcon className="h-4 w-4" />
          {t('admin.remnawave.overview.system', 'System')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            icon={<ServerIcon className="h-5 w-5" />}
            color="orange"
          />
        </div>
      </div>

      {/* Bandwidth */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-dark-300">
          {t('admin.remnawave.overview.bandwidth', 'Realtime Bandwidth')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <h3 className="mb-3 text-sm font-medium text-dark-300">
          {t('admin.remnawave.overview.server', 'Server')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
        <h3 className="mb-3 text-sm font-medium text-dark-300">
          {t('admin.remnawave.overview.traffic', 'Traffic Statistics')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label={t('admin.remnawave.overview.traffic2days', '2 days')}
            value={formatBytes(stats.traffic_periods.last_2_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.traffic7days', '7 days')}
            value={formatBytes(stats.traffic_periods.last_7_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="blue"
          />
          <StatCard
            label={t('admin.remnawave.overview.traffic30days', '30 days')}
            value={formatBytes(stats.traffic_periods.last_30_days.current)}
            icon={<span className="text-xs">📊</span>}
            color="green"
          />
          <StatCard
            label={t('admin.remnawave.overview.trafficMonth', 'Month')}
            value={formatBytes(stats.traffic_periods.current_month.current)}
            icon={<span className="text-xs">📊</span>}
            color="purple"
          />
          <StatCard
            label={t('admin.remnawave.overview.trafficYear', 'Year')}
            value={formatBytes(stats.traffic_periods.current_year.current)}
            icon={<span className="text-xs">📊</span>}
            color="orange"
          />
        </div>
      </div>

      {/* Users by Status */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-dark-300">
          {t('admin.remnawave.overview.usersByStatus', 'Users by Status')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Object.entries(stats.users_by_status).map(([status, count]) => (
            <StatCard
              key={status}
              label={status}
              value={count}
              icon={<UsersIcon className="h-4 w-4" />}
              color={status === 'ACTIVE' ? 'green' : status === 'DISABLED' ? 'red' : 'accent'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NodesTabProps {
  nodes: NodeInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void;
  onRestartAll: () => void;
  isActionLoading: boolean;
}

function NodesTab({
  nodes,
  isLoading,
  onRefresh,
  onAction,
  onRestartAll,
  isActionLoading,
}: NodesTabProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const total = nodes.length;
    const online = nodes.filter((n) => n.is_connected && n.is_node_online && !n.is_disabled).length;
    const offline = nodes.filter(
      (n) => (!n.is_connected || !n.is_node_online) && !n.is_disabled,
    ).length;
    const disabled = nodes.filter((n) => n.is_disabled).length;
    const totalUsers = nodes.reduce((acc, n) => acc + (n.users_online ?? 0), 0);
    return { total, online, offline, disabled, totalUsers };
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label={t('admin.remnawave.nodes.stats.total', 'Total')}
          value={stats.total}
          icon={<GlobeIcon />}
          color="accent"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.online', 'Online')}
          value={stats.online}
          icon={<GlobeIcon />}
          color="green"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.offline', 'Offline')}
          value={stats.offline}
          icon={<GlobeIcon />}
          color="red"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.disabled', 'Disabled')}
          value={stats.disabled}
          icon={<GlobeIcon />}
          color="accent"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.users', 'Users')}
          value={stats.totalUsers}
          icon={<UsersIcon />}
          color="blue"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg bg-dark-700 px-3 py-1.5 text-dark-300 transition-colors hover:bg-dark-600"
        >
          <RefreshIcon />
          {t('common.refresh', 'Refresh')}
        </button>
        <button
          onClick={onRestartAll}
          disabled={isActionLoading}
          className="flex items-center gap-2 rounded-lg bg-warning-500/20 px-3 py-1.5 text-warning-400 transition-colors hover:bg-warning-500/30 disabled:opacity-50"
        >
          <ArrowPathIcon />
          {t('admin.remnawave.nodes.restartAll', 'Restart All')}
        </button>
      </div>

      {/* Nodes List */}
      <div className="space-y-3">
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-dark-400">
            {t('admin.remnawave.nodes.noNodes', 'No nodes found')}
          </p>
        ) : (
          nodes.map((node) => (
            <NodeCard key={node.uuid} node={node} onAction={onAction} isLoading={isActionLoading} />
          ))
        )}
      </div>
    </div>
  );
}

interface SquadsTabProps {
  squads: SquadWithLocalInfo[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (uuid: string) => void;
  onSync: () => void;
  isSyncing: boolean;
}

function SquadsTab({
  squads,
  isLoading,
  onRefresh,
  onNavigate,
  onSync,
  isSyncing,
}: SquadsTabProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const total = squads.length;
    const synced = squads.filter((s) => s.is_synced).length;
    const available = squads.filter((s) => s.is_available).length;
    const totalMembers = squads.reduce((acc, s) => acc + s.members_count, 0);
    return { total, synced, available, totalMembers };
  }, [squads]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('admin.remnawave.squads.stats.total', 'Total')}
          value={stats.total}
          icon={<ServerIcon className="h-5 w-5" />}
          color="accent"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.synced', 'Synced')}
          value={stats.synced}
          icon={<SyncIcon />}
          color="green"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.available', 'Available')}
          value={stats.available}
          icon={<ServerIcon className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.members', 'Members')}
          value={stats.totalMembers}
          icon={<UsersIcon />}
          color="purple"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-lg bg-dark-700 px-3 py-1.5 text-dark-300 transition-colors hover:bg-dark-600"
        >
          <RefreshIcon />
          {t('common.refresh', 'Refresh')}
        </button>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 rounded-lg bg-accent-500/20 px-3 py-1.5 text-accent-400 transition-colors hover:bg-accent-500/30 disabled:opacity-50"
        >
          <RefreshIcon spinning={isSyncing} />
          {t('admin.remnawave.squads.syncServers', 'Sync Servers')}
        </button>
      </div>

      {/* Squads List */}
      <div className="space-y-3">
        {squads.length === 0 ? (
          <p className="py-8 text-center text-dark-400">
            {t('admin.remnawave.squads.noSquads', 'No squads found')}
          </p>
        ) : (
          squads.map((squad) => (
            <SquadCard key={squad.uuid} squad={squad} onClick={() => onNavigate(squad.uuid)} />
          ))
        )}
      </div>
    </div>
  );
}

interface SyncTabProps {
  autoSyncStatus: AutoSyncStatus | undefined;
  isLoading: boolean;
  onRunAutoSync: () => void;
  onSyncFromPanel: () => void;
  onSyncToPanel: () => void;
  syncResults: Record<string, { success: boolean; message?: string } | null>;
  loadingStates: Record<string, boolean>;
}

function SyncTab({
  autoSyncStatus,
  isLoading,
  onRunAutoSync,
  onSyncFromPanel,
  onSyncToPanel,
  syncResults,
  loadingStates,
}: SyncTabProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto Sync Status */}
      {autoSyncStatus && (
        <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-medium text-dark-100">
              <SyncIcon />
              {t('admin.remnawave.sync.autoSync', 'Auto Sync')}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                autoSyncStatus.enabled
                  ? 'bg-success-500/20 text-success-400'
                  : 'bg-dark-600 text-dark-400'
              }`}
            >
              {autoSyncStatus.enabled
                ? t('admin.remnawave.sync.enabled', 'Enabled')
                : t('admin.remnawave.sync.disabled', 'Disabled')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-dark-700/50 p-3">
              <p className="text-xs text-dark-500">
                {t('admin.remnawave.sync.schedule', 'Schedule')}
              </p>
              <p className="mt-1 text-dark-200">
                {autoSyncStatus.times.length > 0 ? autoSyncStatus.times.join(', ') : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <p className="text-xs text-dark-500">{t('admin.remnawave.sync.status', 'Status')}</p>
              <p
                className={`mt-1 ${
                  autoSyncStatus.is_running
                    ? 'text-warning-400'
                    : autoSyncStatus.last_run_success
                      ? 'text-success-400'
                      : 'text-dark-200'
                }`}
              >
                {autoSyncStatus.is_running
                  ? t('admin.remnawave.sync.running', 'Running...')
                  : autoSyncStatus.last_run_success
                    ? t('admin.remnawave.sync.success', 'Success')
                    : autoSyncStatus.last_run_error || '—'}
              </p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <p className="text-xs text-dark-500">
                {t('admin.remnawave.sync.lastRun', 'Last Run')}
              </p>
              <p className="mt-1 text-dark-200">
                {autoSyncStatus.last_run_finished_at
                  ? new Date(autoSyncStatus.last_run_finished_at).toLocaleString()
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <p className="text-xs text-dark-500">
                {t('admin.remnawave.sync.nextRun', 'Next Run')}
              </p>
              <p className="mt-1 text-dark-200">
                {autoSyncStatus.next_run ? new Date(autoSyncStatus.next_run).toLocaleString() : '—'}
              </p>
            </div>
          </div>

          <button
            onClick={onRunAutoSync}
            disabled={loadingStates.autoSync || autoSyncStatus.is_running}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500/20 px-4 py-2.5 text-sm font-medium text-accent-400 transition-colors hover:bg-accent-500/30 disabled:opacity-50"
          >
            <RefreshIcon spinning={loadingStates.autoSync || autoSyncStatus.is_running} />
            {autoSyncStatus.is_running
              ? t('admin.remnawave.sync.running', 'Running...')
              : t('admin.remnawave.sync.runAutoSyncNow', 'Run Auto Sync Now')}
          </button>
        </div>
      )}

      {/* Manual Sync */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SyncCard
          title={t('admin.remnawave.sync.fromPanel', 'Sync from Panel')}
          description={t(
            'admin.remnawave.sync.fromPanelDesc',
            'Import users from RemnaWave panel to bot',
          )}
          onAction={onSyncFromPanel}
          isLoading={loadingStates.fromPanel}
          lastResult={syncResults.fromPanel}
        />
        <SyncCard
          title={t('admin.remnawave.sync.toPanel', 'Sync to Panel')}
          description={t(
            'admin.remnawave.sync.toPanelDesc',
            'Export users from bot to RemnaWave panel',
          )}
          onAction={onSyncToPanel}
          isLoading={loadingStates.toPanel}
          lastResult={syncResults.toPanel}
        />
      </div>
    </div>
  );
}

// ============ Main Component ============

type TabType = 'overview' | 'nodes' | 'squads' | 'sync';

export default function AdminRemnawave() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Use native Telegram back button in Mini App
  useBackButton(() => navigate('/admin'));

  // State
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [syncResults, setSyncResults] = useState<
    Record<string, { success: boolean; message?: string } | null>
  >({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Queries
  const { data: status } = useQuery({
    queryKey: ['admin-remnawave-status'],
    queryFn: adminRemnawaveApi.getStatus,
  });

  const {
    data: systemStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-remnawave-system'],
    queryFn: adminRemnawaveApi.getSystemStats,
    enabled: activeTab === 'overview',
    refetchInterval: 30000,
  });

  const {
    data: nodesData,
    isLoading: isLoadingNodes,
    refetch: refetchNodes,
  } = useQuery({
    queryKey: ['admin-remnawave-nodes'],
    queryFn: adminRemnawaveApi.getNodes,
    enabled: activeTab === 'nodes',
    refetchInterval: 15000,
  });

  const {
    data: squadsData,
    isLoading: isLoadingSquads,
    refetch: refetchSquads,
  } = useQuery({
    queryKey: ['admin-remnawave-squads'],
    queryFn: adminRemnawaveApi.getSquads,
    enabled: activeTab === 'squads',
  });

  const { data: autoSyncStatus, isLoading: isLoadingAutoSync } = useQuery({
    queryKey: ['admin-remnawave-autosync'],
    queryFn: adminRemnawaveApi.getAutoSyncStatus,
    enabled: activeTab === 'sync',
    refetchInterval: 10000,
  });

  // Mutations
  const nodeActionMutation = useMutation({
    mutationFn: ({ uuid, action }: { uuid: string; action: 'enable' | 'disable' | 'restart' }) =>
      adminRemnawaveApi.nodeAction(uuid, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-nodes'] });
    },
  });

  const restartAllMutation = useMutation({
    mutationFn: adminRemnawaveApi.restartAllNodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-nodes'] });
    },
  });

  const syncServersMutation = useMutation({
    mutationFn: adminRemnawaveApi.syncServers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-remnawave-squads'] });
    },
  });

  // Handlers
  const handleNodeAction = (uuid: string, action: 'enable' | 'disable' | 'restart') => {
    nodeActionMutation.mutate({ uuid, action });
  };

  const handleRestartAll = () => {
    if (
      confirm(
        t('admin.remnawave.nodes.confirmRestartAll', 'Are you sure you want to restart all nodes?'),
      )
    ) {
      restartAllMutation.mutate();
    }
  };

  const handleSyncServers = () => {
    syncServersMutation.mutate();
  };

  const handleSyncAction = async (
    key: string,
    action: () => Promise<{ success?: boolean; started?: boolean; message?: string }>,
  ) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
    try {
      const result = await action();
      setSyncResults((prev) => ({
        ...prev,
        [key]: { success: result.success ?? result.started ?? false, message: result.message },
      }));
    } catch {
      setSyncResults((prev) => ({ ...prev, [key]: { success: false, message: 'Failed' } }));
    } finally {
      setLoadingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  const tabs = [
    {
      id: 'overview' as const,
      label: t('admin.remnawave.tabs.overview', 'Overview'),
      icon: <ChartIcon />,
    },
    { id: 'nodes' as const, label: t('admin.remnawave.tabs.nodes', 'Nodes'), icon: <GlobeIcon /> },
    {
      id: 'squads' as const,
      label: t('admin.remnawave.tabs.squads', 'Squads'),
      icon: <ServerIcon className="h-5 w-5" />,
    },
    { id: 'sync' as const, label: t('admin.remnawave.tabs.sync', 'Sync'), icon: <SyncIcon /> },
  ];

  const isConfigured = status?.is_configured;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
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
          <div className="rounded-lg bg-accent-500/20 p-2">
            <RemnawaveIcon className="h-6 w-6 text-accent-400" />
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
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
            isConfigured ? 'bg-success-500/20 text-success-400' : 'bg-error-500/20 text-error-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${isConfigured ? 'bg-success-400' : 'bg-error-400'}`}
          />
          {isConfigured
            ? t('admin.remnawave.connected', 'Connected')
            : t('admin.remnawave.disconnected', 'Not configured')}
        </div>
      </div>

      {/* Configuration Error */}
      {status?.configuration_error && (
        <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-4">
          <p className="text-sm text-error-400">{status.configuration_error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-dark-800/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-w-[80px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-500/20 text-accent-400'
                : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200'
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
          onNavigate={(uuid) => navigate(`/admin/remnawave/squads/${uuid}`)}
          onSync={handleSyncServers}
          isSyncing={syncServersMutation.isPending}
        />
      )}

      {activeTab === 'sync' && (
        <SyncTab
          autoSyncStatus={autoSyncStatus}
          isLoading={isLoadingAutoSync}
          onRunAutoSync={() => handleSyncAction('autoSync', adminRemnawaveApi.runAutoSync)}
          onSyncFromPanel={() =>
            handleSyncAction('fromPanel', () => adminRemnawaveApi.syncFromPanel('all'))
          }
          onSyncToPanel={() => handleSyncAction('toPanel', adminRemnawaveApi.syncToPanel)}
          syncResults={syncResults}
          loadingStates={loadingStates}
        />
      )}
    </div>
  );
}
