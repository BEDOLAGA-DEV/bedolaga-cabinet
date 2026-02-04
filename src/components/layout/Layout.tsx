import { AppShell } from './AppShell';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Main layout component that wraps all pages.
 * Uses the new AppShell system with:
 * - Desktop sidebar navigation
 * - Mobile bottom navigation
 * - Command palette (⌘K)
 * - Platform-aware features (Telegram integration)
 */
export default function Layout({ children }: LayoutProps) {
  return <AppShell>{children}</AppShell>;
}
