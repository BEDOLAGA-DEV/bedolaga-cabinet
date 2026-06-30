import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { usePermissionStore } from '@/store/permissions';
import { statsApi, type SystemInfo, type DashboardStats } from '@/api/admin';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { cn } from '@/lib/utils';
import {
  ArrowUpIcon,
  BroadcastIcon,
  CabinetIcon,
  ChartBarIcon,
  ChevronRightIcon,
  ClipboardIcon,
  CreditCardIcon,
  FileTextIcon,
  GiftIcon,
  HistoryIcon,
  LockIcon,
  MailIcon,
  MegaphoneIcon,
  NewsIcon,
  PartnerIcon,
  PercentIcon,
  PinIcon,
  RemnawaveIcon,
  SearchIcon,
  SendIcon,
  ServerIcon,
  SettingsIcon,
  ShareIcon,
  ShieldIcon,
  SparklesIcon,
  StatBotIcon,
  StatCabinetIcon,
  StatPaidIcon,
  StatsChartIcon,
  StatTrialIcon,
  StatUptimeIcon,
  SyncIcon,
  TagIcon,
  TicketIcon,
  TrafficIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  WheelIcon,
  XIcon,
} from '@/components/icons';

const CABINET_VERSION = __APP_VERSION__;
const IS_MAC = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);

// Section nav icons (24x24 viewBox)
const icons = {
  'bar-chart': <ChartBarIcon />,
  'credit-card': <CreditCardIcon />,
  activity: <TrafficIcon />,
  trending: <StatsChartIcon />,
  users: <UsersIcon />,
  ticket: <TicketIcon />,
  'shield-alert': <ShieldIcon />,
  tag: <TagIcon />,
  gift: <GiftIcon />,
  percent: <PercentIcon />,
  sparkle: <SparklesIcon />,
  wallet: <WalletIcon />,
  layout: <CabinetIcon />,
  newspaper: <NewsIcon />,
  megaphone: <MegaphoneIcon />,
  send: <SendIcon />,
  pin: <PinIcon />,
  'circle-dot': <WheelIcon />,
  handshake: <PartnerIcon />,
  'arrow-up': <ArrowUpIcon />,
  network: <ShareIcon />,
  radio: <BroadcastIcon />,
  settings: <SettingsIcon />,
  app: <CabinetIcon />,
  server: <ServerIcon />,
  remnawave: <RemnawaveIcon />,
  mail: <MailIcon />,
  refresh: <SyncIcon />,
  shield: <ShieldIcon />,
  'user-check': <UserPlusIcon />,
  lock: <LockIcon />,
  scroll: <HistoryIcon />,
  'list-checks': <ClipboardIcon />,
  search: <SearchIcon />,
  'file-text': <FileTextIcon />,
  chevron: <ChevronRightIcon />,
  x: <XIcon />,
} as const;

type IconName = keyof typeof icons;

// ─── Section Data ───

interface AdminNavItem {
  name: string;
  icon: IconName;
  to: string;
  permission: string;
}

interface AdminSection {
  id: string;
  titleKey: string;
  accent: string;
  gradient: string;
  items: AdminNavItem[];
}

