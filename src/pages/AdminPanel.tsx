import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePermissionStore } from '@/store/permissions';
import { statsApi, type SystemInfo, type DashboardStats } from '@/api/admin';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { cn } from '@/lib/utils';

const CABINET_VERSION = __APP_VERSION__;
const IS_MAC = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);

// ─── Inline SVG Icons (lightweight, no external deps) ───

const SvgIcon = ({
  children,
  className,
  ...props
}: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

// Stats bar icons (16x16 viewBox)
const StatUptimeIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" />
    <path d="M8 4.5V8l2.5 1.5" />
  </svg>
);
const StatBotIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="10" height="8" rx="2" />
    <path d="M6 8h.01M10 8h.01" />
    <path d="M8 2v2M4 14h8" />
  </svg>
);
const StatCabinetIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <path d="M2 6h12" />
    <path d="M5 3v3" />
  </svg>
);
const StatTrialIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M8 2v2M8 12v2M4 8H2M14 8h-2" />
    <circle cx="8" cy="8" r="3" />
  </svg>
);
const StatPaidIcon = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    className="h-3.5 w-3.5"
    aria-hidden="true"
  >
    <path d="M4 6c0-1.7 1.8-3 4-3s4 1.3 4 3-1.8 3-4 3-4 1.3-4 3 1.8 3 4 3 4-1.3 4-3" />
    <path d="M8 1v2M8 13v2" />
  </svg>
);

