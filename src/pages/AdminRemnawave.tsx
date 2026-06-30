import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  adminRemnawaveApi,
  NodeInfo,
  NodeRealtimeStats,
  SquadWithLocalInfo,
  SystemStatsResponse,
  AutoSyncStatus,
  RecapResponse,
  DevicesStatsResponse,
  TopConsumersResponse,
  HealthResponse,
  SubscriptionRequestStatsResponse,
} from '../api/adminRemnawave';
import { usePlatform } from '../platform/hooks/usePlatform';
import { formatUptime } from '../utils/format';
import { getFlagEmoji } from '../utils/subscriptionHelpers';
import Twemoji from 'react-twemoji';
import { StatCard } from '../components/stats';
import {
  ServerIcon,
  ChartIcon,
  GlobeIcon,
  HeartbeatIcon,
  PowerIcon,
  WarningCircleIcon,
  CalendarIcon,
  CalendarBlankIcon,
  CalendarStarIcon,
  ChartPieIcon,
  ChartDonutIcon,
  CpuIcon,
  MemoryIcon,
  PulseIcon,
  DevicesIcon,
  StatUptimeIcon,
  UsersIcon,
  CheckCircleIcon,
  BanIcon,
  TrafficIcon,
  ClockIcon,
  SyncIcon,
  RefreshIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  RemnawaveIcon,
  XrayIcon,
  DownloadIcon,
  UploadIcon,
  SubscriptionIcon,
  BackIcon,
  ChevronRightIcon,
} from '../components/icons';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Алгоритмический ISO 3166-1 alpha-2 → regional indicator. Глобус-fallback
// сохранён для случая пустого кода (важно для UI-плейсхолдеров).
const getCountryFlag = (code: string | null | undefined): string => getFlagEmoji(code) || '🌍';

// The panel's provider.faviconLink is the provider's site URL (e.g.
// "https://waicore.com/"), not an image. Resolve it to an actual favicon
// image via Google's favicon service, the same way the panel renders it.
const providerFaviconUrl = (link: string | null | undefined): string | null => {
  if (!link) return null;
  try {
    const host = new URL(link).hostname;
    return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : null;
  } catch {
    return null;
  }
};

// Meaningful icon per Remnawave user status (instead of the same people glyph).
const userStatusIcon = (status: string): React.ReactNode => {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return <CheckCircleIcon className="h-4 w-4" />;
    case 'DISABLED':
      return <BanIcon className="h-4 w-4" />;
    case 'LIMITED':
      return <TrafficIcon className="h-4 w-4" />;
    case 'EXPIRED':
      return <ClockIcon className="h-4 w-4" />;
    default:
      return <UsersIcon className="h-4 w-4" />;
  }
};

// Realtime interface throughput (bytes/s) → network-style speed, matching the
// panel exactly: the unit step is by 1024 bytes, but the value is shown in bits
// (×8 / 1000), e.g. 341 KB/s → "2728 Kb/s", 1.34 MB/s → "10.72 Mb/s".
const formatSpeed = (bytesPerSec: number): string => {
  const bps = bytesPerSec || 0;
  const bits = bps * 8;
  if (bps < 1024) return `${bits.toFixed(0)} b/s`;
  if (bps < 1024 ** 2) return `${(bits / 1000).toFixed(2)} Kb/s`;
  if (bps < 1024 ** 3) return `${(bits / 1e6).toFixed(2)} Mb/s`;
  return `${(bits / 1e9).toFixed(2)} Gb/s`;
};

function NodeTrafficBreakdown({
  title,
  items,
}: {
  title: string;
  items: { tag: string; downloadBytes: number; uploadBytes: number; totalBytes: number }[];
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-dark-500">{title}</p>
      {[...items]
        .sort((a, b) => b.totalBytes - a.totalBytes)
        .map((it) => (
          <div
            key={it.tag}
            className="flex items-center justify-between gap-3 rounded-lg bg-dark-900/50 px-2.5 py-1.5"
          >
            <span className="min-w-0 flex-1 truncate text-xs text-dark-200">{it.tag}</span>
            <div className="flex shrink-0 gap-2.5 font-mono text-[11px] text-dark-400">
              <span>↓ {formatBytes(it.downloadBytes)}</span>
              <span>↑ {formatBytes(it.uploadBytes)}</span>
              <span className="font-medium text-dark-300">{formatBytes(it.totalBytes)}</span>
            </div>
          </div>
        ))}
    </div>
  );
}