const sections: AdminSection[] = [
  {
    id: 'analytics',
    titleKey: 'admin.groups.analytics',
    accent: 'rgb(var(--color-success-400))',
    gradient:
      'linear-gradient(135deg, rgb(var(--color-success-400)), rgb(var(--color-accent-500)))',
    items: [
      {
        name: 'admin.nav.dashboard',
        icon: 'bar-chart',
        to: '/admin/dashboard',
        permission: 'stats:read',
      },
      {
        name: 'admin.nav.payments',
        icon: 'credit-card',
        to: '/admin/payments',
        permission: 'payments:read',
      },
      {
        name: 'admin.nav.trafficUsage',
        icon: 'activity',
        to: '/admin/traffic-usage',
        permission: 'traffic:read',
      },
      {
        name: 'admin.nav.salesStats',
        icon: 'trending',
        to: '/admin/sales-stats',
        permission: 'sales_stats:read',
      },
    ],
  },
  {
    id: 'users',
    titleKey: 'admin.groups.users',
    accent: 'rgb(var(--color-accent-400))',
    gradient: 'linear-gradient(135deg, rgb(var(--color-accent-400)), rgb(var(--color-error-400)))',
    items: [
      { name: 'admin.nav.users', icon: 'users', to: '/admin/users', permission: 'users:read' },
      {
        name: 'admin.nav.bulkActions',
        icon: 'list-checks',
        to: '/admin/bulk-actions',
        permission: 'bulk_actions:read',
      },
      {
        name: 'admin.nav.tickets',
        icon: 'ticket',
        to: '/admin/tickets',
        permission: 'tickets:read',
      },
      {
        name: 'admin.nav.banSystem',
        icon: 'shield-alert',
        to: '/admin/ban-system',
        permission: 'ban_system:read',
      },
    ],
  },
  {
    id: 'tariffs',
    titleKey: 'admin.groups.tariffs',
    accent: 'rgb(var(--color-warning-400))',
    gradient: 'linear-gradient(135deg, rgb(var(--color-warning-400)), rgb(var(--color-error-300)))',
    items: [
      { name: 'admin.nav.tariffs', icon: 'tag', to: '/admin/tariffs', permission: 'tariffs:read' },
      {
        name: 'admin.nav.promocodes',
        icon: 'gift',
        to: '/admin/promocodes',
        permission: 'promocodes:read',
      },
      {
        name: 'admin.nav.promoGroups',
        icon: 'percent',
        to: '/admin/promo-groups',
        permission: 'promo_groups:read',
      },
      {
        name: 'admin.nav.promoOffers',
        icon: 'sparkle',
        to: '/admin/promo-offers',
        permission: 'promo_offers:read',
      },
      {
        name: 'admin.nav.paymentMethods',
        icon: 'wallet',
        to: '/admin/payment-methods',
        permission: 'payment_methods:read',
      },
      {
        name: 'admin.nav.landings',
        icon: 'layout',
        to: '/admin/landings',
        permission: 'landings:read',
      },
    ],
  },
  {
    id: 'marketing',
    titleKey: 'admin.groups.marketing',
    accent: 'rgb(var(--color-accent-300))',
    gradient: 'linear-gradient(135deg, rgb(var(--color-accent-300)), rgb(var(--color-accent-600)))',
    items: [
      { name: 'admin.nav.news', icon: 'newspaper', to: '/admin/news', permission: 'news:read' },
      {
        name: 'admin.nav.campaigns',
        icon: 'megaphone',
        to: '/admin/campaigns',
        permission: 'campaigns:read',
      },
      {
        name: 'admin.nav.broadcasts',
        icon: 'send',
        to: '/admin/broadcasts',
        permission: 'broadcasts:read',
      },
      {
        name: 'admin.nav.pinnedMessages',
        icon: 'pin',
        to: '/admin/pinned-messages',
        permission: 'pinned_messages:read',
      },
      { name: 'admin.nav.wheel', icon: 'circle-dot', to: '/admin/wheel', permission: 'wheel:read' },
      {
        name: 'admin.nav.partners',
        icon: 'handshake',
        to: '/admin/partners',
        permission: 'partners:read',
      },
      {
        name: 'admin.nav.withdrawals',
        icon: 'arrow-up',
        to: '/admin/withdrawals',
        permission: 'withdrawals:read',
      },
      {
        name: 'admin.nav.referralNetwork',
        icon: 'network',
        to: '/admin/referral-network',
        permission: 'stats:read',
      },
    ],
  },
  {
    id: 'system',
    titleKey: 'admin.groups.system',
    accent: 'rgb(var(--color-accent-500))',
    gradient:
      'linear-gradient(135deg, rgb(var(--color-accent-500)), rgb(var(--color-success-500)))',
    items: [
      {
        name: 'admin.nav.channelSubscriptions',
        icon: 'radio',
        to: '/admin/channel-subscriptions',
        permission: 'channels:read',
      },
      {
        name: 'admin.nav.settings',
        icon: 'settings',
        to: '/admin/settings',
        permission: 'settings:read',
      },
      { name: 'admin.nav.apps', icon: 'app', to: '/admin/apps', permission: 'apps:read' },
      {
        name: 'admin.nav.servers',
        icon: 'server',
        to: '/admin/servers',
        permission: 'servers:read',
      },
      {
        name: 'admin.nav.remnawave',
        icon: 'remnawave',
        to: '/admin/remnawave',
        permission: 'remnawave:read',
      },
      {
        name: 'admin.nav.emailTemplates',
        icon: 'mail',
        to: '/admin/email-templates',
        permission: 'email_templates:read',
      },
      {
        name: 'admin.nav.infoPages',
        icon: 'file-text',
        to: '/admin/info-pages',
        permission: 'info_pages:read',
      },
      {
        name: 'admin.nav.legalPages',
        icon: 'file-text',
        to: '/admin/legal-pages',
        permission: 'info_pages:read',
      },
      {
        name: 'admin.nav.updates',
        icon: 'refresh',
        to: '/admin/updates',
        permission: 'updates:read',
      },
    ],
  },
  {
    id: 'security',
    titleKey: 'admin.groups.security',
    accent: 'rgb(var(--color-error-400))',
    gradient: 'linear-gradient(135deg, rgb(var(--color-error-400)), rgb(var(--color-accent-600)))',
    items: [
      { name: 'admin.nav.roles', icon: 'shield', to: '/admin/roles', permission: 'roles:read' },
      {
        name: 'admin.nav.roleAssign',
        icon: 'user-check',
        to: '/admin/roles/assign',
        permission: 'roles:assign',
      },
      { name: 'admin.nav.policies', icon: 'lock', to: '/admin/policies', permission: 'roles:read' },
      {
        name: 'admin.nav.auditLog',
        icon: 'scroll',
        to: '/admin/audit-log',
        permission: 'audit_log:read',
      },
    ],
  },
];

