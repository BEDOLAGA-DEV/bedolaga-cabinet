/**
 * @deprecated This hook is deprecated. Use useTelegramSDK instead.
 * This file is kept for backward compatibility and re-exports from useTelegramSDK.
 */

import { useTelegramSDK } from './useTelegramSDK';

// Re-export everything from useTelegramSDK for backward compatibility
export {
  getCachedFullscreenEnabled,
  setCachedFullscreenEnabled,
  isInTelegramWebApp,
  isTelegramMobile,
} from './useTelegramSDK';

/**
 * @deprecated Use useTelegramSDK instead
 * Hook for Telegram WebApp API integration - backward compatible wrapper
 */
export function useTelegramWebApp() {
  const sdk = useTelegramSDK();

  return {
    isTelegramWebApp: sdk.isTelegramWebApp,
    isFullscreen: sdk.isFullscreen,
    isFullscreenSupported: sdk.isFullscreenSupported,
    safeAreaInset: sdk.safeAreaInset,
    contentSafeAreaInset: sdk.contentSafeAreaInset,
    requestFullscreen: sdk.requestFullscreen,
    exitFullscreen: sdk.exitFullscreen,
    toggleFullscreen: sdk.toggleFullscreen,
    disableVerticalSwipes: sdk.disableVerticalSwipes,
    enableVerticalSwipes: sdk.enableVerticalSwipes,
    webApp: null,
  };
}
