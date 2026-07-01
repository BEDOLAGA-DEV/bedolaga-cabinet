// design-sync scoped entry — re-exports only the design-system primitives,
// data-display and selected ui components (excludes app screens and the heavy
// ui/backgrounds set). ui/Sheet is intentionally omitted (name collides with
// primitives/Sheet, which is the canonical one).

// Side-effect import: initializes the global i18next instance so components
// that call useTranslation (e.g. Spinner) don't throw during preview render.
import '@/i18n';
// Exported so previews can wrap components in the required platform context
// (usePlatform throws without it). Wired via cfg.provider.
export { PlatformProvider } from '@/platform';

export * from '@/components/primitives';
export * from '@/components/data-display';
export { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
export { AnimatedCrossmark } from '@/components/ui/AnimatedCrossmark';
export { BentoCard } from '@/components/ui/BentoCard';
export { default as BentoSkeleton } from '@/components/ui/BentoSkeleton';
export { Skeleton } from '@/components/ui/Skeleton';
export { Spinner } from '@/components/ui/Spinner';
export { HoverBorderGradient } from '@/components/ui/hover-border-gradient';

// ── Providers / stores / query client — used by the page-preview harness
// (.design-sync/_page-harness.tsx) to render data-driven screens with mocked
// react-query cache + seeded stores. Not design-system cards themselves.
export { QueryClient, QueryClientProvider } from '@tanstack/react-query';
export { MemoryRouter, Routes, Route } from 'react-router';
export { ThemeColorsProvider } from '@/providers/ThemeColorsProvider';
export { ToastProvider } from '@/components/Toast';
export { useAuthStore } from '@/store/auth';
export { useBlockingStore } from '@/store/blocking';
export { usePermissionStore } from '@/store/permissions';

// ── Pages (key user-facing screens; default exports) ──
export { default as Dashboard } from '@/pages/Dashboard';
export { default as Subscriptions } from '@/pages/Subscriptions';
export { default as Subscription } from '@/pages/Subscription';
export { default as SubscriptionPurchase } from '@/pages/SubscriptionPurchase';
export { default as Balance } from '@/pages/Balance';
export { default as TopUpMethodSelect } from '@/pages/TopUpMethodSelect';
export { default as Connection } from '@/pages/Connection';
export { default as Profile } from '@/pages/Profile';
export { default as Support } from '@/pages/Support';
export { default as Referral } from '@/pages/Referral';
export { default as Wheel } from '@/pages/Wheel';
export { default as Login } from '@/pages/Login';
export { default as PurchaseSuccess } from '@/pages/PurchaseSuccess';
export { default as Info } from '@/pages/Info';
