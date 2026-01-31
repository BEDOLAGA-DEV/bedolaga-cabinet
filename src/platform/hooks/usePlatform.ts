import { useContext } from 'react';
import { PlatformContext } from '@/platform/PlatformContext';
import type { PlatformContext as PlatformContextType } from '@/platform/types';

/**
 * Hook to access the platform context
 * Provides platform-aware APIs for Telegram Mini Apps and web fallback
 */
export function usePlatform(): PlatformContextType {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }

  return context;
}

/**
 * Check if running in Telegram Mini App
 */
export function useIsTelegram(): boolean {
  const { platform } = usePlatform();
  return platform === 'telegram';
}

/**
 * Check if a specific capability is available
 */
export function useCapability(capability: keyof PlatformContextType['capabilities']): boolean {
  const { capabilities } = usePlatform();
  const value = capabilities[capability];
  // version is the only string capability, all others are boolean
  return typeof value === 'boolean' ? value : !!value;
}
