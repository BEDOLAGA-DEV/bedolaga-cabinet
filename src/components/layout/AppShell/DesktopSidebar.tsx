import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/store/auth';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';
// Icons
import {
  HomeIcon,
  SubscriptionIcon,
  WalletIcon,
  UsersIcon,
  ChatIcon,
  UserIcon,
  LogoutIcon,
  GamepadIcon,
  ClipboardIcon,
  InfoIcon,
  CogIcon,
  WheelIcon,
} from './icons';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

interface DesktopSidebarProps {
  isAdmin?: boolean;
  wheelEnabled?: boolean;
  referralEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
}

export function DesktopSidebar({
  isAdmin,
  wheelEnabled,
  referralEnabled,
  hasContests,
  hasPolls,
}: DesktopSidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { haptic } = usePlatform();

  // Branding
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding();
      setCachedBranding(data);
      preloadLogo(data);
      return data;
    },
    initialData: getCachedBranding() ?? undefined,
    staleTime: 60000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  const isActive = (path: string) => location.pathname === path;
  const isAdminActive = () => location.pathname.startsWith('/admin');

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/subscription', label: t('nav.subscription'), icon: SubscriptionIcon },
    { path: '/balance', label: t('nav.balance'), icon: WalletIcon },
    ...(referralEnabled ? [{ path: '/referral', label: t('nav.referral'), icon: UsersIcon }] : []),
    { path: '/support', label: t('nav.support'), icon: ChatIcon },
    ...(hasContests ? [{ path: '/contests', label: t('nav.contests'), icon: GamepadIcon }] : []),
    ...(hasPolls ? [{ path: '/polls', label: t('nav.polls'), icon: ClipboardIcon }] : []),
    ...(wheelEnabled ? [{ path: '/wheel', label: t('nav.wheel'), icon: WheelIcon }] : []),
    { path: '/info', label: t('nav.info'), icon: InfoIcon },
  ];

  const handleNavClick = () => {
    haptic.impact('light');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-dark-700/30 bg-dark-950/80 backdrop-blur-linear">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-dark-700/30 px-4">
        <Link to="/" className="flex items-center gap-3" onClick={handleNavClick}>
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-linear-lg border border-dark-700/50 bg-dark-800/80">
            <span
              className={cn(
                'absolute text-lg font-bold text-accent-400 transition-opacity duration-200',
                hasCustomLogo && isLogoPreloaded() ? 'opacity-0' : 'opacity-100',
              )}
            >
              {logoLetter}
            </span>
            {hasCustomLogo && logoUrl && (
              <img
                src={logoUrl}
                alt={appName || 'Logo'}
                className={cn(
                  'absolute h-full w-full object-contain transition-opacity duration-200',
                  isLogoPreloaded() ? 'opacity-100' : 'opacity-0',
                )}
              />
            )}
          </div>
          {appName && (
            <span className="whitespace-nowrap text-base font-semibold text-dark-100">
              {appName}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={cn(
              'group flex items-center gap-3 rounded-linear px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.path)
                ? 'bg-accent-500/10 text-accent-400'
                : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-100',
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.label}</span>
            {isActive(item.path) && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="absolute left-0 h-8 w-0.5 rounded-r-full bg-accent-400"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        ))}

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="my-3 h-px bg-dark-700/30" />
            <Link
              to="/admin"
              onClick={handleNavClick}
              className={cn(
                'group flex items-center gap-3 rounded-linear px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isAdminActive()
                  ? 'bg-warning-500/10 text-warning-400'
                  : 'text-warning-500/70 hover:bg-warning-500/10 hover:text-warning-400',
              )}
            >
              <CogIcon className="h-5 w-5 shrink-0" />
              <span>{t('admin.nav.title')}</span>
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-dark-700/30 p-3">
        <Link
          to="/profile"
          onClick={handleNavClick}
          className={cn(
            'group flex items-center gap-3 rounded-linear px-3 py-2.5 transition-all duration-200',
            isActive('/profile') ? 'bg-dark-800/80' : 'hover:bg-dark-800/50',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dark-700">
            <UserIcon className="h-4 w-4 text-dark-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-dark-100">
              {user?.first_name || user?.username || `#${user?.telegram_id}`}
            </p>
            <p className="truncate text-xs text-dark-500">
              @{user?.username || `ID: ${user?.telegram_id}`}
            </p>
          </div>
        </Link>

        <button
          onClick={() => {
            haptic.impact('light');
            logout();
          }}
          className="mt-2 flex w-full items-center gap-3 rounded-linear px-3 py-2.5 text-sm text-dark-400 transition-all duration-200 hover:bg-error-500/10 hover:text-error-400"
        >
          <LogoutIcon className="h-5 w-5 shrink-0" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
