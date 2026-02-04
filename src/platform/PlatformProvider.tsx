import { useMemo, type ReactNode } from 'react';
import { PlatformContext } from '@/platform/PlatformContext';
import { createTelegramAdapter } from '@/platform/adapters/TelegramAdapter';
import { createWebAdapter } from '@/platform/adapters/WebAdapter';
import { isInTelegramWebApp } from '@/hooks/useTelegramSDK';
import type { PlatformContext as PlatformContextType } from '@/platform/types';

interface PlatformProviderProps {
  children: ReactNode;
}

function detectPlatform(): 'telegram' | 'web' {
  return isInTelegramWebApp() ? 'telegram' : 'web';
}

function createAdapter(): PlatformContextType {
  const platform = detectPlatform();

  if (platform === 'telegram') {
    return createTelegramAdapter();
  }

  return createWebAdapter();
}

export function PlatformProvider({ children }: PlatformProviderProps) {
  // Create adapter once on mount
  // Using useMemo to ensure stable reference
  const platformContext = useMemo(() => createAdapter(), []);

  return <PlatformContext.Provider value={platformContext}>{children}</PlatformContext.Provider>;
}

// Re-export types for convenience
export type { PlatformContextType as PlatformContext };
