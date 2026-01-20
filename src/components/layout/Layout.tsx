import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth'
import LanguageSwitcher from '../LanguageSwitcher'
import PromoDiscountBadge from '../PromoDiscountBadge'
import TicketNotificationBell from '../TicketNotificationBell'
import AnimatedBackground from '../AnimatedBackground'
import { contestsApi } from '../../api/contests'
import { pollsApi } from '../../api/polls'
import { brandingApi, getCachedBranding, setCachedBranding, preloadLogo } from '../../api/branding'
import { wheelApi } from '../../api/wheel'
import { themeColorsApi } from '../../api/themeColors'
import { promoApi } from '../../api/promo'
import { useTheme } from '../../hooks/useTheme'
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'

// Fallback branding from environment variables
const FALLBACK_NAME = import.meta.env.VITE_APP_NAME || 'Cabinet'
const FALLBACK_LOGO = import.meta.env.VITE_APP_LOGO || 'V'

interface LayoutProps {
  children: React.ReactNode
}

// Icons as simple SVG components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
)

const SubscriptionIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
)

const WalletIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const ChatIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
  </svg>
)

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
  </svg>
)

// Theme toggle icons
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
)

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const GamepadIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.659-.663 47.703 47.703 0 00-.31-4.82.78.78 0 01.79-.869" />
  </svg>
)

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
  </svg>
)

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
)

const CogIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const WheelIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