// Section nav icons (24x24 viewBox)
const icons = {
  'bar-chart': (
    <SvgIcon>
      <path d="M3 3v18h18" />
      <path d="M7 16V8" />
      <path d="M11 16V11" />
      <path d="M15 16V5" />
      <path d="M19 16v-3" />
    </SvgIcon>
  ),
  'credit-card': (
    <SvgIcon>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </SvgIcon>
  ),
  activity: (
    <SvgIcon>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </SvgIcon>
  ),
  trending: (
    <SvgIcon>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </SvgIcon>
  ),
  users: (
    <SvgIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </SvgIcon>
  ),
  ticket: (
    <SvgIcon>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </SvgIcon>
  ),
  'shield-alert': (
    <SvgIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </SvgIcon>
  ),
  tag: (
    <SvgIcon>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </SvgIcon>
  ),
  gift: (
    <SvgIcon>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    </SvgIcon>
  ),
  percent: (
    <SvgIcon>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </SvgIcon>
  ),
  sparkle: (
    <SvgIcon>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
    </SvgIcon>
  ),
  wallet: (
    <SvgIcon>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </SvgIcon>
  ),
  layout: (
    <SvgIcon>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </SvgIcon>
  ),
  newspaper: (
    <SvgIcon>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </SvgIcon>
  ),
  megaphone: (
    <SvgIcon>
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </SvgIcon>
  ),
  send: (
    <SvgIcon>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </SvgIcon>
  ),
  pin: (
    <SvgIcon>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </SvgIcon>
  ),
  'circle-dot': (
    <SvgIcon>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </SvgIcon>
  ),
  handshake: (
    <SvgIcon>
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88" />
      <path d="m2 12 5.56-5.56a3 3 0 0 1 2.22-.88L12 5.5" />
      <path d="M22 12 16.44 6.44a3 3 0 0 0-2.22-.88L12 5.5" />
    </SvgIcon>
  ),
  'arrow-up': (
    <SvgIcon>
      <path d="m18 9-6-6-6 6" />
      <path d="M12 3v14" />
      <path d="M5 21h14" />
    </SvgIcon>
  ),
  network: (
    <SvgIcon>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </SvgIcon>
  ),
  radio: (
    <SvgIcon>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
    </SvgIcon>
  ),
  settings: (
    <SvgIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </SvgIcon>
  ),
  app: (
    <SvgIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 4v4M2 8h20M6 4v4" />
    </SvgIcon>
  ),
  server: (
    <SvgIcon>
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
    </SvgIcon>
  ),
  remnawave: (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[13px] w-[13px]"
      aria-hidden="true"
    >
      <path
        clipRule="evenodd"
        d="M8 1a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-1.5 0V1.75A.75.75 0 0 1 8 1Zm6 2a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0v-8.5A.75.75 0 0 1 14 3ZM5 4a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-1.5 0v-6.5A.75.75 0 0 1 5 4Zm6 1a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 11 5ZM2 6a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 2 6Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  ),
  mail: (
    <SvgIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </SvgIcon>
  ),
  refresh: (
    <SvgIcon>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </SvgIcon>
  ),
  shield: (
    <SvgIcon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </SvgIcon>
  ),
  'user-check': (
    <SvgIcon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </SvgIcon>
  ),
  lock: (
    <SvgIcon>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </SvgIcon>
  ),
  scroll: (
    <SvgIcon>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M15 8h-5M15 12h-5" />
    </SvgIcon>
  ),
  'list-checks': (
    <SvgIcon>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2" />
    </SvgIcon>
  ),
  search: (
    <SvgIcon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </SvgIcon>
  ),
  'file-text': (
    <SvgIcon>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </SvgIcon>
  ),
  chevron: (
    <SvgIcon>
      <path d="m9 18 6-6-6-6" />
    </SvgIcon>
  ),
  x: (
    <SvgIcon>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </SvgIcon>
  ),
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
        icon: <StatBotIcon />,
        label: t('admin.panel.statsBot'),
        value: systemInfo?.bot_version ?? '--',
        colorClass: 'text-accent-400 bg-accent-400/10 border-accent-400/20',
      },
      {
        icon: <StatCabinetIcon />,
        label: t('admin.panel.statsCabinet'),
        value: `v${CABINET_VERSION}`,
        colorClass: 'text-accent-300 bg-accent-300/10 border-accent-300/20',
      },
      {
        icon: <StatTrialIcon />,
        label: t('admin.panel.statsTrials'),
        numericValue: trial,
        colorClass: 'text-warning-400 bg-warning-400/10 border-warning-400/20',
      },
      {
        icon: <StatPaidIcon />,
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
            'flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/40 px-3 py-2 backdrop-blur-lg transition-all duration-200',
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const tiltRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    tiltRef.current = {
      x: ((e.clientY - rect.top) / rect.height - 0.5) * -2.5,
      y: ((e.clientX - rect.left) / rect.width - 0.5) * 2.5,
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTilt({ ...tiltRef.current });
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setTilt({ x: 0, y: 0 });
  }, []);

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
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="group/card relative overflow-hidden rounded-2xl border border-dark-700/50 bg-dark-800/30 backdrop-blur-xl transition-all duration-300 hover:border-dark-600/80 hover:shadow-lg light:border-champagne-300/50 light:bg-champagne-100/40 light:hover:border-champagne-400/60"
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        animation: `adminCardEnter 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 60}ms both`,
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute left-0 right-0 top-0 h-px opacity-50 transition-all duration-300 group-hover/card:h-0.5 group-hover/card:opacity-100"
        style={{ background: section.gradient }}
      />

      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-dark-700/30 px-3.5 py-2.5 light:border-champagne-300/30">
        <div
          className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-md"
          style={{ background: section.gradient }}
        >
          {/* Shine overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-white/25" />
          <span className="relative text-xs font-bold text-white drop-shadow-sm" aria-hidden="true">
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
              'group/item flex items-center gap-2.5 rounded-xl border border-transparent px-2 py-1.5 transition-all duration-150',
              hoveredItem === i
                ? 'border-dark-600/50 bg-dark-700/30 light:border-champagne-400/40 light:bg-champagne-200/50'
                : 'hover:border-dark-600/50 hover:bg-dark-700/30 light:hover:border-champagne-400/40 light:hover:bg-champagne-200/50',
            )}
            onMouseEnter={() => setHoveredItem(i)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              animation: `adminItemEnter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${index * 60 + i * 20}ms both`,
            }}
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

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  // Fetch stats
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        const [sysInfo, stats] = await Promise.all([
          statsApi.getSystemInfo(),
          statsApi.getDashboardStats(),
        ]);
        if (!cancelled) {
          setSystemInfo(sysInfo);
          setDashboardStats(stats);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

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
              icon: <StatBotIcon />,
              label: t('admin.panel.statsBot'),
              value: systemInfo?.bot_version ?? '--',
              cls: 'text-accent-400',
            },
            {
              icon: <StatTrialIcon />,
              label: t('admin.panel.statsTrials'),
              value: dashboardStats?.subscriptions.trial?.toLocaleString() ?? '--',
              cls: 'text-warning-400',
            },
            {
              icon: <StatPaidIcon />,
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
                'flex items-center gap-2 rounded-xl border border-dark-700/50 bg-dark-800/40 px-2.5 py-2 backdrop-blur-lg',
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
          <h1 className="bg-gradient-to-r from-dark-50 via-dark-300 to-accent-400 bg-clip-text text-lg font-extrabold tracking-tight text-transparent light:from-champagne-900 light:via-champagne-600 light:to-accent-600 sm:text-xl">
            {t('admin.panel.title')}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-dark-400 light:text-champagne-500">
            <div
              className="h-1.5 w-1.5 rounded-full bg-success-400 shadow-[0_0_10px_rgba(var(--color-success-400),0.6)]"
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
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-dark-700/50 bg-dark-800/40 text-dark-500 backdrop-blur-lg [&>svg]:h-6 [&>svg]:w-6">
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