interface NodeCardProps {
  node: NodeInfo;
  providerName?: string;
  realtime?: NodeRealtimeStats;
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void;
  isLoading?: boolean;
}

function NodeCard({ node, providerName, realtime, onAction, isLoading }: NodeCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const isUp = node.is_connected && node.is_node_online && !node.is_disabled;
  const dotColor = node.is_disabled ? 'bg-dark-500' : isUp ? 'bg-success-400' : 'bg-error-400';
  const statusText = node.is_disabled
    ? t('admin.remnawave.nodes.disabled', 'Disabled')
    : isUp
      ? t('admin.remnawave.nodes.online', 'Online')
      : t('admin.remnawave.nodes.offline', 'Offline');

  const s = node.system?.stats;
  const memTotal = s ? s.memoryUsed + s.memoryFree : 0;
  const ramPct = memTotal > 0 && s ? Math.round((s.memoryUsed / memTotal) * 100) : null;
  const loadAvg = s?.loadAvg?.length
    ? s.loadAvg
        .slice(0, 3)
        .map((n) => n.toFixed(2))
        .join('  ')
    : null;
  const rx = s?.interface?.rxBytesPerSec ?? 0;
  const tx = s?.interface?.txBytesPerSec ?? 0;

  const used = node.traffic_used_bytes ?? 0;
  const limit = node.traffic_limit_bytes ?? 0;
  const trafficPct = limit > 0 ? Math.min(100, (used / limit) * 100) : null;

  // Provider name: realtime metrics first, fall back to the node's own provider.
  const providerLabel = providerName || node.provider_name;
  const providerFavicon = providerFaviconUrl(node.provider_favicon);

  // Per-node traffic breakdown (merged from the former Traffic tab) — shown in
  // an accordion that toggles when the card is clicked.
  const inbounds = realtime?.inbounds ?? [];
  const outbounds = realtime?.outbounds ?? [];
  const hasBreakdown = inbounds.length + outbounds.length > 0;

  const ramColorClass =
    ramPct === null
      ? ''
      : ramPct > 85
        ? 'text-error-400'
        : ramPct > 65
          ? 'text-warning-400'
          : 'text-dark-400';

  return (
    <div
      className={`rounded-xl border border-dark-700 bg-dark-800/50 p-3.5 transition-colors hover:border-dark-600 ${
        hasBreakdown ? 'cursor-pointer' : ''
      }`}
      onClick={hasBreakdown ? () => setExpanded((v) => !v) : undefined}
    >
      {/* Identity + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${dotColor} ${isUp ? 'animate-pulse' : ''}`}
            title={statusText}
          />
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-dark-700/60 px-1.5 py-0.5 text-[11px] text-dark-300">
            <UsersIcon className="h-3 w-3" />
            {node.users_online ?? 0}
          </span>
          <span className="shrink-0 text-base leading-none">
            {getCountryFlag(node.country_code)}
          </span>
          <h3 className="truncate font-semibold text-dark-100">{node.name}</h3>
          {(providerLabel || providerFavicon) && (
            <span className="flex min-w-0 max-w-[7rem] shrink items-center gap-1 rounded-md bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent-300">
              {providerFavicon && (
                <img
                  src={providerFavicon}
                  alt=""
                  className="h-3 w-3 shrink-0 rounded-[2px]"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              {providerLabel && <span className="truncate">{providerLabel}</span>}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(node.uuid, 'restart');
            }}
            disabled={isLoading || node.is_disabled}
            className="rounded-lg bg-dark-700 p-1.5 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('admin.remnawave.nodes.restart', 'Restart')}
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(node.uuid, node.is_disabled ? 'enable' : 'disable');
            }}
            disabled={isLoading}
            className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
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
            {node.is_disabled ? (
              <PlayIcon className="h-3.5 w-3.5" />
            ) : (
              <StopIcon className="h-3.5 w-3.5" />
            )}
          </button>
          {hasBreakdown && (
            <ChevronRightIcon
              className={`h-4 w-4 text-dark-500 transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </div>
      </div>

      {/* Address + traffic + uptime */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-dark-400">
        <span className="flex min-w-0 max-w-full items-center gap-1 font-mono text-dark-500">
          <GlobeIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{node.address}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-dark-300">{formatBytes(used)}</span>
          {trafficPct !== null && (
            <span className="h-1 w-16 overflow-hidden rounded-full bg-dark-700">
              <span
                className="block h-full rounded-full bg-accent-500"
                style={{ width: `${trafficPct}%` }}
              />
            </span>
          )}
          <span className="text-dark-500">/ {limit > 0 ? formatBytes(limit) : '∞'}</span>
        </span>
        {node.xray_uptime > 0 && (
          <span className="flex items-center gap-1 text-dark-500">
            <StatUptimeIcon className="h-3 w-3" />
            {formatUptime(node.xray_uptime)}
          </span>
        )}
      </div>

      {/* Live metrics — mobile: 3 fixed rows so wrapping speeds don't reflow;
          desktop (sm+): the original single wrap row, wide enough not to jump. */}
      {(ramPct !== null || loadAvg || rx > 0 || tx > 0 || node.versions) && (
        <>
          {/* Mobile: processor · traffic · versions */}
          <div className="mt-2 space-y-1 border-t border-dark-700/60 pt-2 font-mono text-[10.5px] tabular-nums text-dark-500 sm:hidden">
            {(loadAvg || ramPct !== null) && (
              <div className="flex items-center gap-3">
                {loadAvg && (
                  <span className="flex items-center gap-1" title="load average 1 / 5 / 15 min">
                    <CpuIcon className="h-3 w-3 shrink-0 text-dark-500" />
                    {loadAvg}
                  </span>
                )}
                {ramPct !== null && (
                  <span className="flex items-center gap-1.5" title="RAM">
                    <MemoryIcon className="h-3 w-3 shrink-0 text-dark-500" />
                    <span className={ramColorClass}>{ramPct}%</span>
                    <span className="h-1 w-10 overflow-hidden rounded-full bg-dark-700">
                      <span
                        className="block h-full rounded-full bg-dark-400"
                        style={{ width: `${ramPct}%` }}
                      />
                    </span>
                  </span>
                )}
              </div>
            )}
            {(rx > 0 || tx > 0) && (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <DownloadIcon className="h-3 w-3 shrink-0 text-success-400/70" />
                  {formatSpeed(rx)}
                </span>
                <span className="flex items-center gap-1">
                  <UploadIcon className="h-3 w-3 shrink-0 text-accent-400/70" />
                  {formatSpeed(tx)}
                </span>
              </div>
            )}
            {(node.versions?.node || node.versions?.xray) && (
              <div className="flex items-center gap-3 text-dark-600">
                {node.versions?.node && (
                  <span className="flex items-center gap-1" title="remnanode">
                    <RemnawaveIcon className="h-3 w-3 shrink-0" />
                    {node.versions.node}
                  </span>
                )}
                {node.versions?.xray && (
                  <span className="flex items-center gap-1" title="xray core">
                    <XrayIcon className="h-3 w-3 shrink-0" />
                    {node.versions.xray}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop: single wrap row (original) */}
          <div className="mt-2 hidden flex-wrap items-center gap-x-3 gap-y-1 border-t border-dark-700/60 pt-2 font-mono text-[10.5px] tabular-nums text-dark-500 sm:flex">
            {ramPct !== null && (
              <span className="flex items-center gap-1.5" title="RAM">
                <MemoryIcon className="h-3 w-3 text-dark-500" />
                <span className={ramColorClass}>{ramPct}%</span>
                <span className="h-1 w-10 overflow-hidden rounded-full bg-dark-700">
                  <span
                    className="block h-full rounded-full bg-dark-400"
                    style={{ width: `${ramPct}%` }}
                  />
                </span>
              </span>
            )}
            {loadAvg && (
              <span className="flex items-center gap-1" title="load average 1 / 5 / 15 min">
                <CpuIcon className="h-3 w-3 text-dark-500" />
                {loadAvg}
              </span>
            )}
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-0.5">
                <DownloadIcon className="h-3 w-3 text-success-400/70" />
                {formatSpeed(rx)}
              </span>
              <span className="flex items-center gap-0.5">
                <UploadIcon className="h-3 w-3 text-accent-400/70" />
                {formatSpeed(tx)}
              </span>
            </span>
            {(node.versions?.node || node.versions?.xray) && (
              <span className="ml-auto flex items-center gap-2.5 text-dark-600">
                {node.versions?.node && (
                  <span className="flex items-center gap-1" title="remnanode">
                    <RemnawaveIcon className="h-3 w-3" />
                    {node.versions.node}
                  </span>
                )}
                {node.versions?.xray && (
                  <span className="flex items-center gap-1" title="xray core">
                    <XrayIcon className="h-3 w-3" />
                    {node.versions.xray}
                  </span>
                )}
              </span>
            )}
          </div>
        </>
      )}

      {/* Per-node traffic accordion (merged from the former Traffic tab) */}
      {expanded && hasBreakdown && (
        <div
          className="mt-3 space-y-3 border-t border-dark-700/60 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {inbounds.length > 0 && (
            <NodeTrafficBreakdown
              title={t('admin.remnawave.traffic.inbounds', 'Inbounds')}
              items={inbounds}
            />
          )}
          {outbounds.length > 0 && (
            <NodeTrafficBreakdown
              title={t('admin.remnawave.traffic.outbounds', 'Outbounds')}
              items={outbounds}
            />
          )}
        </div>
      )}
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
              <Twemoji options={{ className: 'twemoji', folder: 'svg', ext: '.svg' }}>
                {squad.display_name || squad.name}
              </Twemoji>
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

        <ChevronRightIcon className="h-5 w-5 shrink-0 text-dark-500" />
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

const formatUptimeSince = (iso: string): string => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (Number.isNaN(days)) return '—';
  if (days < 1) return '<1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
};

function BreakdownCard({
  title,
  items,
  wide = false,
}: {
  title: string;
  items: { label: string; count: number }[];
  wide?: boolean;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
      <h4 className="mb-3 text-sm font-medium text-dark-200">{title}</h4>
      <div className={wide ? 'grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2' : 'space-y-2'}>
        {items.slice(0, wide ? 16 : 8).map((it) => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-dark-300">{it.label}</span>
              <span className="ml-2 shrink-0 text-dark-400">{it.count}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-dark-700">
              <div
                className="h-1.5 rounded-full bg-accent-500"
                style={{ width: `${(it.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface OverviewTabProps {
  stats: SystemStatsResponse | undefined;
  recap?: RecapResponse;
  devicesStats?: DevicesStatsResponse;
  topConsumers?: TopConsumersResponse;
  health?: HealthResponse;
  subRequests?: SubscriptionRequestStatsResponse;
  isLoading: boolean;
  onRefresh: () => void;
}

function OverviewTab({
  stats,
  recap,
  devicesStats,
  topConsumers,
  health,
  subRequests,
  isLoading,
  onRefresh,
}: OverviewTabProps) {
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
          <StatCard
            label={t('admin.remnawave.overview.usersOnline', 'Users Online')}
            value={stats.system.users_online}
            icon={<UsersIcon />}
            tone="success"
          />
          <StatCard
            label={t('admin.remnawave.overview.totalUsers', 'Total Users')}
            value={stats.system.total_users}
            icon={<UsersIcon />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.nodesOnline', 'Nodes Online')}
            value={`${stats.system.nodes_online} / ${stats.system.total_nodes}`}
            icon={<GlobeIcon />}
            tone={stats.system.nodes_online < stats.system.total_nodes ? 'warning' : 'accent'}
          />
          <StatCard
            label={t('admin.remnawave.overview.active24h', 'Активны за 24ч')}
            value={stats.system.users_last_day}
            icon={<ServerIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>
      </div>

      {/* Bandwidth */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
          <ChartIcon className="h-4 w-4" />
          {t('admin.remnawave.overview.bandwidth', 'Inbound Traffic')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
          <StatCard
            label={t('admin.remnawave.overview.download', 'Download')}
            value={formatBytes(stats.bandwidth.realtime_download)}
            icon={<DownloadIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.remnawave.overview.upload', 'Upload')}
            value={formatBytes(stats.bandwidth.realtime_upload)}
            icon={<UploadIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.total', 'Total')}
            value={formatBytes(stats.bandwidth.realtime_total)}
            icon={<ChartIcon className="h-5 w-5" />}
            tone="accent"
          />
        </div>
      </div>

      {/* Server Info */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
          <ServerIcon className="h-4 w-4" />
          {t('admin.remnawave.overview.server', 'Server')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
          <StatCard
            label={t('admin.remnawave.overview.cpu', 'CPU Cores')}
            value={stats.server_info.cpu_cores}
            icon={<CpuIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.memory', 'Memory')}
            value={`${memoryUsedPercent}%`}
            subValue={`${formatBytes(stats.server_info.memory_used)} / ${formatBytes(stats.server_info.memory_total)}`}
            icon={<MemoryIcon className="h-5 w-5" />}
            tone={memoryUsedPercent > 80 ? 'error' : memoryUsedPercent > 60 ? 'warning' : 'success'}
          />
          <StatCard
            label={t('admin.remnawave.overview.uptime', 'Uptime')}
            value={formatUptime(stats.server_info.uptime_seconds)}
            icon={<StatUptimeIcon className="h-5 w-5" />}
            tone="accent"
          />
        </div>
      </div>

      {/* Traffic Periods */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
          <ChartIcon className="h-4 w-4" />
          {t('admin.remnawave.overview.traffic', 'Traffic Statistics')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
          <StatCard
            label={t('admin.remnawave.overview.traffic2days', '2 days')}
            value={formatBytes(stats.traffic_periods.last_2_days.current)}
            icon={<CalendarIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.traffic7days', '7 days')}
            value={formatBytes(stats.traffic_periods.last_7_days.current)}
            icon={<ChartDonutIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.traffic30days', '30 days')}
            value={formatBytes(stats.traffic_periods.last_30_days.current)}
            icon={<ChartPieIcon className="h-5 w-5" />}
            tone="success"
          />
          <StatCard
            label={t('admin.remnawave.overview.trafficMonth', 'Month')}
            value={formatBytes(stats.traffic_periods.current_month.current)}
            icon={<CalendarBlankIcon className="h-5 w-5" />}
            tone="accent"
          />
          <StatCard
            label={t('admin.remnawave.overview.trafficYear', 'Year')}
            value={formatBytes(stats.traffic_periods.current_year.current)}
            icon={<CalendarStarIcon className="h-5 w-5" />}
            tone="warning"
          />
        </div>
      </div>

      {/* Users by Status */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
          <UsersIcon className="h-4 w-4" />
          {t('admin.remnawave.overview.usersByStatus', 'Users by Status')}
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
          {Object.entries(stats.users_by_status).map(([status, count]) => (
            <StatCard
              key={status}
              label={status}
              value={count}
              icon={userStatusIcon(status)}
              tone={status === 'ACTIVE' ? 'success' : status === 'DISABLED' ? 'error' : 'accent'}
            />
          ))}
        </div>
      </div>

      {/* Panel recap */}
      {recap && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
            <RemnawaveIcon className="h-4 w-4" />
            {t('admin.remnawave.overview.panel', 'Панель')}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
            <StatCard
              label={t('admin.remnawave.overview.lifetimeTraffic', 'Трафик за всё время')}
              value={formatBytes(recap.total.traffic_bytes)}
              icon={<ChartIcon className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label={t('admin.remnawave.overview.thisMonthTraffic', 'Трафик за месяц')}
              value={formatBytes(recap.this_month.traffic_bytes)}
              icon={<ChartIcon className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label={t('admin.remnawave.overview.countries', 'Стран')}
              value={recap.total.distinct_countries}
              icon={<GlobeIcon className="h-5 w-5" />}
              tone="success"
            />
            <StatCard
              label={t('admin.remnawave.overview.panelVersion', 'Версия панели')}
              value={recap.version || '—'}
              subValue={
                recap.init_date
                  ? `${t('admin.remnawave.overview.uptime', 'аптайм')} ${formatUptimeSince(recap.init_date)}`
                  : undefined
              }
              icon={<ServerIcon className="h-5 w-5" />}
              tone="accent"
            />
          </div>
        </div>
      )}

      {/* Devices breakdown */}
      {devicesStats && (devicesStats.by_platform.length > 0 || devicesStats.by_app.length > 0) && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
            <DevicesIcon className="h-4 w-4" />
            {t('admin.remnawave.overview.devices', 'Устройства')} ·{' '}
            {devicesStats.total_hwid_devices} ({devicesStats.average_devices_per_user.toFixed(1)}/
            {t('admin.remnawave.overview.perUser', 'юзер')})
          </h3>
          <div className="grid gap-3 lg:grid-cols-3">
            <BreakdownCard
              title={t('admin.remnawave.overview.byPlatform', 'По платформам')}
              items={devicesStats.by_platform.map((p) => ({ label: p.platform, count: p.count }))}
            />
            <BreakdownCard
              title={t('admin.remnawave.overview.byApp', 'По приложениям')}
              items={devicesStats.by_app.map((a) => ({ label: a.app, count: a.count }))}
            />
            {devicesStats.top_users.length > 0 && (
              <BreakdownCard
                title={t('admin.remnawave.overview.topByDevices', 'Топ по устройствам')}
                items={devicesStats.top_users.map((u) => ({
                  label: u.username,
                  count: u.devices_count,
                }))}
              />
            )}
          </div>
        </div>
      )}

      {/* Top consumers */}
      {topConsumers && topConsumers.users.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
            <ChartIcon className="h-4 w-4" />
            {t('admin.remnawave.overview.topConsumers', 'Топ потребителей')} ·{' '}
            {topConsumers.period_days}
            {t('admin.remnawave.overview.daysShort', 'д')}
          </h3>
          <div className="divide-y divide-dark-700 rounded-xl border border-dark-700 bg-dark-800/50">
            {topConsumers.users.map((u, i) => (
              <div
                key={u.username}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="w-5 shrink-0 text-dark-500">{i + 1}</span>
                  <span className="truncate text-dark-100">{u.username}</span>
                </span>
                <span className="shrink-0 font-medium text-accent-400">
                  {formatBytes(u.total_bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel health */}
      {health && health.instances > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
            <ServerIcon className="h-4 w-4" />
            {t('admin.remnawave.overview.panelHealth', 'Здоровье панели')}
            {health.instances > 1 ? ` · ${health.instances}` : ''}
          </h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
            <StatCard
              label={t('admin.remnawave.overview.panelRam', 'RAM процесса')}
              value={formatBytes(health.rss_bytes)}
              icon={<MemoryIcon className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label={t('admin.remnawave.overview.heap', 'Heap')}
              value={formatBytes(health.heap_used_bytes)}
              subValue={`/ ${formatBytes(health.heap_total_bytes)}`}
              icon={<ChartIcon className="h-5 w-5" />}
              tone="accent"
            />
            <StatCard
              label={t('admin.remnawave.overview.eventLoopP99', 'Event-loop p99')}
              value={`${health.event_loop_p99_ms.toFixed(1)} ms`}
              icon={<PulseIcon className="h-5 w-5" />}
              tone={health.event_loop_p99_ms > 50 ? 'error' : 'success'}
            />
            <StatCard
              label={t('admin.remnawave.overview.panelUptime', 'Аптайм панели')}
              value={formatUptime(health.uptime_seconds)}
              icon={<StatUptimeIcon className="h-5 w-5" />}
              tone="accent"
            />
          </div>
        </div>
      )}

      {/* Subscription requests by app */}
      {subRequests && subRequests.by_app.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-dark-300">
            <SubscriptionIcon className="h-4 w-4" />
            {t('admin.remnawave.overview.subRequests', 'Запросы подписки (по клиентам)')} ·{' '}
            {subRequests.by_app.reduce((acc, a) => acc + a.count, 0)}
          </h3>
          <BreakdownCard
            wide
            title={t('admin.remnawave.overview.byApp', 'По приложениям')}
            items={subRequests.by_app.map((a) => ({ label: a.app, count: a.count }))}
          />
        </div>
      )}
    </div>
  );
}

interface NodesTabProps {
  nodes: NodeInfo[];
  providerByUuid: Record<string, string>;
  realtimeByUuid: Record<string, NodeRealtimeStats>;
  isLoading: boolean;
  onRefresh: () => void;
  onAction: (uuid: string, action: 'enable' | 'disable' | 'restart') => void;
  onRestartAll: () => void;
  isActionLoading: boolean;
}

function NodesTab({
  nodes,
  providerByUuid,
  realtimeByUuid,
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

  const traffic = useMemo(() => {
    const vals = Object.values(realtimeByUuid);
    const download = vals.reduce((a, n) => a + (n.downloadBytes ?? 0), 0);
    const upload = vals.reduce((a, n) => a + (n.uploadBytes ?? 0), 0);
    return { download, upload, total: download + upload };
  }, [realtimeByUuid]);

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
        <StatCard
          label={t('admin.remnawave.nodes.stats.total', 'Total')}
          value={stats.total}
          icon={<ServerIcon />}
          tone="accent"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.online', 'Online')}
          value={stats.online}
          icon={<HeartbeatIcon />}
          tone="success"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.offline', 'Offline')}
          value={stats.offline}
          icon={<WarningCircleIcon />}
          tone="error"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.disabled', 'Disabled')}
          value={stats.disabled}
          icon={<PowerIcon />}
          tone="accent"
        />
        <StatCard
          label={t('admin.remnawave.nodes.stats.users', 'Users')}
          value={stats.totalUsers}
          icon={<UsersIcon />}
          tone="accent"
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

      {/* Realtime traffic totals (merged from the former Traffic tab) */}
      {traffic.total > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-dark-400">
          <span className="font-medium text-dark-300">
            {t('admin.remnawave.traffic.realtimeTitle', 'Realtime traffic')}
          </span>
          <span className="flex items-center gap-1">
            <DownloadIcon className="h-3 w-3 text-success-400/70" />
            {formatBytes(traffic.download)}
          </span>
          <span className="flex items-center gap-1">
            <UploadIcon className="h-3 w-3 text-accent-400/70" />
            {formatBytes(traffic.upload)}
          </span>
          <span className="text-dark-300">
            {'Σ'} {formatBytes(traffic.total)}
          </span>
        </div>
      )}

      {/* Nodes List */}
      <div className="space-y-3">
        {nodes.length === 0 ? (
          <p className="py-8 text-center text-dark-400">
            {t('admin.remnawave.nodes.noNodes', 'No nodes found')}
          </p>
        ) : (
          nodes.map((node) => (
            <NodeCard
              key={node.uuid}
              node={node}
              providerName={providerByUuid[node.uuid]}
              realtime={realtimeByUuid[node.uuid]}
              onAction={onAction}
              isLoading={isActionLoading}
            />
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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
        <StatCard
          label={t('admin.remnawave.squads.stats.total', 'Total')}
          value={stats.total}
          icon={<ServerIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.synced', 'Synced')}
          value={stats.synced}
          icon={<SyncIcon />}
          tone="success"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.available', 'Available')}
          value={stats.available}
          icon={<ServerIcon className="h-5 w-5" />}
          tone="accent"
        />
        <StatCard
          label={t('admin.remnawave.squads.stats.members', 'Members')}
          value={stats.totalMembers}
          icon={<UsersIcon />}
          tone="accent"
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
            'Import users from Remnawave panel to bot',
          )}
          onAction={onSyncFromPanel}
          isLoading={loadingStates.fromPanel}
          lastResult={syncResults.fromPanel}
        />
        <SyncCard
          title={t('admin.remnawave.sync.toPanel', 'Sync to Panel')}
          description={t(
            'admin.remnawave.sync.toPanelDesc',
            'Export users from bot to Remnawave panel',
          )}
          onAction={onSyncToPanel}
          isLoading={loadingStates.toPanel}
          lastResult={syncResults.toPanel}
        />
      </div>
    </div>
  );
}

type TabType = 'overview' | 'nodes' | 'squads' | 'sync';

export default function AdminRemnawave() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

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

  const { data: recap } = useQuery({
    queryKey: ['admin-remnawave-recap'],
    queryFn: adminRemnawaveApi.getRecap,
    enabled: activeTab === 'overview',
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const { data: devicesStats } = useQuery({
    queryKey: ['admin-remnawave-devices-stats'],
    queryFn: adminRemnawaveApi.getDevicesStats,
    enabled: activeTab === 'overview',
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const { data: topConsumers } = useQuery({
    queryKey: ['admin-remnawave-top-consumers'],
    queryFn: () => adminRemnawaveApi.getTopConsumers(7, 10),
    enabled: activeTab === 'overview',
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const { data: health } = useQuery({
    queryKey: ['admin-remnawave-health'],
    queryFn: adminRemnawaveApi.getHealth,
    enabled: activeTab === 'overview',
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const { data: subRequests } = useQuery({
    queryKey: ['admin-remnawave-sub-requests'],
    queryFn: adminRemnawaveApi.getSubscriptionRequests,
    enabled: activeTab === 'overview',
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const {
    data: nodesData,
    isLoading: isLoadingNodes,
    refetch: refetchNodes,
  } = useQuery({
    queryKey: ['admin-remnawave-nodes'],
    queryFn: adminRemnawaveApi.getNodes,
    enabled: activeTab === 'nodes',
    // Fast poll so realtime metrics (RAM, load, speeds) stay live like the panel.
    refetchInterval: 5000,
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

  const { data: realtimeData } = useQuery({
    queryKey: ['admin-remnawave-realtime'],
    queryFn: adminRemnawaveApi.getNodesRealtime,
    // Realtime carries the provider name + per-node inbound/outbound breakdown
    // that the Nodes tab shows (provider badge + the per-node traffic accordion).
    enabled: activeTab === 'nodes',
    refetchInterval: 10000,
  });

  // Provider name (e.g. "WAICORE") only comes through the realtime stats; map it
  // by node uuid so the Nodes tab can show the provider badge like the panel.
  const providerByUuid = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of realtimeData ?? []) {
      if (r.providerName) map[r.nodeUuid] = r.providerName;
    }
    return map;
  }, [realtimeData]);

  // Full realtime stats by node uuid — feeds the per-node traffic accordion
  // (inbounds/outbounds) merged into the Nodes tab.
  const realtimeByUuid = useMemo(() => {
    const map: Record<string, NodeRealtimeStats> = {};
    for (const r of realtimeData ?? []) map[r.nodeUuid] = r;
    return map;
  }, [realtimeData]);

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
              <BackIcon className="text-dark-400" />
            </button>
          )}
          <div className="rounded-lg bg-accent-500/20 p-2">
            <RemnawaveIcon className="h-6 w-6 text-accent-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">
              {t('admin.remnawave.title', 'Remnawave')}
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
          recap={recap}
          devicesStats={devicesStats}
          topConsumers={topConsumers}
          health={health}
          subRequests={subRequests}
          isLoading={isLoadingStats}
          onRefresh={() => refetchStats()}
        />
      )}

      {activeTab === 'nodes' && (
        <NodesTab
          nodes={nodesData?.items || []}
          providerByUuid={providerByUuid}
          realtimeByUuid={realtimeByUuid}
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
