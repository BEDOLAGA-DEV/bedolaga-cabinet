import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/store/auth';
import { useHaptic } from '@/platform';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { useHeaderHeight } from '@/hooks/useHeaderHeight';
import { useTheme } from '@/hooks/useTheme';
import { useBranding } from '@/hooks/useBranding';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { themeColorsApi } from '@/api/themeColors';
import { isLogoPreloaded } from '@/api/branding';
import { cn } from '@/lib/utils';

import WebSocketNotifications from '@/components/WebSocketNotifications';
import CampaignBonusNotifier from '@/components/CampaignBonusNotifier';
import SuccessNotificationModal from '@/components/SuccessNotificationModal';
import { PromptDialogHost } from '@/components/PromptDialogHost';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TicketNotificationBell from '@/components/TicketNotificationBell';
import {
  SubscriptionIcon,
  GiftIcon,
  HomeIcon,
  CreditCardIcon,
  ChatIcon,
  UserIcon,
  UsersIcon,
  ShieldIcon,
  InfoIcon,
  LogoutIcon,
  SunIcon,
  MoonIcon,
} from '@/components/icons';

import { MobileBottomNav } from './MobileBottomNav';
import { AppHeader } from './AppHeader';
import { BackgroundRenderer } from '@/components/backgrounds/BackgroundRenderer';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const logout = useAuthStore((state) => state.logout);
  const { isFullscreen, safeAreaInset, contentSafeAreaInset, platform, isMobile } =
    useTelegramSDK();
  const { mobile: headerHeight } = useHeaderHeight();
  const haptic = useHaptic();
  const { toggleTheme, isDark } = useTheme();

  // Extracted hooks
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const { referralEnabled, wheelEnabled, hasContests, hasPolls, giftEnabled } = useFeatureFlags();
  useScrollRestoration();

  // Theme toggle visibility
  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
    staleTime: 1000 * 60 * 5,
  });
  const canToggleTheme = enabledThemes?.dark && enabledThemes?.light;

  // Only apply fullscreen UI adjustments on mobile Telegram (iOS/Android)
  const isMobileFullscreen = isFullscreen && isMobile;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Reset keyboard state on route change — prevents bottom nav staying hidden after navigation
  useEffect(() => {
    setIsKeyboardOpen(false);
  }, [location.pathname]);

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
    { path: '/subscriptions', label: t('nav.subscription'), icon: SubscriptionIcon },
    { path: '/balance', label: t('nav.balance'), icon: CreditCardIcon },
    { path: '/support', label: t('nav.support'), icon: ChatIcon },
    { path: '/info', label: t('nav.info'), icon: InfoIcon },
    { path: '/profile', label: t('nav.profile'), icon: UserIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = () => {
    haptic.impact('light');
  };

  // headerHeight comes from useHeaderHeight() — accounts for TG safe area in fullscreen

  return (
    <div className="min-h-viewport">
      {/* Animated background renders via portal on document.body at z-index: -1 */}
      <BackgroundRenderer />

      {/* Global components */}
      <WebSocketNotifications />
      <CampaignBonusNotifier />
      <SuccessNotificationModal />
      <PromptDialogHost />

      {/* Desktop Header */}
      <header className="fixed left-0 right-0 top-0 z-50 hidden border-b border-dark-800/50 bg-dark-950/95 lg:block">
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6">
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
          <nav className="flex min-w-0 items-center gap-1">
            {desktopNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                aria-label={item.label}
                className={cn(
                  'group flex items-center rounded-xl px-2.5 py-2 transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-dark-800 text-dark-50'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-focus-within:ml-2 group-focus-within:max-w-40 group-focus-within:opacity-100 group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100">
                  {item.label}
                </span>
              </Link>
            ))}
            {referralEnabled && (
              <Link
                to="/referral"
                onClick={handleNavClick}
                aria-label={t('nav.referral')}
                className={cn(
                  'group flex items-center rounded-xl px-2.5 py-2 transition-all duration-200',
                  isActive('/referral')
                    ? 'bg-dark-800 text-dark-50'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <UsersIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-focus-within:ml-2 group-focus-within:max-w-40 group-focus-within:opacity-100 group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100">
                  {t('nav.referral')}
                </span>
              </Link>
            )}
            {giftEnabled && (
              <Link
                to="/gift"
                onClick={handleNavClick}
                aria-label={t('nav.gift')}
                className={cn(
                  'group flex items-center rounded-xl px-2.5 py-2 transition-all duration-200',
                  isActive('/gift')
                    ? 'bg-dark-800 text-dark-50'
                    : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200',
                )}
              >
                <GiftIcon className="h-[18px] w-[18px] shrink-0" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-focus-within:ml-2 group-focus-within:max-w-40 group-focus-within:opacity-100 group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100">
                  {t('nav.gift')}
                </span>
              </Link>
            )}
            {isAdmin && (
              <>
                <div className="mx-1 h-5 w-px shrink-0 bg-dark-700" />
                <Link
                  to="/admin"
                  onClick={handleNavClick}
                  aria-label={t('admin.nav.title')}
                  className={cn(
                    'group flex items-center rounded-xl px-2.5 py-2 transition-all duration-200',
                    location.pathname.startsWith('/admin')
                      ? 'bg-warning-500/10 text-warning-400'
                      : 'text-warning-500/70 hover:bg-warning-500/10 hover:text-warning-400',
                  )}
                >
                  <ShieldIcon className="h-[18px] w-[18px] shrink-0" />
                  <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-medium opacity-0 transition-all duration-200 group-focus-within:ml-2 group-focus-within:max-w-40 group-focus-within:opacity-100 group-hover:ml-2 group-hover:max-w-40 group-hover:opacity-100">
                    {t('admin.nav.title')}
                  </span>
                </Link>
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => {
                haptic.impact('light');
                toggleTheme();
              }}
              className={cn(
                'rounded-xl border border-dark-700/50 bg-dark-800/50 p-2 text-dark-400 transition-colors duration-200 hover:bg-dark-700 hover:text-accent-400',
                !canToggleTheme && 'pointer-events-none invisible',
              )}
              aria-label={
                isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode'
              }
              title={isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode'}
            >
              {isDark ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
            </button>
            <TicketNotificationBell isAdmin={location.pathname.startsWith('/admin')} />
            <LanguageSwitcher />
            <button
              onClick={() => {
                haptic.impact('light');
                logout();
              }}
              className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-2 text-dark-400 transition-colors duration-200 hover:bg-dark-700 hover:text-accent-400"
              title={t('nav.logout')}
            >
              <LogoutIcon className="h-5 w-5" />
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
        telegramPlatform={platform}
        wheelEnabled={wheelEnabled}
        referralEnabled={referralEnabled}
        hasContests={hasContests}
        hasPolls={hasPolls}
        giftEnabled={giftEnabled}
      />

      {/* Desktop spacer */}
      <div className="hidden h-14 lg:block" />

      {/* Mobile spacer */}
      <div className="lg:hidden" style={{ height: headerHeight }} />

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 lg:px-6 lg:pb-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        isKeyboardOpen={isKeyboardOpen}
        referralEnabled={referralEnabled}
        wheelEnabled={wheelEnabled}
      />
    </div>
  );
}