// ─── Helpers ───

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Animated Stat Number ───

function AnimatedStat({ value, suffix }: { value: number; suffix?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <span>
      {Math.round(animated).toLocaleString()}
      {suffix}
    </span>
  );
}

// ─── Stats Bar ───

interface StatsBarProps {
  systemInfo: SystemInfo | null;
  dashboardStats: DashboardStats | null;
  loading: boolean;
}

const StatsBar = memo(function StatsBar({ systemInfo, dashboardStats, loading }: StatsBarProps) {
  const { t } = useTranslation();

  const stats = useMemo(() => {
    const uptime = systemInfo?.uptime_seconds ?? 0;
    const trial = dashboardStats?.subscriptions.trial ?? 0;
    const paid = dashboardStats?.subscriptions.paid ?? 0;
    const purchasedToday = dashboardStats?.subscriptions.purchased_today ?? 0;

    return [
      {
        icon: <StatUptimeIcon />,
        label: t('admin.panel.statsUptime'),
        value: uptime > 0 ? formatUptime(uptime) : '--',
        colorClass: 'text-success-400 bg-success-400/10 border-success-400/20',
      },
      {
        icon: <StatBotIcon className="h-3.5 w-3.5" />,
        label: t('admin.panel.statsBot'),
        value: systemInfo?.bot_version ?? '--',
        colorClass: 'text-accent-400 bg-accent-400/10 border-accent-400/20',
      },
      {
        icon: <StatCabinetIcon className="h-3.5 w-3.5" />,
        label: t('admin.panel.statsCabinet'),
        value: `v${CABINET_VERSION}`,
        colorClass: 'text-accent-300 bg-accent-300/10 border-accent-300/20',
      },
      {
        icon: <StatTrialIcon className="h-3.5 w-3.5" />,
        label: t('admin.panel.statsTrials'),
        numericValue: trial,
        colorClass: 'text-warning-400 bg-warning-400/10 border-warning-400/20',
      },
      {
        icon: <StatPaidIcon className="h-3.5 w-3.5" />,
        label: t('admin.panel.statsPaid'),
        numericValue: paid,
        delta: purchasedToday > 0 ? `+${purchasedToday}` : undefined,
        colorClass: 'text-success-400 bg-success-400/10 border-success-400/20',
      },
    ];
  }, [systemInfo, dashboardStats, t]);

  return (
    <div className="scrollbar-hide flex w-full gap-2 overflow-x-auto pb-1">
      {stats.map((s, i) => (
        <div
          key={i}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/40 px-3 py-2 transition-all duration-200',
            'light:border-champagne-300/50 light:bg-champagne-100/60',
            loading && 'animate-pulse',
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
              s.colorClass,
            )}
          >
            {s.icon}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
            <span className="flex items-center gap-1 font-mono text-xs font-bold text-dark-100 light:text-champagne-900">
              {'numericValue' in s && s.numericValue !== undefined ? (
                <AnimatedStat value={s.numericValue} />
              ) : (
                <span className="truncate">{s.value}</span>
              )}
              {s.delta && (
                <span className="shrink-0 rounded-md border border-success-400/20 bg-success-400/10 px-1.5 py-px text-2xs font-semibold text-success-400">
                  {s.delta}
                </span>
              )}
            </span>
            <span className="truncate text-2xs text-dark-500 light:text-champagne-600">
              {s.label}
              {s.delta && ` · ${t('admin.panel.statsToday')}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Glass Card (Section) ───

interface GlassCardProps {
  section: AdminSection;
  index: number;
  searchTerm: string;
}

const GlassCard = memo(function GlassCard({ section, index, searchTerm }: GlassCardProps) {
  const { t } = useTranslation();
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  // 3D mouse-tracking tilt removed: decorative motion that didn't convey state.
  // Hover styling alone signals interactivity.
  void index;

  const visibleItems = useMemo(
    () =>
      section.items.filter((item) => {
        if (!hasPermission(item.permission)) return false;
        if (!searchTerm) return true;
        return t(item.name).toLowerCase().includes(searchTerm.toLowerCase());
      }),
    [section.items, hasPermission, searchTerm, t],
  );

  const highlightMatch = useCallback(
    (text: string) => {
      if (!searchTerm) return text;
      const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
      if (idx === -1) return text;
      return (
        <>
          {text.slice(0, idx)}
          <mark className="rounded-sm bg-accent-400/30 px-0.5 text-dark-100 light:text-champagne-900">
            {text.slice(idx, idx + searchTerm.length)}
          </mark>
          {text.slice(idx + searchTerm.length)}
        </>
      );
    },
    [searchTerm],
  );

  if (visibleItems.length === 0) return null;

  return (
    <div className="group/card relative overflow-hidden rounded-2xl border border-dark-700/50 bg-dark-800/30 backdrop-blur-xl transition-colors duration-200 hover:border-dark-600/80 light:border-champagne-300/50 light:bg-champagne-100/40 light:hover:border-champagne-400/60">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-dark-700/30 px-3.5 py-2.5 light:border-champagne-300/30">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: section.gradient }}
        >
          <span className="text-xs font-bold text-dark-50" aria-hidden="true">
            {visibleItems.length}
          </span>
        </div>
        <h2 className="truncate text-[13px] font-semibold text-dark-100 light:text-champagne-900">
          {t(section.titleKey)}
        </h2>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-px p-1.5">
        {visibleItems.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'group/item flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 transition-colors duration-150',
              hoveredItem === i
                ? 'border-dark-600/50 bg-dark-700/30 light:border-champagne-400/40 light:bg-champagne-200/50'
                : 'hover:border-dark-600/50 hover:bg-dark-700/30 light:hover:border-champagne-400/40 light:hover:bg-champagne-200/50',
            )}
            onMouseEnter={() => setHoveredItem(i)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {/* Icon */}
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-dark-700/40 bg-dark-800/40 transition-all duration-150 group-hover/item:scale-105 light:border-champagne-400/30 light:bg-champagne-200/50 [&>svg]:h-[13px] [&>svg]:w-[13px]"
              style={{ color: section.accent }}
            >
              {icons[item.icon]}
            </div>

            {/* Label */}
            <span className="flex-1 truncate text-xs font-medium text-dark-200 transition-colors group-hover/item:text-dark-50 light:text-champagne-700 light:group-hover/item:text-champagne-950">
              {highlightMatch(t(item.name))}
            </span>

            {/* Chevron */}
            <div className="h-3 w-3 shrink-0 -translate-x-1 text-dark-600 opacity-0 transition-all duration-150 group-hover/item:translate-x-0 group-hover/item:opacity-60 [&>svg]:h-3 [&>svg]:w-3">
              {icons.chevron}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
});

// ─── Main Component ───

export default function AdminPanel() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();

  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  // System info + dashboard stats — polled every 60s via React Query
  // (replaces the manual setInterval + useState + cancelled-flag pattern).
  const systemInfoQuery = useQuery<SystemInfo>({
    queryKey: ['admin-panel-system-info'] as const,
    queryFn: () => statsApi.getSystemInfo(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
  const dashboardStatsQuery = useQuery<DashboardStats>({
    queryKey: ['admin-panel-dashboard-stats'] as const,
    queryFn: () => statsApi.getDashboardStats(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  const systemInfo = systemInfoQuery.data ?? null;
  const dashboardStats = dashboardStatsQuery.data ?? null;
  // "loading" only counts the very first fetch — once we have any data, render it.
  const loading = systemInfoQuery.isLoading || dashboardStatsQuery.isLoading;

  // Keyboard shortcuts: Cmd+K to focus search, Escape to clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearch('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Track which sections have matching items (keeps original section refs for memo stability)
  const visibleSectionIds = useMemo(() => {
    if (!search.trim()) return null; // null = show all
    const lower = search.toLowerCase();
    return new Set(
      sections
        .filter((s) => s.items.some((item) => t(item.name).toLowerCase().includes(lower)))
        .map((s) => s.id),
    );
  }, [search, t]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-4 sm:px-6"
        style={{
          paddingTop: safeTop > 0 ? `${safeTop}px` : 'env(safe-area-inset-top, 0px)',
          paddingBottom: safeBottom > 0 ? `${safeBottom}px` : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Stats Bar */}
        <div className="hidden shrink-0 sm:flex">
          <StatsBar systemInfo={systemInfo} dashboardStats={dashboardStats} loading={loading} />
        </div>

        {/* Mobile: compact 2-column stats */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:hidden">
          {[
            {
              icon: <StatUptimeIcon />,
              label: t('admin.panel.statsUptime'),
              value: systemInfo?.uptime_seconds ? formatUptime(systemInfo.uptime_seconds) : '--',
              cls: 'text-success-400',
            },
            {
              icon: <StatBotIcon className="h-3.5 w-3.5" />,
              label: t('admin.panel.statsBot'),
              value: systemInfo?.bot_version ?? '--',
              cls: 'text-accent-400',
            },
            {
              icon: <StatTrialIcon className="h-3.5 w-3.5" />,
              label: t('admin.panel.statsTrials'),
              value: dashboardStats?.subscriptions.trial?.toLocaleString() ?? '--',
              cls: 'text-warning-400',
            },
            {
              icon: <StatPaidIcon className="h-3.5 w-3.5" />,
              label: t('admin.panel.statsPaid'),
              value: dashboardStats?.subscriptions.paid?.toLocaleString() ?? '--',
              delta:
                (dashboardStats?.subscriptions.purchased_today ?? 0) > 0
                  ? `+${dashboardStats?.subscriptions.purchased_today}`
                  : undefined,
              cls: 'text-success-400',
            },
          ].map((s, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/40 px-2.5 py-2',
                'light:border-champagne-300/50 light:bg-champagne-100/60',
                loading && 'animate-pulse',
              )}
            >
              <div className={cn('shrink-0', s.cls)}>{s.icon}</div>
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-dark-100 light:text-champagne-900">
                  <span className="truncate">{s.value}</span>
                  {'delta' in s && s.delta && (
                    <span className="shrink-0 rounded border border-success-400/20 bg-success-400/10 px-1 text-2xs font-semibold text-success-400">
                      {s.delta}
                    </span>
                  )}
                </span>
                <span className="truncate text-2xs text-dark-500 light:text-champagne-600">
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Hero + Search */}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-dark-50 light:text-champagne-900 sm:text-xl">
            {t('admin.panel.title')}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-dark-400 light:text-champagne-500">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-success-400"
              style={{ animation: 'adminPulse 2s ease-in-out infinite' }}
            />
            {t('admin.panel.statsOnline')}
          </div>
          {/* Search */}
          <div className="relative ml-auto min-w-[160px] max-w-[360px] flex-1">
            <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-500 [&>svg]:h-3.5 [&>svg]:w-3.5">
              {icons.search}
            </div>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.panel.searchPlaceholder')}
              aria-label={t('admin.panel.searchPlaceholder')}
              className="w-full rounded-xl border border-dark-700/50 bg-dark-800/40 py-2 pl-8 pr-16 font-sans text-xs text-dark-100 outline-none backdrop-blur-lg transition-all placeholder:text-dark-500 focus:border-accent-500/40 focus:shadow-[0_0_0_3px_rgba(var(--color-accent-500),0.08)] light:border-champagne-300/50 light:bg-champagne-100/60 light:text-champagne-900 light:placeholder:text-champagne-500 light:focus:border-accent-500/40"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label={t('admin.panel.searchClear')}
                className="absolute right-12 top-1/2 -translate-y-1/2 text-dark-500 transition-colors hover:text-dark-300 [&>svg]:h-3.5 [&>svg]:w-3.5"
              >
                {icons.x}
              </button>
            )}
            <kbd
              aria-hidden="true"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-dark-700/50 bg-dark-800/60 px-1.5 py-0.5 font-mono text-2xs text-dark-500"
            >
              {IS_MAC ? '\u2318' : 'Ctrl+'}K
            </kbd>
          </div>
        </div>

        {/* Grid */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-auto pb-4">
          {visibleSectionIds === null || visibleSectionIds.size > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {sections
                .filter((s) => !visibleSectionIds || visibleSectionIds.has(s.id))
                .map((section, i) => (
                  <GlassCard key={section.id} section={section} index={i} searchTerm={search} />
                ))}
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16"
              role="status"
              aria-live="polite"
            >
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-700/50 bg-dark-800/40 text-dark-500 [&>svg]:h-6 [&>svg]:w-6">
                {icons.search}
              </div>
              <h3 className="text-sm font-semibold text-dark-200 light:text-champagne-800">
                {t('admin.panel.searchEmpty')}
              </h3>
              <p className="text-xs text-dark-500 light:text-champagne-600">
                {t('admin.panel.searchEmptyHint')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
