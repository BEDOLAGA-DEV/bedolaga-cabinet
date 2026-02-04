import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { initDataUser } from '@telegram-apps/sdk-react';

import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/hooks/useTheme';
import { usePlatform } from '@/platform';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';
import { themeColorsApi } from '@/api/themeColors';
import { cn } from '@/lib/utils';

import LanguageSwitcher from '@/components/LanguageSwitcher';
import TicketNotificationBell from '@/components/TicketNotificationBell';

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
  MenuIcon,
  CloseIcon,
  SunIcon,
  MoonIcon,
  SearchIcon,
} from './icons';

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

import type { TelegramPlatform } from '@/hooks/useTelegramSDK';

interface AppHeaderProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onCommandPaletteOpen: () => void;
  headerHeight: number;
  isFullscreen: boolean;
  safeAreaInset: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset: { top: number; bottom: number; left: number; right: number };
  telegramPlatform?: TelegramPlatform;
  wheelEnabled?: boolean;
  referralEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
}

export function AppHeader({
  mobileMenuOpen,
  setMobileMenuOpen,
  onCommandPaletteOpen,
  headerHeight,
  isFullscreen,
  safeAreaInset,
  contentSafeAreaInset,
  telegramPlatform,
  wheelEnabled,
  referralEnabled,
  hasContests,
  hasPolls,
}: AppHeaderProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuthStore();
  const { toggleTheme, isDark } = useTheme();
  const { haptic, platform } = usePlatform();
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(() => isLogoPreloaded());

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

  // Theme toggle visibility
  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
    staleTime: 1000 * 60 * 5,
  });
  const canToggle = enabledThemes?.dark && enabledThemes?.light;

  // Get user photo from Telegram
  useEffect(() => {
    try {
      const user = initDataUser();
      if (user?.photo_url) {
        setUserPhotoUrl(user.photo_url);
      }
    } catch {
      // Not in Telegram or init data not available
    }
  }, []);

  // Lock scroll when menu is open (works in iframe/Telegram Mini App)
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const preventDefault = (e: TouchEvent) => {
      // Allow scrolling inside menu content
      const target = e.target as HTMLElement;
      if (target.closest('.mobile-menu-content')) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };
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

  return (
    <>
      {/* Header - only on mobile */}
      <header
        className="glass fixed left-0 right-0 top-0 z-50 shadow-lg shadow-black/10 lg:hidden"
        style={{
          paddingTop: isFullscreen
            ? `${Math.max(safeAreaInset.top, contentSafeAreaInset.top) + (telegramPlatform === 'android' ? 48 : 45)}px`
            : undefined,
        }}
      >
        <div
          className="mx-auto w-full px-4"
          onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
        >
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={cn('flex flex-shrink-0 items-center gap-2.5', !appName && 'mr-4')}
            >
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-linear-lg border border-dark-700/50 bg-dark-800/80 shadow-md">
                <span
                  className={cn(
                    'absolute text-lg font-bold text-accent-400 transition-opacity duration-200',
                    hasCustomLogo && logoLoaded ? 'opacity-0' : 'opacity-100',
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
                      logoLoaded ? 'opacity-100' : 'opacity-0',
                    )}
                    onLoad={() => setLogoLoaded(true)}
                  />
                )}
              </div>
              {appName && (
                <span className="whitespace-nowrap text-base font-semibold text-dark-100">
                  {appName}
                </span>
              )}
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-1.5">
              {/* Command palette trigger (web only) */}
              {platform !== 'telegram' && (
                <button
                  onClick={() => {
                    haptic.impact('light');
                    onCommandPaletteOpen();
                  }}
                  className="btn-icon hidden sm:flex"
                  title="Search (⌘K)"
                >
                  <SearchIcon className="h-5 w-5" />
                </button>
              )}

              {/* Theme toggle */}
              {canToggle && (
                <button
                  onClick={() => {
                    haptic.impact('light');
                    toggleTheme();
                    setMobileMenuOpen(false);
                  }}
                  className="relative rounded-linear-lg border border-dark-700/50 bg-dark-800/50 p-2 text-dark-400 transition-all duration-200 hover:bg-dark-700 hover:text-accent-400"
                  title={isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode'}
                >
                  <div className="relative h-5 w-5">
                    <div
                      className={cn(
                        'absolute inset-0 transition-all duration-300',
                        isDark ? 'rotate-0 opacity-100' : 'rotate-90 opacity-0',
                      )}
                    >
                      <MoonIcon className="h-5 w-5" />
                    </div>
                    <div
                      className={cn(
                        'absolute inset-0 transition-all duration-300',
                        isDark ? '-rotate-90 opacity-0' : 'rotate-0 opacity-100',
                      )}
                    >
                      <SunIcon className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              )}

              <div onClick={() => setMobileMenuOpen(false)}>
                <TicketNotificationBell isAdmin={isAdminActive()} />
              </div>
              <div onClick={() => setMobileMenuOpen(false)}>
                <LanguageSwitcher />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  haptic.impact('light');
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className={`rounded-xl p-2.5 transition-all duration-200 ${
                  mobileMenuOpen
                    ? 'bg-dark-700 text-dark-100'
                    : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100'
                }`}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <CloseIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 animate-fade-in lg:hidden"
          style={{ top: headerHeight }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />

          {/* Menu content */}
          <div
            className="mobile-menu-content absolute inset-x-0 bottom-0 top-0 overflow-y-auto overscroll-contain border-t border-dark-800/50 bg-dark-900/95 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="mx-auto max-w-6xl px-4 py-4">
              {/* User info */}
              <div className="mb-4 flex items-center justify-between border-b border-dark-800/50 pb-4">
                <div className="flex items-center gap-3">
                  {userPhotoUrl ? (
                    <img
                      src={userPhotoUrl}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full bg-dark-700',
                      userPhotoUrl ? 'hidden' : '',
                    )}
                  >
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-dark-100">
                      {user?.first_name || user?.username}
                    </div>
                    <div className="text-xs text-dark-500">
                      @{user?.username || `ID: ${user?.telegram_id}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={isActive(item.path) ? 'nav-item-active' : 'nav-item'}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                ))}

                {isAdmin && (
                  <>
                    <div className="divider my-3" />
                    <div className="px-4 py-1 text-xs font-medium uppercase tracking-wider text-dark-500">
                      {t('admin.nav.title')}
                    </div>
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'nav-item',
                        isAdminActive()
                          ? 'bg-warning-500/10 text-warning-400'
                          : 'text-warning-500/70',
                      )}
                    >
                      <CogIcon className="h-5 w-5" />
                      {t('admin.nav.title')}
                    </Link>
                  </>
                )}

                <div className="divider my-3" />

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={isActive('/profile') ? 'nav-item-active' : 'nav-item'}
                >
                  <UserIcon className="h-5 w-5" />
                  {t('nav.profile')}
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="nav-item w-full text-error-400"
                >
                  <LogoutIcon className="h-5 w-5" />
                  {t('nav.logout')}
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
