import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * AdminLayout - wrapper for all admin pages.
 * Animations removed to prevent black flash during transitions.
 */
export function AdminLayout({ children, className }: AdminLayoutProps) {
  return <div className={className}>{children}</div>;
}
