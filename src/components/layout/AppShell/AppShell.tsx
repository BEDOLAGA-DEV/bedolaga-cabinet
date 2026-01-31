import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/store/auth';
import { useBackButton, useHaptic } from '@/platform';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { referralApi } from '@/api/referral';
import { wheelApi } from '@/api/wheel';
import { contestsApi } from '@/api/contests';
import { pollsApi } from '@/api/polls';
import {
  brandingApi,
  getCachedBranding,
  setCachedBranding,
  preloadLogo,
  isLogoPreloaded,
} from '@/api/branding';
import { setCachedFullscreenEnabled, isTelegramMobile } from '@/hooks/useTelegramWebApp';
import { cn } from '@/lib/utils';

import WebSocketNotifications from '@/components/WebSocketNotifications';
import SuccessNotificationModal from '@/components/SuccessNotificationModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TicketNotificationBell from '@/components/TicketNotificationBell';

import { MobileBottomNav } from './MobileBottomNav';
import { AppHeader } from './AppHeader';
import { Aurora } from './Aurora';

import { slideUp, slideUpTransition } from '@/components/motion/transitions';

// Desktop nav icons
const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);

const CreditCardIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
    />
  </svg>
);

const ChatIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
    />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const ShieldIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const LogoutIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    />
  </svg>
);

