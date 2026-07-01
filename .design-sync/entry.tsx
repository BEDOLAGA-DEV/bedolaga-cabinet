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