export default function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, logout, isAdmin, isAuthenticated } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { toggleTheme, isDark } = useTheme()
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null)
  const { isFullscreen, safeAreaInset, contentSafeAreaInset } = useTelegramWebApp()

  // Pull to refresh (disabled when mobile menu is open)
  const { isPulling, pullDistance, isRefreshing, progress } = usePullToRefresh({
    disabled: mobileMenuOpen,
    threshold: 80,
  })

  // Fetch enabled themes from API - same source of truth as AdminSettings
  const { data: enabledThemes } = useQuery({
    queryKey: ['enabled-themes'],
    queryFn: themeColorsApi.getEnabledThemes,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Only show theme toggle if both themes are enabled
  const canToggle = enabledThemes?.dark && enabledThemes?.light

  // Get user photo from Telegram WebApp
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp
      const photoUrl = tg?.initDataUnsafe?.user?.photo_url
      if (photoUrl) {
        setUserPhotoUrl(photoUrl)
      }
    } catch (e) {
      console.warn('Failed to get Telegram user photo:', e)
    }
  }, [])

  // Lock body scroll when mobile menu is open (cross-platform)
  useEffect(() => {
    if (!mobileMenuOpen) return

    const scrollY = window.scrollY
    const body = document.body
    const html = document.documentElement

    // Save original styles
    const originalStyles = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
    }

    // Lock scroll - works on iOS, Android, and desktop
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.height = '100%'
    html.style.overflow = 'hidden'
    html.style.height = '100%'

    // Prevent touchmove on body (extra protection for mobile)
    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Allow scroll inside menu content
      if (target.closest('.mobile-menu-content')) return
      e.preventDefault()
    }
    document.addEventListener('touchmove', preventScroll, { passive: false })

    return () => {
      // Restore original styles
      body.style.overflow = originalStyles.bodyOverflow
      body.style.position = originalStyles.bodyPosition
      body.style.top = originalStyles.bodyTop
      body.style.width = originalStyles.bodyWidth
      body.style.height = originalStyles.bodyHeight
      html.style.overflow = originalStyles.htmlOverflow
      html.style.height = originalStyles.htmlHeight

      // Remove touchmove listener
      document.removeEventListener('touchmove', preventScroll)

      // Restore scroll position
      window.scrollTo(0, scrollY)
    }
  }, [mobileMenuOpen])

  // State to track if logo image has loaded
  const [logoLoaded, setLogoLoaded] = useState(false)

  // Fetch branding settings with localStorage cache for instant load
  const { data: branding } = useQuery({
    queryKey: ['branding'],
    queryFn: async () => {
      const data = await brandingApi.getBranding()
      setCachedBranding(data) // Update cache
      // Preload logo in background
      preloadLogo(data)
      return data
    },
    initialData: getCachedBranding() ?? undefined, // Use cached data immediately
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
    retry: 1,
  })

  // Computed branding values - use fallback only if no branding and no cache
  const appName = branding ? branding.name : FALLBACK_NAME  // Empty string is valid (logo-only mode)
  const logoLetter = branding?.logo_letter || FALLBACK_LOGO
  const hasCustomLogo = branding?.has_custom_logo || false
  const logoUrl = branding ? brandingApi.getLogoUrl(branding) : null

  // Set document title
  useEffect(() => {
    document.title = appName || 'VPN'  // Fallback title if name is empty
  }, [appName])

  // Fetch contests and polls counts to determine if they should be shown
  const { data: contestsCount } = useQuery({
    queryKey: ['contests-count'],
    queryFn: contestsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    retry: false,
  })

  const { data: pollsCount } = useQuery({
    queryKey: ['polls-count'],
    queryFn: pollsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    retry: false,
  })

  // Fetch wheel config to check if enabled
  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    retry: false,
  })

  // Fetch active discount to determine mobile layout
  const { data: activeDiscount } = useQuery({
    queryKey: ['active-discount'],
    queryFn: promoApi.getActiveDiscount,
    enabled: isAuthenticated,
    staleTime: 30000,
  })

  // Check if promo is active (to hide language switcher on mobile)
  const isPromoActive = activeDiscount?.is_active && activeDiscount?.discount_percent

  const navItems = useMemo(() => {
    const items = [
      { path: '/', label: t('nav.dashboard'), icon: HomeIcon },
      { path: '/subscription', label: t('nav.subscription'), icon: SubscriptionIcon },
      { path: '/balance', label: t('nav.balance'), icon: WalletIcon },
      { path: '/referral', label: t('nav.referral'), icon: UsersIcon },
      { path: '/support', label: t('nav.support'), icon: ChatIcon },
    ]

    // Only show contests if there are available contests
    if (contestsCount && contestsCount.count > 0) {
      items.push({ path: '/contests', label: t('nav.contests'), icon: GamepadIcon })
    }

    // Only show polls if there are available polls
    if (pollsCount && pollsCount.count > 0) {
      items.push({ path: '/polls', label: t('nav.polls'), icon: ClipboardIcon })
    }

    items.push({ path: '/info', label: t('nav.info'), icon: InfoIcon })

    return items
  }, [t, contestsCount, pollsCount])

  // Separate navItems for desktop that includes wheel (if enabled)
  const desktopNavItems = useMemo(() => {
    const items = [...navItems]
    // Add wheel before info if enabled
    if (wheelConfig?.is_enabled) {
      const infoIndex = items.findIndex(item => item.path === '/info')
      if (infoIndex !== -1) {
        items.splice(infoIndex, 0, { path: '/wheel', label: t('nav.wheel'), icon: WheelIcon })
      } else {
        items.push({ path: '/wheel', label: t('nav.wheel'), icon: WheelIcon })
      }
    }
    return items
  }, [navItems, wheelConfig, t])

  const adminNavItems = [
    { path: '/admin', label: t('admin.nav.title'), icon: CogIcon },
  ]

  const isActive = (path: string) => location.pathname === path
  const isAdminActive = () => location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Pull to refresh indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center transition-all duration-200"
          style={{
            top: `calc(${Math.max(pullDistance, isRefreshing ? 40 : 0)}px + env(safe-area-inset-top, 0px) + 0.5rem)`,
            opacity: isRefreshing ? 1 : progress,
          }}
        >
          <div className={`w-10 h-10 rounded-full bg-dark-800 border border-dark-700 shadow-lg flex items-center justify-center ${isRefreshing ? 'animate-pulse' : ''}`}>
            <svg
              className={`w-5 h-5 text-accent-400 transition-transform duration-200 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: isRefreshing ? undefined : `rotate(${progress * 360}deg)` }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-50 glass border-b border-dark-800/50"
        style={{
          // In fullscreen mode, add padding for safe area + Telegram native controls (close/menu buttons in corners)
          paddingTop: isFullscreen ? `${Math.max(safeAreaInset.top, contentSafeAreaInset.top) + 45}px` : undefined,
        }}
      >
        <div className="w-full mx-auto px-4 sm:px-6" onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}>
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-2.5 flex-shrink-0 ${!appName ? 'lg:mr-4' : ''}`}>
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center overflow-hidden shadow-lg shadow-accent-500/20 flex-shrink-0 relative">
                {/* Always show letter as fallback */}
                <span className={`text-white font-bold text-lg sm:text-xl lg:text-2xl absolute transition-opacity duration-200 ${hasCustomLogo && logoLoaded ? 'opacity-0' : 'opacity-100'}`}>
                  {logoLetter}
                </span>
                {/* Logo image with smooth fade-in */}
                {hasCustomLogo && logoUrl && (
                  <img
                    src={logoUrl}
                    alt={appName || 'Logo'}
                    className={`w-full h-full object-contain absolute transition-opacity duration-200 ${logoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLogoLoaded(true)}
                  />
                )}
              </div>
              {appName && (
                <span className="text-base lg:text-lg font-semibold text-dark-100 whitespace-nowrap">
                  {appName}
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {desktopNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'text-accent-400 bg-accent-500/10'
                      : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800/50'
                  }`}
                >
                  <item.icon />
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="w-px h-6 bg-dark-700 mx-2" />
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isAdminActive()
                          ? 'text-warning-400 bg-warning-500/10'
                          : 'text-warning-500/70 hover:text-warning-400 hover:bg-warning-500/10'
                      }`}
                    >
                      <item.icon />
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme toggle button - only show if both themes are enabled */}
              {canToggle && (
                <button
                  onClick={() => {
                    toggleTheme()
                    setMobileMenuOpen(false)
                  }}
                  className="relative p-2.5 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95
                             dark:text-dark-400 dark:hover:text-dark-100 dark:hover:bg-dark-800
                             text-champagne-500 hover:text-champagne-800 hover:bg-champagne-200/50"
                  title={isDark ? t('theme.light') || 'Light mode' : t('theme.dark') || 'Dark mode'}
                  aria-label={isDark ? t('theme.light') || 'Switch to light mode' : t('theme.dark') || 'Switch to dark mode'}
                >
                  <div className="relative w-5 h-5">
                    <div className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`}>
                      <MoonIcon />
                    </div>
                    <div className={`absolute inset-0 transition-all duration-300 ${isDark ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`}>
                      <SunIcon />
                    </div>
                  </div>
                </button>
              )}

              <div onClick={() => setMobileMenuOpen(false)}>
                <PromoDiscountBadge />
              </div>
              <div onClick={() => setMobileMenuOpen(false)}>
                <TicketNotificationBell isAdmin={isAdminActive()} />
              </div>
              {/* Hide language switcher on mobile when promo is active */}
              <div className={isPromoActive ? 'hidden sm:block' : ''} onClick={() => setMobileMenuOpen(false)}>
                <LanguageSwitcher />
              </div>

              {/* Profile - Desktop */}
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-dark-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                    <UserIcon />
                  </div>
                  <span className="text-sm text-dark-300">
                    {user?.first_name || user?.username || `#${user?.telegram_id}`}
                  </span>
                </Link>
                <button
                  onClick={logout}
                  className="btn-icon"
                  title={t('nav.logout')}
                  aria-label={t('nav.logout') || 'Logout'}
                >
                  <LogoutIcon />
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMobileMenuOpen(!mobileMenuOpen)
                }}
                className="lg:hidden btn-icon"
                aria-label={mobileMenuOpen ? t('common.close') || 'Close menu' : t('nav.menu') || 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Mobile menu - fixed overlay below header */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-x-0 bottom-0 z-40 animate-fade-in"
          style={{
            top: isFullscreen
              ? `${64 + Math.max(safeAreaInset.top, contentSafeAreaInset.top) + 45}px`
              : '64px'
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu content */}
          <div className="mobile-menu-content absolute inset-x-0 top-0 bottom-0 bg-dark-900 border-t border-dark-800/50 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom,0px))]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="max-w-6xl mx-auto px-4 py-4">
              {/* User info */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-dark-800/50">
                <div className="flex items-center gap-3">
                  {userPhotoUrl ? (
                    <img
                      src={userPhotoUrl}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center ${userPhotoUrl ? 'hidden' : ''}`}>
                    <UserIcon />
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
                {/* Language switcher in mobile menu when promo is active */}
                {isPromoActive && <LanguageSwitcher />}
              </div>

              {/* Nav items */}
              <nav className="space-y-1">
                {desktopNavItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={isActive(item.path) ? 'nav-item-active' : 'nav-item'}
                  >
                    <item.icon />
                    {item.label}
                  </Link>
                ))}

                {isAdmin && (
                  <>
                    <div className="divider my-3" />
                    <div className="px-4 py-1 text-xs font-medium text-dark-500 uppercase tracking-wider">
                      {t('admin.nav.title')}
                    </div>
                    {adminNavItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`nav-item ${isAdminActive() ? 'text-warning-400 bg-warning-500/10' : 'text-warning-500/70'}`}
                      >
                        <item.icon />
                        {item.label}
                      </Link>
                    ))}
                  </>
                )}

                <div className="divider my-3" />

                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={isActive('/profile') ? 'nav-item-active' : 'nav-item'}
                >
                  <UserIcon />
                  {t('nav.profile')}
                </Link>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="nav-item w-full text-error-400"
                >
                  <LogoutIcon />
                  {t('nav.logout')}
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-8">
        <div className="animate-fade-in">
          {children}
        </div>

      </main>

      {/* Mobile Bottom Navigation - only core items */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex justify-around">
          {navItems.filter(item =>
            ['/', '/subscription', '/balance', '/referral', '/support'].includes(item.path)
          ).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={isActive(item.path) ? 'bottom-nav-item-active' : 'bottom-nav-item'}
            >
              <item.icon />
              <span className="text-2xs mt-1 whitespace-nowrap">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