const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet';
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, logout } = useAuthStore();
  const { isFullscreen, safeAreaInset, contentSafeAreaInset, requestFullscreen, isTelegramWebApp } =
    useTelegramWebApp();
  const haptic = useHaptic();

  // Only apply fullscreen UI adjustments on mobile Telegram (iOS/Android)
  const isMobileFullscreen = isFullscreen && isTelegramMobile();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Scroll position restoration for admin pages
  const scrollPositions = useRef<Record<string, number>>({});

  // Disable browser's automatic scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  // Continuously save scroll position for current path
  useEffect(() => {
    const currentPath = location.pathname;

    // Only track scroll for admin pages
    if (!currentPath.startsWith('/admin')) return;

    const handleScroll = () => {
      scrollPositions.current[currentPath] = window.scrollY;
    };

    // Save on scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Restore scroll position immediately (synchronous)
    const savedPosition = scrollPositions.current[currentPath];
    if (savedPosition !== undefined && savedPosition > 0) {
      // Immediate restore
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);

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
    enabled: isAuthenticated,
  });

  const appName = branding ? branding.name : FALLBACK_NAME;
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO;
  const hasCustomLogo = branding?.has_custom_logo || false;
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null;

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN';
  }, [appName]);

  // Update favicon
  useEffect(() => {
    if (!logoUrl) return;

    const link =
      document.querySelector<HTMLLinkElement>("link[rel*='icon']") ||
      document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  }, [logoUrl]);

  // Fullscreen setting from server
  const { data: fullscreenSetting } = useQuery({
    queryKey: ['fullscreen-enabled'],
    queryFn: brandingApi.getFullscreenEnabled,
    staleTime: 60000,
  });

  // Apply fullscreen setting when loaded from server
  // Only apply on mobile Telegram (iOS/Android) - desktop doesn't need fullscreen
  useEffect(() => {
    if (!fullscreenSetting || !isTelegramWebApp) return;

    // Update cache for future app starts
    setCachedFullscreenEnabled(fullscreenSetting.enabled);

    // Request fullscreen if enabled, not already fullscreen, and on mobile Telegram
    if (fullscreenSetting.enabled && !isFullscreen && isTelegramMobile()) {
      requestFullscreen();
    }
  }, [fullscreenSetting, isTelegramWebApp, isFullscreen, requestFullscreen]);

  // Feature flags
  const { data: referralTerms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: contestsCount } = useQuery({
    queryKey: ['contests-count'],
    queryFn: contestsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: pollsCount } = useQuery({
    queryKey: ['polls-count'],
    queryFn: pollsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  // BackButton for Telegram Mini App
  // Don't show back button on main tab pages (bottom nav) - users navigate via tabs
  const mainTabPaths = ['/', '/subscription', '/balance', '/referral', '/support'];
  const isMainTabPage = mainTabPaths.includes(location.pathname);
  const handleBack = useCallback(() => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
      return;
    }
    navigate(-1);
  }, [mobileMenuOpen, navigate]);

  useBackButton(isMainTabPage ? null : handleBack);

  // Keyboard detection for hiding bottom nav
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (
        !relatedTarget ||
        (relatedTarget.tagName !== 'INPUT' &&
          relatedTarget.tagName !== 'TEXTAREA' &&
          !relatedTarget.isContentEditable)
      ) {
        setIsKeyboardOpen(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Desktop navigation items
  const desktopNavItems = [
    { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
    { path: '/balance', label: t('nav.balance'), icon: CreditCardIcon },
    { path: '/support', label: t('nav.support'), icon: ChatIcon },
    { path: '/profile', label: t('nav.profile'), icon: UserIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    haptic.impact('light');
  };

  // Calculate header height based on fullscreen mode (only on mobile Telegram)
  const headerHeight = isMobileFullscreen
    ? 64 + Math.max(safeAreaInset.top, contentSafeAreaInset.top) + 45
    : 64;

  return (
    <div className="min-h-screen">
      {/* Animated background */}
      <Aurora />

      {/* Global components */}
      <WebSocketNotifications />
      <SuccessNotificationModal />

      {/* Desktop Header */}
      <header className="fixed left-0 right-0 top-0 z-50 hidden border-b border-dark-800/50 bg-dark-950/80 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5" onClick={handleNavClick}>
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-dark-800">
              <span
                className={cn(
                  'absolute text-sm font-bold text-accent-400 transition-opacity duration-200',
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
            <span className="text-base font-semibold text-dark-100">{appName}</span>
          </Link>

          {/* Center Navigation */}
          <nav className="flex items-center gap-1">
            {desktopNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.path)
                    ? 'bg-dark-800 text-dark-50'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            {referralTerms?.is_enabled && (
              <Link
                to="/referral"
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive('/referral')
                    ? 'bg-dark-800 text-dark-50'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <UsersIcon className="h-4 w-4" />
                <span>{t('nav.referral')}</span>
              </Link>
            )}
            {isAdmin && (
              <>
                {/* Separator before admin */}
                <div className="mx-2 h-5 w-px bg-dark-700" />
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    location.pathname.startsWith('/admin')
                      ? 'bg-warning-500/10 text-warning-400'
                      : 'text-warning-500/70 hover:bg-warning-500/10 hover:text-warning-400',
                  )}
                >
                  <ShieldIcon className="h-4 w-4" />
                  <span>{t('admin.nav.title')}</span>
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <TicketNotificationBell isAdmin={location.pathname.startsWith('/admin')} />
            <LanguageSwitcher />
            <button
              onClick={() => {
                haptic.impact('light');
                logout();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-dark-400 transition-colors hover:bg-dark-800/50 hover:text-dark-200"
              title={t('nav.logout')}
            >
              <LogoutIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <AppHeader
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onCommandPaletteOpen={() => {}}
        headerHeight={headerHeight}
        isFullscreen={isMobileFullscreen}
        safeAreaInset={safeAreaInset}
        contentSafeAreaInset={contentSafeAreaInset}
        wheelEnabled={wheelConfig?.is_enabled}
        referralEnabled={referralTerms?.is_enabled}
        hasContests={(contestsCount?.count ?? 0) > 0}
        hasPolls={(pollsCount?.count ?? 0) > 0}
      />

      {/* Desktop spacer */}
      <div className="hidden h-14 lg:block" />

      {/* Mobile spacer */}
      <div className="lg:hidden" style={{ height: headerHeight }} />

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:px-6 lg:pb-8">
        {/* Disable animations for admin pages to prevent scroll jumps in Telegram Mini App */}
        {location.pathname.startsWith('/admin') ? (
          children
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={location.pathname}
              variants={slideUp}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={slideUpTransition}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        isKeyboardOpen={isKeyboardOpen}
        referralEnabled={referralTerms?.is_enabled}
      />
    </div>
  );
}
